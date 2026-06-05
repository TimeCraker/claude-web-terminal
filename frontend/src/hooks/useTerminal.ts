import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useSessionStore } from '../store/sessionStore';
import { useThemeStore } from '../themes/useThemeStore';
import type { XtermTheme } from '../themes/definitions';
import type { ClientMessage } from '../types';

interface UseTerminalOptions {
  sendMessage: (message: ClientMessage) => void;
}

// 终端实例缓存（不随 React re-render 销毁）
const terminalPool = new Map<string, XTerminal>();
const fitAddonPool = new Map<string, FitAddon>();
let activeTerminalId: string | null = null;

// 每行独立写入，严格保留原有输出，新输出追加到末尾
const outputBuffer = new Map<string, string[]>();
const pendingWrites = new Map<string, number>();

function getThemeColors(): XtermTheme {
  return useThemeStore.getState().getTheme().xterm;
}

function getFontFamily(): string {
  return useThemeStore.getState().getFont().family;
}

function getFontSize(): number {
  return 14;
}

export function useTerminal({ sendMessage }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitObserverRef = useRef<ResizeObserver | null>(null);
  const activeResourceIdRef = useRef<string | null>(null);

  const activeResourceId = useSessionStore((s) => s.activeResourceId);
  const themeId = useThemeStore((s) => s.themeId);
  const fontId = useThemeStore((s) => s.fontId);

  // 同步 ref
  useEffect(() => {
    activeResourceIdRef.current = activeResourceId;
  }, [activeResourceId]);

  // ==================== 获取或创建终端实例 ====================
  const getOrCreateTerminal = useCallback(
    (resourceId: string): XTerminal => {
      let term = terminalPool.get(resourceId);
      if (term) return term;

      const theme = getThemeColors();
      term = new XTerminal({
        fontFamily: getFontFamily(),
        fontSize: getFontSize(),
        lineHeight: 1.5,
        cursorBlink: true,
        cursorStyle: 'bar',
        cursorInactiveStyle: 'outline',
        scrollback: 8000,
        allowProposedApi: true,
        theme,
      });

      // WebGL 渲染
      try {
        term.loadAddon(new WebglAddon());
      } catch {
        // WebGL 不可用时回退到 canvas
      }
      term.loadAddon(new WebLinksAddon());

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonPool.set(resourceId, fitAddon);

      // 初始化输出缓冲
      outputBuffer.set(resourceId, []);

      terminalPool.set(resourceId, term);
      return term;
    },
    []
  );

  // ==================== 切换终端实例 ====================
  const switchTerminal = useCallback(
    (container: HTMLDivElement) => {
      const resourceId = activeResourceIdRef.current;
      if (!resourceId) return;

      // 断开旧终端
      if (containerRef.current && activeTerminalId) {
        const oldTerm = terminalPool.get(activeTerminalId);
        if (oldTerm) {
          try {
            oldTerm.element?.remove();
          } catch {}
        }
      }

      containerRef.current = container;
      activeTerminalId = resourceId;

      // 获取或创建
      const term = getOrCreateTerminal(resourceId);

      // 挂载到 DOM
      if (!term.element) {
        term.open(container);
      } else {
        container.appendChild(term.element);
      }

      // fit
      const fitAddon = fitAddonPool.get(resourceId);
      if (fitAddon) {
        requestAnimationFrame(() => {
          try {
            fitAddon.fit();
          } catch {}
        });
      }

      // 聚焦
      term.focus();

      // 订阅用户输入 → WebSocket
      term.onData((data) => {
        const rid = activeResourceIdRef.current;
        if (!rid) return;
        const wsId = useSessionStore.getState().activeWorkspaceId;
        if (!wsId) return;
        sendMessage({
          type: 'resource:input',
          workspaceId: wsId,
          resourceId: rid,
          data,
        });
      });

      // ResizeObserver
      if (fitObserverRef.current) {
        fitObserverRef.current.disconnect();
      }
      fitObserverRef.current = new ResizeObserver(() => {
        const fa = fitAddonPool.get(resourceId);
        if (fa && term.element) {
          try {
            fa.fit();
          } catch {}
        }
      });
      fitObserverRef.current.observe(container);

      // 恢复已有输出
      const lines = outputBuffer.get(resourceId);
      if (lines && lines.length > 0 && term.buffer.active.length <= 1) {
        term.write(lines.join('\r\n'));
      }
    },
    [sendMessage, getOrCreateTerminal]
  );

  // ==================== 终端主题/字体热更新 ====================
  useEffect(() => {
    const theme = getThemeColors();
    const fontFamily = getFontFamily();
    const fontSize = getFontSize();

    terminalPool.forEach((term) => {
      term.options.theme = theme;
      term.options.fontFamily = fontFamily;
      term.options.fontSize = fontSize;
    });
  }, [themeId, fontId]);

  // ==================== PTY 输出 → 终端 ====================
  useEffect(() => {
    const handler = (e: Event) => {
      const { resourceId, data } = (e as CustomEvent).detail;
      if (!resourceId || !data) return;

      // 追加到缓冲
      const lines = outputBuffer.get(resourceId) || [];
      // 拆分新行，保留每行
      const newLines = data.split('\n');
      if (lines.length > 0) {
        // 最后一行可能需要拼接（\r 不换行）
        lines[lines.length - 1] += newLines[0];
        for (let i = 1; i < newLines.length; i++) {
          lines.push(newLines[i]);
        }
      } else {
        lines.push(...newLines);
      }
      outputBuffer.set(resourceId, lines);

      // 限流写入
      const term = terminalPool.get(resourceId);
      if (!term) return;

      if (pendingWrites.has(resourceId)) return;

      const handle = requestAnimationFrame(() => {
        pendingWrites.delete(resourceId);
        term.write(data);
      });
      pendingWrites.set(resourceId, handle);
    };

    window.addEventListener('pty:output', handler);
    return () => window.removeEventListener('pty:output', handler);
  }, []);

  // ==================== 终端事件（exit） ====================
  useEffect(() => {
    const handler = (e: Event) => {
      const { resourceId } = (e as CustomEvent).detail;
      if (!resourceId) return;
      const term = terminalPool.get(resourceId);
      if (term) {
        term.write('\r\n\x1b[90m── Process exited ──\x1b[0m\r\n');
      }
    };

    window.addEventListener('pty:exit', handler);
    return () => window.removeEventListener('pty:exit', handler);
  }, []);

  // ==================== Cleanup ====================
  useEffect(() => {
    return () => {
      if (fitObserverRef.current) {
        fitObserverRef.current.disconnect();
      }
    };
  }, []);

  return {
    switchTerminal,
    terminalPool,
  };
}
