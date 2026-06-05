import { useEffect, useCallback, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useSessionStore } from '../store/sessionStore';
import { ClientMessage, ServerMessage, TerminalSnapshot } from '../types';
import { wsSessionId } from './useWebSocket';

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
  workspaceId: string;
  resourceId: string;
  lastCols: number;
  lastRows: number;
  resizeTimer: number | null;
  /** 已成功 subscribe 的 WS 会话 ID，0 表示未订阅 */
  subscribedWsSession: number;
}

const terminalPool = new Map<string, TerminalInstance>();
let currentWsSession = 0;

interface UseTerminalOptions {
  sendMessage: (message: ClientMessage) => boolean | void;
}

export function resetAllTerminalSubscriptions(): void {
  terminalPool.forEach((instance) => {
    instance.subscribedWsSession = 0;
  });
}

export function useTerminal({ sendMessage }: UseTerminalOptions) {
  const { activeWorkspaceId, activeResourceId } = useSessionStore();
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const safeFit = useCallback((instance: TerminalInstance): boolean => {
    const { clientWidth, clientHeight } = instance.container;
    if (clientWidth <= 0 || clientHeight <= 0) return false;
    try {
      instance.fitAddon.fit();
      return instance.terminal.cols > 0 && instance.terminal.rows > 0;
    } catch {
      return false;
    }
  }, []);

  const flushResize = useCallback((instance: TerminalInstance) => {
    const { cols, rows } = instance.terminal;
    if (cols <= 0 || rows <= 0) return;
    if (cols === instance.lastCols && rows === instance.lastRows) return;
    instance.lastCols = cols;
    instance.lastRows = rows;
    sendMessageRef.current({
      type: 'resource:resize',
      workspaceId: instance.workspaceId,
      resourceId: instance.resourceId,
      cols,
      rows,
    });
  }, []);

  const scheduleResize = useCallback(
    (instance: TerminalInstance) => {
      if (instance.resizeTimer !== null) {
        window.clearTimeout(instance.resizeTimer);
      }
      instance.resizeTimer = window.setTimeout(() => {
        instance.resizeTimer = null;
        if (safeFit(instance)) {
          flushResize(instance);
        }
      }, 150);
    },
    [safeFit, flushResize]
  );

  const subscribe = useCallback(
    (instance: TerminalInstance): boolean => {
      safeFit(instance);
      const { cols, rows } = instance.terminal;
      if (cols > 0 && rows > 0) {
        instance.lastCols = cols;
        instance.lastRows = rows;
      }
      const ok = sendMessageRef.current({
        type: 'resource:subscribe',
        workspaceId: instance.workspaceId,
        resourceId: instance.resourceId,
        cols: cols > 0 ? cols : undefined,
        rows: rows > 0 ? rows : undefined,
      });
      if (ok !== false) {
        instance.subscribedWsSession = currentWsSession;
      }
      return ok !== false;
    },
    [safeFit]
  );

  const subscribeWhenReady = useCallback(
    (instance: TerminalInstance, attempt = 0) => {
      safeFit(instance);
      const { cols, rows } = instance.terminal;
      if ((cols <= 0 || rows <= 0) && attempt < 40) {
        requestAnimationFrame(() => subscribeWhenReady(instance, attempt + 1));
        return;
      }
      if (!subscribe(instance) && attempt < 50) {
        // WS 尚未就绪，消息已入队；稍后重试以更新 subscribedWsSession
        window.setTimeout(() => subscribeWhenReady(instance, attempt + 1), 100);
      }
    },
    [safeFit, subscribe]
  );

  const ensureTerminal = useCallback(
    (container: HTMLDivElement, resourceId: string, workspaceId: string): TerminalInstance => {
      const existing = terminalPool.get(resourceId);
      if (existing) {
        if (existing.container !== container) {
          container.appendChild(existing.wrapper);
          existing.container = container;
          existing.resizeObserver.disconnect();
          existing.resizeObserver.observe(container);
        }
        existing.workspaceId = workspaceId;
        return existing;
      }

      const terminal = new Terminal({
        theme: WARP_THEME,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
        fontSize: 14,
        lineHeight: 1.0,
        letterSpacing: 0,
        cursorBlink: false,
        cursorStyle: 'bar',
        cursorWidth: 2,
        scrollback: 10000,
        allowTransparency: false,
        disableStdin: true,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());

      const wrapper = document.createElement('div');
      wrapper.className = 'terminal-wrapper';
      container.appendChild(wrapper);
      terminal.open(wrapper);

      const instance: TerminalInstance = {
        terminal,
        fitAddon,
        container,
        wrapper,
        resizeObserver: null as unknown as ResizeObserver,
        workspaceId,
        resourceId,
        lastCols: 0,
        lastRows: 0,
        resizeTimer: null,
        subscribedWsSession: 0,
      };

      const resizeObserver = new ResizeObserver(() => scheduleResize(instance));
      resizeObserver.observe(container);
      instance.resizeObserver = resizeObserver;

      terminalPool.set(resourceId, instance);
      requestAnimationFrame(() => safeFit(instance));

      return instance;
    },
    [safeFit, scheduleResize]
  );

  const switchTerminal = useCallback(
    (container: HTMLDivElement) => {
      if (!activeResourceId || !activeWorkspaceId) return;

      terminalPool.forEach((instance, id) => {
        instance.wrapper.style.display = id === activeResourceId ? 'block' : 'none';
      });

      const instance = ensureTerminal(container, activeResourceId, activeWorkspaceId);
      instance.wrapper.style.display = 'block';

      requestAnimationFrame(() => {
        safeFit(instance);

        // WS 会话变化或未订阅 → 必须 subscribe，否则收不到任何 PTY 输出
        if (instance.subscribedWsSession !== currentWsSession) {
          subscribeWhenReady(instance);
        } else {
          flushResize(instance);
        }

        try {
          instance.terminal.focus();
        } catch {}
      });
    },
    [activeResourceId, activeWorkspaceId, ensureTerminal, safeFit, subscribeWhenReady, flushResize]
  );

  const writeToTerminal = useCallback((resourceId: string, data: string) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      instance.terminal.write(data);
      instance.terminal.scrollToBottom();
    }
  }, []);

  const restoreSnapshot = useCallback((resourceId: string, snapshot: TerminalSnapshot) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      instance.terminal.reset();
      instance.terminal.write(snapshot.ansiBuffer.join(''));
      instance.terminal.scrollToBottom();
    }
  }, []);

  const disposeTerminal = useCallback((resourceId: string) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      if (instance.resizeTimer !== null) {
        window.clearTimeout(instance.resizeTimer);
      }
      instance.resizeObserver.disconnect();
      instance.terminal.dispose();
      instance.wrapper.remove();
      terminalPool.delete(resourceId);
    }
  }, []);

  const fitTerminal = useCallback(() => {
    if (!activeResourceId) return;
    const instance = terminalPool.get(activeResourceId);
    if (instance) {
      requestAnimationFrame(() => {
        if (safeFit(instance)) {
          flushResize(instance);
        }
      });
    }
  }, [activeResourceId, safeFit, flushResize]);

  useEffect(() => {
    currentWsSession = wsSessionId;

    const handleWsConnected = (event: Event) => {
      currentWsSession = (event as CustomEvent<number>).detail;
      resetAllTerminalSubscriptions();

      if (activeResourceId && activeWorkspaceId) {
        const instance = terminalPool.get(activeResourceId);
        if (instance) {
          subscribeWhenReady(instance);
        }
      }
    };

    window.addEventListener('ws:connected', handleWsConnected);
    return () => window.removeEventListener('ws:connected', handleWsConnected);
  }, [activeResourceId, activeWorkspaceId, subscribeWhenReady]);

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
