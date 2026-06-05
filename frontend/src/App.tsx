import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { TopBar } from './components/TopBar';
import { ThemeOnboarding } from './components/ThemeOnboarding';
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
  const [isCreating, setIsCreating] = useState(false);
  const [createCooldown, setCreateCooldown] = useState(0);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // 冷却计时器
  React.useEffect(() => {
    if (createCooldown > 0) {
      const timer = setTimeout(() => setCreateCooldown(createCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [createCooldown]);

  // 监听工作区创建完成（当有新工作区被添加时）
  const prevWorkspaceCountRef = React.useRef(workspaces.length);
  React.useEffect(() => {
    if (isCreating && workspaces.length > prevWorkspaceCountRef.current) {
      // 新工作区已创建，延迟关闭加载状态
      const timer = setTimeout(() => {
        setIsCreating(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
    prevWorkspaceCountRef.current = workspaces.length;
  }, [workspaces, isCreating]);

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
      {/* 极细顶栏 */}
      <TopBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        isSidebarOpen={sidebarOpen}
      />

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
                    onClick={() => {
                      if (createCooldown > 0 || isCreating) return;
                      sendMessage({ type: 'workspace:quick_create' });
                      setSidebarOpen(true);
                      setIsCreating(true);
                      setCreateCooldown(5);
                    }}
                    disabled={createCooldown > 0 || isCreating}
                    className={`px-4 py-2 rounded-xl border text-xs flex items-center gap-2 transition-all active:scale-95 ${
                      createCooldown > 0 || isCreating
                        ? 'bg-theme-surface-light/50 border-theme-border/50 text-theme-text-muted cursor-not-allowed'
                        : 'bg-theme-surface-light border-theme-border text-theme-text-secondary hover:text-theme-text hover:border-theme-border-strong hover:bg-theme-surface-elevated cursor-pointer'
                    }`}
                  >
                    {isCreating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
                        <span>生成中...</span>
                      </>
                    ) : createCooldown > 0 ? (
                      <>
                        <Icon name="zap" size={14} className="text-theme-text-muted" />
                        <span>等待 {createCooldown}s</span>
                      </>
                    ) : (
                      <>
                        <Icon name="zap" size={14} className="text-theme-accent" />
                        <span>Quick create</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="px-4 py-2 bg-theme-surface-light rounded-xl border border-theme-border text-xs text-theme-text-secondary flex items-center gap-2 hover:text-theme-text hover:border-theme-border-strong hover:bg-theme-surface-elevated transition-all active:scale-95 cursor-pointer"
                  >
                    <Icon name="plus" size={14} className="text-theme-accent-secondary" />
                    <span>Custom workspace</span>
                  </button>
                </div>

                {/* 生成中提示 */}
                {isCreating && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-theme-text-secondary">
                    <div className="w-2 h-2 bg-theme-accent rounded-full animate-pulse" />
                    <span>AI 智能体工作区正在生成中...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Panel (右侧边栏) */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={closeSettings} />

      {/* 首次访问主题引导 */}
      <ThemeOnboarding />
    </div>
  );
};

export default App;
