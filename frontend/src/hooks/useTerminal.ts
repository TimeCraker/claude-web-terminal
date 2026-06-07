import { useEffect, useCallback, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';
import { useSessionStore } from '../store/sessionStore';
import { useThemeStore } from '../themes/useThemeStore';
import { ClientMessage, ServerMessage, TerminalSnapshot } from '../types';
import { wsSessionId } from './useWebSocket';

function getTheme() {
  return useThemeStore.getState().getTheme().xterm;
}

function getFontFamily() {
  return useThemeStore.getState().getFont().family;
}

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  container: HTMLDivElement;
  wrapper: HTMLDivElement;
  resizeObserver: ResizeObserver;
  workspaceId: string;
  resourceId: string;
  lastCols: number;
  lastRows: number;
  resizeTimer: number | null;
  subscribedWsSession: number;
  /** 写入批处理缓冲区 */
  writeBuffer: string;
  /** rAF ID，非 0 表示有待刷新的写入 */
  writeRafId: number;
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
  const themeId = useThemeStore((s) => s.themeId);
  const fontId = useThemeStore((s) => s.fontId);

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
        theme: getTheme(),
        fontFamily: getFontFamily(),
        fontSize: 14,
        lineHeight: 1.0,
        letterSpacing: 0,
        cursorBlink: false,
        cursorStyle: 'bar',
        cursorWidth: 2,
        scrollback: 5000,
        allowTransparency: false,
        disableStdin: true,
        smoothScrollDuration: 0,
      });

      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(searchAddon);

      try {
        const webglAddon = new WebglAddon();
        terminal.loadAddon(webglAddon);
      } catch {
        console.warn('WebGL not available, falling back to canvas renderer');
      }

      // 监听选中文本变化
      terminal.onSelectionChange(() => {
        const selection = terminal.getSelection();
        if (selection) {
          window.dispatchEvent(new CustomEvent('terminal:selection', {
            detail: { text: selection, resourceId }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('terminal:selection', {
            detail: { text: '', resourceId }
          }));
        }
      });

      const wrapper = document.createElement('div');
      wrapper.className = 'terminal-wrapper';
      container.appendChild(wrapper);
      terminal.open(wrapper);

      const instance: TerminalInstance = {
        terminal,
        fitAddon,
        searchAddon,
        container,
        wrapper,
        resizeObserver: null as unknown as ResizeObserver,
        workspaceId,
        resourceId,
        lastCols: 0,
        lastRows: 0,
        resizeTimer: null,
        subscribedWsSession: 0,
        writeBuffer: '',
        writeRafId: 0,
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

  // 写入批处理：收集一帧内的所有数据，统一写入，减少重绘次数
  const writeToTerminal = useCallback((resourceId: string, data: string) => {
    const instance = terminalPool.get(resourceId);
    if (!instance) return;

    instance.writeBuffer += data;

    if (instance.writeRafId === 0) {
      instance.writeRafId = requestAnimationFrame(() => {
        instance.writeRafId = 0;
        const buf = instance.writeBuffer;
        instance.writeBuffer = '';
        if (!buf) return;

        // 智能滚动：写入前检测用户是否在底部附近
        const viewport = instance.terminal.element?.querySelector('.xterm-viewport');
        const wasNearBottom = viewport
          ? viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80
          : true;

        instance.terminal.write(buf, () => {
          if (wasNearBottom) {
            instance.terminal.scrollToBottom();
          }
        });
      });
    }
  }, []);

  const restoreSnapshot = useCallback((resourceId: string, snapshot: TerminalSnapshot) => {
    const instance = terminalPool.get(resourceId);
    if (!instance) return;
    if (instance.writeRafId !== 0) {
      cancelAnimationFrame(instance.writeRafId);
      instance.writeRafId = 0;
      instance.writeBuffer = '';
    }
    instance.terminal.reset();
    instance.terminal.write(snapshot.ansiBuffer.join(''), () => {
      instance.terminal.scrollToBottom();
    });
  }, []);

  const disposeTerminal = useCallback((resourceId: string) => {
    const instance = terminalPool.get(resourceId);
    if (instance) {
      if (instance.resizeTimer !== null) {
        window.clearTimeout(instance.resizeTimer);
      }
      if (instance.writeRafId !== 0) {
        cancelAnimationFrame(instance.writeRafId);
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

  // ==================== 主题/字体热更新 ====================
  useEffect(() => {
    const theme = getTheme();
    const fontFamily = getFontFamily();
    terminalPool.forEach((instance) => {
      instance.terminal.options.theme = theme;
      instance.terminal.options.fontFamily = fontFamily;
    });
  }, [themeId, fontId]);

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

  // 搜索功能
  const search = useCallback((term: string) => {
    if (!activeResourceId) return;
    const instance = terminalPool.get(activeResourceId);
    if (instance) {
      instance.searchAddon.findNext(term);
    }
  }, [activeResourceId]);

  const searchPrevious = useCallback((term: string) => {
    if (!activeResourceId) return;
    const instance = terminalPool.get(activeResourceId);
    if (instance) {
      instance.searchAddon.findPrevious(term);
    }
  }, [activeResourceId]);

  const clearSearch = useCallback(() => {
    if (!activeResourceId) return;
    const instance = terminalPool.get(activeResourceId);
    if (instance) {
      instance.searchAddon.clearDecorations();
    }
  }, [activeResourceId]);

  return {
    switchTerminal,
    writeToTerminal,
    disposeTerminal,
    fitTerminal,
    search,
    searchPrevious,
    clearSearch,
  };
}
