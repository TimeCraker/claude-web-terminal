import React, { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { ResourceType, ClientMessage } from '../types';
import { Icon } from './Icon';
import { BrandLogo } from './BrandLogo';
import { useThemeStore } from '../themes/useThemeStore';

interface SidebarProps {
  sendMessage: (message: ClientMessage) => void;
  onCreateWorkspace: (name: string, path: string) => void;
  onCreateResource: (workspaceId: string, type: ResourceType) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteResource: (workspaceId: string, resourceId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sendMessage,
  onCreateWorkspace,
  onCreateResource,
  onDeleteWorkspace,
  onDeleteResource,
  isOpen,
  onClose,
}) => {
  const {
    workspaces,
    activeWorkspaceId,
    activeResourceId,
    setActiveWorkspace,
    setActiveResource,
  } = useSessionStore();

  const openSettings = useThemeStore((s) => s.openSettings);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCreate = () => {
    if (newName && newPath) {
      onCreateWorkspace(newName, newPath);
      setNewName('');
      setNewPath('');
      setIsCreating(false);
    }
  };

  // 选中资源后，在移动端收起抽屉（终端即将占满屏幕）
  const handleSelectResource = (resourceId: string) => {
    setActiveResource(resourceId);
    onClose();
  };

  const handleCreateResourceAndClose = (workspaceId: string, type: ResourceType) => {
    onCreateResource(workspaceId, type);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-theme-success shadow-[0_0_6px_rgba(52,211,153,0.5)]';
      case 'STARTING':
      case 'CREATING':
        return 'bg-theme-warning animate-pulse';
      case 'ERROR':
        return 'bg-theme-error';
      default:
        return 'bg-theme-text-muted';
    }
  };

  const getResourceIconName = (type: ResourceType): string => {
    switch (type) {
      case 'claude':
        return 'sparkles';
      case 'shell':
        return 'terminal';
      case 'git':
        return 'git';
      case 'logs':
        return 'file';
      case 'browser':
        return 'globe';
      default:
        return 'settings';
    }
  };

  // 桌面端折叠态：仅图标轨道（移动端永不显示，由 hidden lg:flex 控制）
  const collapsedRail = (
    <div
      className={`${
        isCollapsed ? 'hidden lg:flex' : 'hidden'
      } w-16 bg-theme-surface border-r border-theme-border flex-col items-center py-4 h-full`}
    >
      <button
        onClick={() => setIsCollapsed(false)}
        className="w-10 h-10 rounded-xl bg-theme-surface-light hover:bg-theme-surface-elevated flex items-center justify-center text-theme-text-secondary hover:text-theme-text transition-all duration-200 mb-4"
        title="Expand sidebar"
      >
        <Icon name="chevron-right" size={18} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto scrollbar-thin">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => {
              setActiveWorkspace(workspace.id);
              setIsCollapsed(false);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
              activeWorkspaceId === workspace.id
                ? 'bg-theme-accent/15 border border-theme-accent/20 text-theme-text shadow-[0_0_10px_var(--theme-glow-primary)]'
                : 'hover:bg-theme-surface-light hover:shadow-[0_0_8px_var(--theme-glow-primary)] text-theme-text-secondary'
            }`}
            title={workspace.name}
          >
            <Icon name={workspace.icon} size={18} />
          </button>
        ))}
      </div>

      <button
        onClick={() => sendMessage({ type: 'workspace:quick_create' })}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:scale-105 transition-all duration-200 mt-4"
        style={{ background: 'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))' }}
        title="Quick Create Workspace"
      >
        <Icon name="zap" size={18} />
      </button>
    </div>
  );

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {collapsedRail}

      {/* 展开面板：桌面常驻 + 移动端抽屉 */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[82vw] lg:max-w-none
          bg-theme-surface border-r border-theme-border flex flex-col h-full
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:hidden' : 'lg:translate-x-0 lg:flex'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between flex-shrink-0">
          <BrandLogo size={32} showText />
          {/* 桌面端折叠按钮 */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:flex w-8 h-8 rounded-lg bg-theme-surface-light hover:bg-theme-surface-elevated items-center justify-center text-theme-text-muted hover:text-theme-text-secondary transition-all duration-200"
            title="Collapse sidebar"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          {/* 移动端关闭按钮 */}
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg bg-theme-surface-light flex items-center justify-center text-theme-text-secondary active:scale-95"
            title="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Workspace List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin min-h-0">
          {workspaces.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-theme-text-muted">
              No workspaces yet.
              <br />
              Tap Quick to create one.
            </div>
          )}
          {workspaces.map((workspace) => (
            <div key={workspace.id}>
              <div
                className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeWorkspaceId === workspace.id
                    ? 'bg-theme-surface-light border border-theme-border-strong shadow-[0_0_12px_var(--theme-glow-primary)]'
                    : 'hover:bg-theme-surface-light hover:shadow-[0_0_10px_var(--theme-glow-primary)] border border-transparent hover:border-theme-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveWorkspace(workspace.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activeWorkspaceId === workspace.id
                          ? 'bg-theme-accent/20 text-theme-text'
                          : 'bg-theme-surface-light text-theme-text-secondary'
                      }`}
                    >
                      <Icon name={workspace.icon} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-theme-text truncate">
                        {workspace.name}
                      </div>
                      <div className="text-[11px] text-theme-text-muted truncate mt-0.5 font-mono">
                        {workspace.path}
                      </div>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: workspace.color,
                        boxShadow: `0 0 8px ${workspace.color}40`,
                      }}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWorkspace(workspace.id);
                    }}
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-error hover:bg-theme-error/10 transition-all duration-200 flex-shrink-0"
                    title="Delete workspace"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>

              {/* Resources */}
              {activeWorkspaceId === workspace.id && (
                <div className="ml-4 mt-2 space-y-1">
                  {workspace.resources.map((resource) => (
                    <div
                      key={resource.id}
                      className={`group flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        activeResourceId === resource.id
                          ? 'bg-theme-surface-light text-theme-text border border-theme-border-strong shadow-[0_0_8px_var(--theme-glow-primary)]'
                          : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light hover:shadow-[0_0_8px_var(--theme-glow-primary)] border border-transparent hover:border-theme-border'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectResource(resource.id)}
                        className="flex-1 flex items-center gap-2.5 min-w-0"
                      >
                        <Icon name={getResourceIconName(resource.type)} size={14} />
                        <span className="flex-1 truncate font-medium text-left">
                          {resource.name}
                        </span>
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(
                            resource.status
                          )}`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteResource(workspace.id, resource.id);
                        }}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-theme-text-muted hover:text-theme-error hover:bg-theme-error/10 transition-all duration-200 flex-shrink-0"
                        title="Close terminal"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add Resource Buttons */}
                  <div className="space-y-1 mt-2 pt-2 border-t border-theme-border">
                    {(
                      [
                        { type: 'claude' as ResourceType, label: 'Claude' },
                        { type: 'shell' as ResourceType, label: 'Shell' },
                        { type: 'git' as ResourceType, label: 'Git' },
                      ]
                    ).map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => handleCreateResourceAndClose(workspace.id, type)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 bg-theme-surface-light/30 hover:bg-theme-surface-light/60 rounded-md transition-all group/btn"
                        title={`New ${type}`}
                      >
                        <Icon
                          name="plus"
                          size={12}
                          className="text-theme-text-muted group-hover/btn:text-theme-text-secondary"
                        />
                        <Icon
                          name={getResourceIconName(type)}
                          size={12}
                          className="text-theme-text-muted group-hover/btn:text-theme-text-secondary"
                        />
                        <span className="text-xs text-theme-text-secondary group-hover/btn:text-theme-text ml-0.5">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Workspace + Settings */}
        <div className="p-4 border-t border-theme-border space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => sendMessage({ type: 'workspace:quick_create' })}
              className="flex-1 px-4 py-2.5 text-theme-bg rounded-xl text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_14px_var(--theme-glow-primary)] transition-all duration-300 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))' }}
              title="Quick Create Workspace"
            >
              <Icon name="zap" size={14} />
              <span>Quick</span>
            </button>
            <button
              onClick={() => setIsCreating((v) => !v)}
              className="flex-1 px-4 py-2.5 bg-theme-text text-theme-bg rounded-xl text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_14px_var(--theme-glow-primary)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Icon name="plus" size={14} />
              <span>Custom</span>
            </button>
          </div>

          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-theme-surface-light hover:bg-theme-surface-elevated hover:shadow-[0_0_10px_var(--theme-glow-primary)] rounded-xl text-sm text-theme-text-secondary hover:text-theme-text transition-all duration-200 hover:border-theme-border border border-transparent"
          >
            <Icon name="settings" size={14} />
            <span>设置</span>
          </button>

          {isCreating ? (
            <div className="space-y-3 pt-1">
              <input
                type="text"
                placeholder="Workspace Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 bg-theme-surface-light border border-theme-border rounded-xl text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent/20 transition-all duration-300"
              />
              <input
                type="text"
                placeholder="/path/to/project"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="w-full px-4 py-2.5 bg-theme-surface-light border border-theme-border rounded-xl text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent/20 transition-all duration-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2.5 bg-theme-text text-theme-bg rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all duration-300"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2.5 bg-theme-surface-light text-theme-text-secondary rounded-xl text-sm hover:bg-theme-surface-elevated transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};
