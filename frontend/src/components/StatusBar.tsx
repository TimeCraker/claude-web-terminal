import React from 'react';
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

  return (
    <div className="h-9 bg-theme-surface border-t border-theme-border flex items-center px-4 text-xs">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected
                ? 'bg-theme-success shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                : 'bg-theme-error'
            }`}
          />
          <span className="text-theme-text-muted">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {activeWorkspace && (
          <div className="flex items-center gap-2 text-theme-text-muted">
            <Icon name={getIconName(activeWorkspace.icon)} size={12} className="text-theme-text-muted" />
            <span>{activeWorkspace.name}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4">
        {activeResource && (
          <div className="flex items-center gap-2">
            <span className="text-theme-text-muted font-mono">
              {activeResource.type.toUpperCase()}
            </span>
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
        )}

        {activeResource?.pid && (
          <span className="text-theme-text-muted font-mono">PID: {activeResource.pid}</span>
        )}
      </div>
    </div>
  );
};
