import { useEffect, useCallback, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useSessionStore } from '../store/sessionStore';
import { ClientMessage, ServerMessage, TerminalSnapshot } from '../types';

// Warp Phenomenon 主题
const WARP_THEME = {
  background: '#1C1D22',
  foreground: '#E4E6EB',
  cursor: '#53D8FB',
  cursorAccent: '#1C1D22',
  selectionBackground: 'rgba(83, 216, 251, 0.2)',
  black: '#16171B',
  red: '#FF6B6B',
  green: '#A8E6CF',
  yellow: '#FFD3B6',
  blue: '#53D8FB',
  magenta: '#9D4EDD',
  cyan: '#4EA8DE',
  white: '#E4E6EB',
  brightBlack: '#2C2E35',
  brightRed: '#FF8787',
  brightGreen: '#C7F9CC',
  brightYellow: '#FFEECC',
  brightBlue: '#64DFDF',
  brightMagenta: '#B5179E',
  brightCyan: '#72EFDD',
  brightWhite: '#FFFFFF',
};

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement;
  wrapper: HTMLDivElement;
  resizeObserver: ResizeObserver;
}

// 全局 Terminal 实例池
const terminalPool = new Map<string, TerminalInstance>();

interface UseTerminalOptions {
  sendMessage: (message: ClientMessage) => void;
}

export function useTerminal({ sendMessage }: UseTerminalOptions) {
  const { activeWorkspaceId, activeResourceId } = useSessionStore();
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // 创建或获取 Terminal 实例
  const ensureTerminal = useCallback(
    (container: HTMLDivElement, resourceId: string, workspaceId: string): TerminalInstance => {
      // 如果已存在，检查是否需要移动
      const existing = terminalPool.get(resourceId);
      if (existing) {
        if (existing.container !== container) {
          container.appendChild(existing.wrapper);
          existing.container = container;
          requestAnimationFrame(() => {
            try {
              existing.fitAddon.fit();
              existing.terminal.focus();
            } catch {}
          });
        }
        return existing;
      }

      // 创建新 Terminal - 只读模式
      const terminal = new Terminal({
        theme: WARP_THEME,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
        fontSize: 14,
        lineHeight: 1.3,
        letterSpacing: 0,
        cursorBlink: false,  // 关闭光标闪烁
        cursorStyle: 'bar',
        cursorWidth: 2,
        scrollback: 10000,
        allowTransparency: true,
        smoothScrollDuration: 100,
        scrollSensitivity: 1,
        minimumContrastRatio: 4.5,
        drawBoldTextInBrightColors: true,
        convertEol: true,
        disableStdin: true,  // 禁用标准输入，降级为只读渲染器
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // 创建包装容器 - 关键：relative + overflow-hidden 形成沙盒
      const wrapper = document.createElement('div');
      wrapper.className = 'terminal-wrapper';
      wrapper.style.cssText = `
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      `;
      container.appendChild(wrapper);

      terminal.open(wrapper);

      // 延迟 fit
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {}
      });

      // 只读模式，不需要 onData 监听

      // 监听 resize
      const handleResize = () => {
        try {
          fitAddon.fit();
          const { cols, rows } = terminal;
          if (cols > 0 && rows > 0) {
            sendMessageRef.current({
              type: 'resource:resize',
              workspaceId,
              resourceId,
              cols,
              rows,
            });
          }
        } catch {}
      };

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(handleResize);
      });
      resizeObserver.observe(container);

      const instance: TerminalInstance = {
        terminal,
        fitAddon,
        container,
        wrapper,
        resizeObserver,
      };

      terminalPool.set(resourceId, instance);

      // 请求订阅 —— 带上当前终端尺寸，让后端先 resize PTY 再重放快照
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {}
        const { cols, rows } = terminal;
        sendMessageRef.current({
          type: 'resource:subscribe',
          workspaceId,
          resourceId,
          cols: cols > 0 ? cols : undefined,
          rows: rows > 0 ? rows : undefined,
        });
      });

      return instance;
    },
    []
  );

  // 切换显示的 Terminal
  const switchTerminal = useCallback(
    (container: HTMLDivElement) => {
      if (!activeResourceId || !activeWorkspaceId) return;

      // 隐藏所有 Terminal
      terminalPool.forEach((instance, id) => {
        if (id !== activeResourceId) {
          instance.wrapper.style.display = 'none';
        }
      });

      // 显示或创建当前 Terminal
      const instance = ensureTerminal(container, activeResourceId, activeWorkspaceId);
      instance.wrapper.style.display = 'block';

      requestAnimationFrame(() => {
        try {
          instance.fitAddon.fit();
          instance.terminal.focus();
        } catch {}
      });
    },
    [activeResourceId, activeWorkspaceId, ensureTerminal]
  );

  // 写入数据到指定 Terminal
  const writeToTerminal = useCallback((resourceId: string, data: string) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      instance.terminal.write(data);
    }
  }, []);

  // 恢复快照 —— 直接拼接原始 chunk，不插入额外的 \r\n（原始数据已包含换行符）
  const restoreSnapshot = useCallback((resourceId: string, snapshot: TerminalSnapshot) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      instance.terminal.clear();
      instance.terminal.write(snapshot.ansiBuffer.join(''));
    }
  }, []);

  // 清理 Terminal 实例
  const disposeTerminal = useCallback((resourceId: string) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      instance.resizeObserver.disconnect();
      instance.terminal.dispose();
      instance.wrapper.remove();
      terminalPool.delete(resourceId);
    }
  }, []);

  // 强制触发当前活跃 Terminal 的 fit
  const fitTerminal = useCallback(() => {
    if (!activeResourceId) return;
    const instance = terminalPool.get(activeResourceId);
    if (instance) {
      requestAnimationFrame(() => {
        try {
          instance.fitAddon.fit();
        } catch {}
      });
    }
  }, [activeResourceId]);

  // 处理 WebSocket 资源事件
  useEffect(() => {
    const handleResourceEvent = (event: Event) => {
      const message = (event as CustomEvent<ServerMessage>).detail;

      switch (message.type) {
        case 'resource:output':
          writeToTerminal(message.resourceId, message.data);
          break;

        case 'resource:snapshot':
          restoreSnapshot(message.resourceId, message.snapshot);
          break;

        case 'resource:status':
          if (message.status === 'EXITED' || message.status === 'STOPPED') {
            writeToTerminal(
              message.resourceId,
              '\r\n\x1b[33m[Process exited]\x1b[0m\r\n'
            );
          }
          break;

        case 'resource:deleted':
          disposeTerminal(message.resourceId);
          break;
      }
    };

    window.addEventListener('ws:resource', handleResourceEvent);
    return () => window.removeEventListener('ws:resource', handleResourceEvent);
  }, [writeToTerminal, restoreSnapshot, disposeTerminal]);

  return {
    switchTerminal,
    writeToTerminal,
    disposeTerminal,
    fitTerminal,
  };
}
