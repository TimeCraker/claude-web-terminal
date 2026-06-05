import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { Icon } from './components/Icon';
import { BrandLogo } from './components/BrandLogo';
import { useWebSocket } from './hooks/useWebSocket';
import { useSessionStore } from './store/sessionStore';
import { useThemeStore } from './themes/useThemeStore';
import { ResourceType } from './types';

const App: React.FC = () => {
  const { sendMessage } = useWebSocket();
  const { activeResourceId, setActiveResource, workspaces, activeWorkspaceId } =
    useSessionStore();
  const isSettingsOpen = useThemeStore((s) => s.isSettingsOpen);
  const closeSettings = useThemeStore((s) => s.closeSettings);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleCreateWorkspace = (name: string, path: string) => {
    const icons = ['terminal', 'folder', 'box', 'wrench', 'target', 'layers', 'globe', 'sparkles'];
    const colors = ['#53D8FB', '#9D4EDD', '#A8E6CF', '#FFD3B6', '#FF6B6B'];
    const icon = icons[Math.floor(Math.random() * icons.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    sendMessage({
      type: 'workspace:create',
      name,
      path,
      icon,
      color,
    });
  };

  const handleCreateResource = (workspaceId: string, type: ResourceType) => {
    sendMessage({
      type: 'resource:create',
      workspaceId,
      resourceType: type,
    });
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    if (confirm('Delete this workspace and all its terminals?')) {
      sendMessage({
        type: 'workspace:delete',
        workspaceId,
      });
    }
  };

  const handleDeleteResource = (workspaceId: string, resourceId: string) => {
    if (resourceId === activeResourceId) {
      setActiveResource(null);
    }
    sendMessage({
      type: 'resource:kill',
      workspaceId,
      resourceId,
    });
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-theme-bg overflow-hidden">
      {/* 移动端顶栏 —— 汉堡菜单 + 当前工作空间 */}
      <header className="lg:hidden flex-shrink-0 h-14 bg-theme-surface border-b border-theme-border flex items-center gap-3 px-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-xl bg-theme-surface-light flex items-center justify-center text-theme-text active:scale-95 transition-transform"
          aria-label="Open menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo size={24} />
          <span className="text-sm font-semibold text-theme-text truncate">
            {activeWorkspace ? activeWorkspace.name : 'AI Workspace OS'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Sidebar */}
        <Sidebar
          sendMessage={sendMessage}
          onCreateWorkspace={handleCreateWorkspace}
          onCreateResource={handleCreateResource}
          onDeleteWorkspace={handleDeleteWorkspace}
          onDeleteResource={handleDeleteResource}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Terminal Area - overflow-hidden 防止 xterm canvas 溢出 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeResourceId ? (
            <Terminal sendMessage={sendMessage} />
          ) : activeWorkspaceId && activeWorkspace ? (
            <div className="flex-1 flex items-center justify-center bg-theme-bg px-6">
              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-xl font-semibold text-theme-text">
                  {activeWorkspace.resources.length === 0
                    ? 'No active terminal'
                    : 'Select a terminal'}
                </h2>
                <p className="text-sm text-theme-text-secondary leading-relaxed">
                  {activeWorkspace.resources.length === 0
                    ? 'Server restarted and previous sessions ended. Use + Claude in the sidebar to start a new session.'
                    : 'Pick a session from the sidebar, or create one with + Claude.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-theme-bg">
              <div className="text-center space-y-8">
                {/* 品牌 Logo */}
                <div className="relative flex items-center justify-center">
                  <BrandLogo size={80} />
                  <div className="absolute inset-0 blur-3xl rounded-full scale-200 opacity-10" style={{ background: 'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))' }} />
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-3xl font-bold gradient-text">
                    AI Workspace OS
                  </h2>
                  <p className="text-theme-text-secondary text-sm mt-2">
                    Your intelligent terminal workspace
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => sendMessage({ type: 'workspace:quick_create' })}
                    className="px-4 py-2 bg-theme-surface-light rounded-xl border border-theme-border text-xs text-theme-text-secondary flex items-center gap-2 hover:text-theme-text hover:border-theme-border-strong hover:bg-theme-surface-elevated transition-all active:scale-95 cursor-pointer"
                  >
                    <Icon name="zap" size={14} className="text-theme-accent" />
                    <span>Quick create</span>
                  </button>
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="px-4 py-2 bg-theme-surface-light rounded-xl border border-theme-border text-xs text-theme-text-secondary flex items-center gap-2 hover:text-theme-text hover:border-theme-border-strong hover:bg-theme-surface-elevated transition-all active:scale-95 cursor-pointer"
                  >
                    <Icon name="plus" size={14} className="text-theme-accent-secondary" />
                    <span>Custom workspace</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  );
};

export default App;
