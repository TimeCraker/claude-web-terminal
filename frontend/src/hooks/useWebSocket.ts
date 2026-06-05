import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { ClientMessage, ServerMessage } from '../types';

// 动态构建 WebSocket URL，支持域名和端口
const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // 包含端口
  return `${protocol}//${host}/ws`;
};

const WS_URL = getWsUrl();

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    setWorkspaces,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    setConnected,
  } = useSessionStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('🔌 Connecting to WebSocket...');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);

      // 请求 workspace 列表
      sendMessage({ type: 'workspace:list' });
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('❌ Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
      wsRef.current = null;

      // 自动重连
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [setConnected, setWorkspaces, addWorkspace, updateWorkspace, removeWorkspace]);

  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'workspace:list':
          setWorkspaces(message.workspaces);
          break;

        case 'workspace:created':
          addWorkspace(message.workspace);
          break;

        case 'workspace:updated':
          updateWorkspace(message.workspace);
          break;

        case 'workspace:deleted':
          removeWorkspace(message.workspaceId);
          break;

        case 'resource:created':
        case 'resource:output':
        case 'resource:status':
        case 'resource:snapshot':
        case 'resource:deleted':
          // 这些事件由 useTerminal hook 处理
          window.dispatchEvent(
            new CustomEvent('ws:resource', { detail: message })
          );
          break;

        case 'error':
          console.error('❌ Server error:', message.message);
          break;
      }
    },
    [setWorkspaces, addWorkspace, updateWorkspace, removeWorkspace]
  );

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { sendMessage };
}
