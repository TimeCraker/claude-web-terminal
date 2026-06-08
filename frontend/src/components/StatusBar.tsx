import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { Icon } from './Icon';

const getIconName = (icon: string): string => {
  const map: Record<string, string> = {
    terminal: 'terminal', zap: 'zap', wrench: 'wrench', code: 'code',
    target: 'target', box: 'box', layers: 'layers', sparkles: 'sparkles',
    folder: 'folder', globe: 'globe', settings: 'settings',
  };
  return map[icon] || 'folder';
};

export const StatusBar: React.FC = () => {
  const { isConnected, activeWorkspaceId, activeResourceId, workspaces } =
    useSessionStore();

  const [reconnectInfo, setReconnectInfo] = useState<{
    attempt: number;
    delay: number;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // 监听重连事件
  useEffect(() => {
    const handleReconnecting = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setReconnectInfo(detail);
    };

    const handleConnected = () => {
      setReconnectInfo(null);
    };

    const handleError = (event: Event) => {
      const message = (event as CustomEvent).detail;
      setErrorMessage(message);
      // 5 秒后自动清除错误
      setTimeout(() => setErrorMessage(null), 5000);
    };

    // 监听输入框聚焦事件（移动端隐藏状态栏）
    const handleInputFocus = (event: Event) => {
      const focused = (event as CustomEvent).detail;
      setIsInputFocused(focused);
    };

    window.addEventListener('ws:reconnecting', handleReconnecting);
    window.addEventListener('ws:connected', handleConnected);
    window.addEventListener('ws:error', handleError);
    window.addEventListener('terminal:input-focus', handleInputFocus);

    return () => {
      window.removeEventListener('ws:reconnecting', handleReconnecting);
      window.removeEventListener('ws:connected', handleConnected);
      window.removeEventListener('ws:error', handleError);
      window.removeEventListener('terminal:input-focus', handleInputFocus);
    };
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeResource = activeWorkspace?.resources.find(
    (r) => r.id === activeResourceId
  );

  const getStatusText = () => {
    if (!activeResource) return 'No active session';
    switch (activeResource.status) {
      case 'RUNNING':
        return 'Running';
      case 'STARTING':
        return 'Starting...';
      case 'CREATING':
        return 'Creating...';
      case 'EXITED':
        return 'Exited';
      case 'ERROR':
        return 'Error';
      case 'STOPPED':
        return 'Stopped';
      default:
        return activeResource.status;
    }
  };

  const getStatusColor = () => {
    if (!activeResource) return 'text-theme-text-muted';
    switch (activeResource.status) {
      case 'RUNNING':
        return 'text-theme-success';
      case 'STARTING':
      case 'CREATING':
        return 'text-theme-warning';
      case 'ERROR':
        return 'text-theme-error';
      default:
        return 'text-theme-text-muted';
    }
  };

  const getConnectionStatus = () => {
    if (isConnected) {
      return {
        text: 'Connected',
        color: 'bg-theme-success shadow-[0_0_6px_rgba(52,211,153,0.5)]',
        textColor: 'text-theme-text-muted',
      };
    }

    if (reconnectInfo) {
      return {
        text: `Reconnecting (${reconnectInfo.attempt})...`,
        color: 'bg-theme-warning animate-pulse',
        textColor: 'text-theme-warning',
      };
    }

    return {
      text: 'Disconnected',
      color: 'bg-theme-error',
      textColor: 'text-theme-error',
    };
  };

  const connectionStatus = getConnectionStatus();

  // 移动端：输入框聚焦时隐藏状态栏
  if (isInputFocused && window.innerWidth < 640) {
    return null;
  }

  return (
    <div className="h-9 bg-theme-surface border-t border-theme-border flex items-center px-3 sm:px-4 text-xs overflow-hidden transition-all duration-300">
      {/* Left side */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.color}`} />
          <span className={`${connectionStatus.textColor} hidden sm:inline`}>
            {connectionStatus.text}
          </span>
        </div>

        {activeWorkspace && (
          <div className="flex items-center gap-2 text-theme-text-muted min-w-0">
            <Icon name={getIconName(activeWorkspace.icon)} size={12} className="text-theme-text-muted flex-shrink-0" />
            <span className="truncate">{activeWorkspace.name}</span>
          </div>
        )}

        {/* 错误消息 */}
        {errorMessage && (
          <div className="flex items-center gap-1.5 text-theme-error animate-fade-in">
            <Icon name="alert-circle" size={12} />
            <span className="truncate max-w-[200px]">{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {activeResource && (
          <div className="flex items-center gap-2">
            <span className="text-theme-text-muted font-mono hidden sm:inline">
              {activeResource.type.toUpperCase()}
            </span>
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
        )}

        {activeResource?.pid && (
          <span className="text-theme-text-muted font-mono hidden md:inline">PID: {activeResource.pid}</span>
        )}
      </div>
    </div>
  );
};
