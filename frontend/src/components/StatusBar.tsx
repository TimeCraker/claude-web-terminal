import React from 'react';
import { useSessionStore } from '../store/sessionStore';

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
    if (!activeResource) return 'text-neutral-500';
    switch (activeResource.status) {
      case 'RUNNING':
        return 'text-emerald-400';
      case 'STARTING':
      case 'CREATING':
        return 'text-amber-400';
      case 'ERROR':
        return 'text-red-400';
      default:
        return 'text-neutral-500';
    }
  };

  return (
    <div className="h-9 bg-[#16171B] border-t border-neutral-800/60 flex items-center px-4 text-xs">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                : 'bg-red-400'
            }`}
          />
          <span className="text-neutral-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {activeWorkspace && (
          <div className="flex items-center gap-2 text-neutral-500">
            <span>{activeWorkspace.icon}</span>
            <span>{activeWorkspace.name}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4">
        {activeResource && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-600 font-mono">
              {activeResource.type.toUpperCase()}
            </span>
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
        )}

        {activeResource?.pid && (
          <span className="text-neutral-600 font-mono">PID: {activeResource.pid}</span>
        )}
      </div>
    </div>
  );
};
