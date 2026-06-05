import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { ClientMessage, ServerMessage, Workspace } from '../types';

const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
};

const WS_URL = getWsUrl();

/** 每次 WS 连接成功递增，供 terminal 判断是否需要重新 subscribe */
export let wsSessionId = 0;

const pendingMessages: ClientMessage[] = [];

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

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (pendingMessages.length > 0) {
      ws.send(JSON.stringify(pendingMessages.shift()!));
    }
  }, []);

  const sendMessage = useCallback((message: ClientMessage): boolean => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    pendingMessages.push(message);
    return false;
  }, []);

  const syncSelectionWithServer = useCallback((workspaces: Workspace[]) => {
    const {
      activeWorkspaceId,
      activeResourceId,
      setActiveWorkspace,
      setActiveResource,
    } = useSessionStore.getState();

    let workspaceId = activeWorkspaceId;
    if (!workspaceId && workspaces.length > 0) {
      workspaceId = workspaces[0].id;
      setActiveWorkspace(workspaceId);
    }

    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;

    if (activeResourceId && !workspace.resources.some((r) => r.id === activeResourceId)) {
      setActiveResource(null);
    }

    const currentResourceId = useSessionStore.getState().activeResourceId;
    if (!currentResourceId && workspace.resources.length > 0) {
      setActiveResource(workspace.resources[0].id);
    }
  }, []);

  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'workspace:list':
          setWorkspaces(message.workspaces);
          syncSelectionWithServer(message.workspaces);
          break;

        case 'workspace:created':
          addWorkspace(message.workspace);
          break;

        case 'workspace:updated':
          updateWorkspace(message.workspace);
          syncSelectionWithServer(
            useSessionStore.getState().workspaces.map((w) =>
              w.id === message.workspace.id ? message.workspace : w
            )
          );
          break;

        case 'workspace:deleted':
          removeWorkspace(message.workspaceId);
          break;

        case 'resource:created':
          if (message.workspaceId === useSessionStore.getState().activeWorkspaceId) {
            useSessionStore.getState().setActiveResource(message.resource.id);
          }
          window.dispatchEvent(
            new CustomEvent('ws:resource', { detail: message })
          );
          break;

        case 'resource:output':
        case 'resource:status':
        case 'resource:snapshot':
          window.dispatchEvent(
            new CustomEvent('ws:resource', { detail: message })
          );
          break;

        case 'resource:deleted':
          // 更新 sessionStore，从 workspaces 中移除被删除的资源
          const state = useSessionStore.getState();
          const updatedWorkspaces = state.workspaces.map(workspace => {
            if (workspace.id === message.workspaceId) {
              return {
                ...workspace,
                resources: workspace.resources.filter(r => r.id !== message.resourceId),
              };
            }
            return workspace;
          });
          state.setWorkspaces(updatedWorkspaces);

          // 如果删除的是当前活跃的资源，清除活跃状态
          if (state.activeResourceId === message.resourceId) {
            state.setActiveResource(null);
          }

          // 派发事件给终端处理
          window.dispatchEvent(
            new CustomEvent('ws:resource', { detail: message })
          );
          break;

        case 'error':
          console.error('❌ Server error:', message.message);
          window.dispatchEvent(
            new CustomEvent('ws:error', { detail: message.message })
          );
          break;
      }
    },
    [setWorkspaces, addWorkspace, updateWorkspace, removeWorkspace, syncSelectionWithServer]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      wsSessionId += 1;
      setConnected(true);
      flushQueue();

      window.dispatchEvent(
        new CustomEvent('ws:connected', { detail: wsSessionId })
      );

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
      setConnected(false);
      wsRef.current = null;
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      console.error('❌ WebSocket error');
    };

    wsRef.current = ws;
  }, [setConnected, flushQueue, sendMessage, handleMessage]);

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
