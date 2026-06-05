import React, { useState, useCallback, useRef } from 'react';
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
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [quickCreateCooldown, setQuickCreateCooldown] = useState(0);
  const [closingResources, setClosingResources] = useState<Set<string>>(new Set());

  // 冷却计时器
  React.useEffect(() => {
    if (quickCreateCooldown > 0) {
      const timer = setTimeout(() => setQuickCreateCooldown(quickCreateCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [quickCreateCooldown]);

  // 监听工作区创建完成
  const prevWorkspaceCountRef = useRef(workspaces.length);
  React.useEffect(() => {
    if (isQuickCreating && workspaces.length > prevWorkspaceCountRef.current) {
      const timer = setTimeout(() => {
        setIsQuickCreating(false);
        setQuickCreateCooldown(5);
      }, 1000);
      return () => clearTimeout(timer);
    }
    prevWorkspaceCountRef.current = workspaces.length;
  }, [workspaces, isQuickCreating]);

  const handleCreate = () => {
    if (newName && newPath) {
      onCreateWorkspace(newName, newPath);
      setNewName('');
      setNewPath('');
      setIsCreating(false);
    }
  };

  const handleSelectResource = (resourceId: string) => {
    setActiveResource(resourceId);
    // 不自动关闭侧边栏，让用户自己决定
  };

  const handleCreateResourceAndClose = (workspaceId: string, type: ResourceType) => {
    onCreateResource(workspaceId, type);
    // 不自动关闭侧边栏，让用户自己决定
  };

  const handleQuickCreate = useCallback(() => {
    if (quickCreateCooldown > 0 || isQuickCreating) return;
    sendMessage({ type: 'workspace:quick_create' });
    setIsQuickCreating(true);
  }, [quickCreateCooldown, isQuickCreating, sendMessage]);

  const handleDeleteResource = useCallback((workspaceId: string, resourceId: string) => {
    if (closingResources.has(resourceId)) return;

    setClosingResources(prev => new Set(prev).add(resourceId));

    // 发送删除消息
    onDeleteResource(workspaceId, resourceId);

    // 3秒后清除关闭状态（防止后端没有响应时按钮一直转圈）
    setTimeout(() => {
      setClosingResources(prev => {
        const next = new Set(prev);
        next.delete(resourceId);
        return next;
      });
    }, 3000);
  }, [closingResources, onDeleteResource]);

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

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 侧边栏 - 无残留全折叠 */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[82vw] lg:max-w-none
          bg-theme-surface border-r border-theme-border flex flex-col h-full
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 lg:w-0 lg:opacity-0 pointer-events-none lg:pointer-events-auto'}`}
        style={{
          minWidth: isOpen ? '288px' : '0px',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between flex-shrink-0">
          <BrandLogo size={32} showText />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-theme-surface-light hover:bg-theme-surface-elevated items-center justify-center text-theme-text-muted hover:text-theme-text-secondary transition-all duration-200"
            title="Close sidebar"
          >
            <Icon name="chevron-left" size={16} />
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
                className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 hover-glow ${
                  activeWorkspaceId === workspace.id
                    ? 'glow-active bg-theme-surface-light border border-theme-border-strong'
                    : 'hover:bg-theme-surface-light border border-transparent hover:border-theme-border'
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
                  {workspace.resources.map((resource) => {
                    const isClosing = closingResources.has(resource.id);
                    return (
                      <div
                        key={resource.id}
                        className={`group flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover-glow ${
                          isClosing
                            ? 'opacity-50 pointer-events-none'
                            : activeResourceId === resource.id
                              ? 'glow-active bg-theme-surface-light text-theme-text border border-theme-border-strong'
                              : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border'
                        }`}
                      >
                        <button
                          onClick={() => handleSelectResource(resource.id)}
                          className="flex-1 flex items-center gap-2.5 min-w-0"
                          disabled={isClosing}
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
                            handleDeleteResource(workspace.id, resource.id);
                          }}
                          disabled={isClosing}
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            isClosing
                              ? 'text-theme-text-muted cursor-not-allowed'
                              : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-theme-text-muted hover:text-theme-error hover:bg-theme-error/10'
                          }`}
                          title={isClosing ? 'Closing...' : 'Close terminal'}
                        >
                          {isClosing ? (
                            <div className="w-3 h-3 border-2 border-theme-text-muted border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon name="x" size={14} />
                          )}
                        </button>
                      </div>
                    );
                  })}

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
                        className="w-full flex items-center gap-2 px-2 py-1.5 bg-theme-surface-light/30 hover:bg-theme-surface-light/60 hover-glow rounded-md transition-all group/btn"
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
              onClick={handleQuickCreate}
              disabled={quickCreateCooldown > 0 || isQuickCreating}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                quickCreateCooldown > 0 || isQuickCreating
                  ? 'bg-theme-surface-light/50 text-theme-text-muted cursor-not-allowed'
                  : 'text-theme-bg hover:scale-[1.02] hover-glow'
              }`}
              style={quickCreateCooldown > 0 || isQuickCreating ? {} : { background: 'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))' }}
              title="Quick Create Workspace"
            >
              {isQuickCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-theme-text-muted border-t-transparent rounded-full animate-spin" />
                  <span>生成中...</span>
                </>
              ) : quickCreateCooldown > 0 ? (
                <>
                  <Icon name="zap" size={14} />
                  <span>等待 {quickCreateCooldown}s</span>
                </>
              ) : (
                <>
                  <Icon name="zap" size={14} />
                  <span>Quick</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsCreating((v) => !v)}
              className="flex-1 px-4 py-2.5 bg-theme-text text-theme-bg rounded-xl text-sm font-semibold hover:scale-[1.02] hover-glow transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Icon name="plus" size={14} />
              <span>Custom</span>
            </button>
          </div>

          {/* 生成中提示 */}
          {isQuickCreating && (
            <div className="flex items-center justify-center gap-2 text-xs text-theme-text-secondary py-1">
              <div className="w-1.5 h-1.5 bg-theme-accent rounded-full animate-pulse" />
              <span>AI 智能体工作区正在生成中...</span>
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-theme-surface-light hover:bg-theme-surface-elevated hover-glow rounded-xl text-sm text-theme-text-secondary hover:text-theme-text transition-all duration-200 border border-transparent hover:border-theme-border"
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
