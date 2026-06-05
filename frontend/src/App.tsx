import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { Icon } from './components/Icon';
import { BrandLogo } from './components/BrandLogo';
import { useWebSocket } from './hooks/useWebSocket';
import { useSessionStore } from './store/sessionStore';
import { ResourceType } from './types';

const App: React.FC = () => {
  const { sendMessage } = useWebSocket();
  const { activeResourceId, setActiveResource, workspaces, activeWorkspaceId } =
    useSessionStore();
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
    <div className="h-[100dvh] flex flex-col bg-[#1C1D22] overflow-hidden">
      {/* 移动端顶栏 —— 汉堡菜单 + 当前工作空间 */}
      <header className="lg:hidden flex-shrink-0 h-14 bg-[#16171B] border-b border-neutral-800/60 flex items-center gap-3 px-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-xl bg-[#25262C] flex items-center justify-center text-neutral-300 active:scale-95 transition-transform"
          aria-label="Open menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <BrandLogo size={24} />
          <span className="text-sm font-semibold text-neutral-200 truncate">
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
            <div className="flex-1 flex items-center justify-center bg-[#1C1D22] px-6">
              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-xl font-semibold text-neutral-200">
                  {activeWorkspace.resources.length === 0
                    ? 'No active terminal'
                    : 'Select a terminal'}
                </h2>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {activeWorkspace.resources.length === 0
                    ? 'Server restarted and previous sessions ended. Use + Claude in the sidebar to start a new session.'
                    : 'Pick a session from the sidebar, or create one with + Claude.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#1C1D22]">
              <div className="text-center space-y-8">
                {/* 品牌 Logo */}
                <div className="relative flex items-center justify-center">
                  <BrandLogo size={80} />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#53D8FB]/10 to-[#9D4EDD]/10 blur-3xl rounded-full scale-200" />
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-[#53D8FB] to-[#9D4EDD] bg-clip-text text-transparent">
                    AI Workspace OS
                  </h2>
                  <p className="text-neutral-500 text-sm mt-2">
                    Your intelligent terminal workspace
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => sendMessage({ type: 'workspace:quick_create' })}
                    className="px-4 py-2 bg-[#25262C] rounded-xl border border-neutral-800/60 text-xs text-neutral-400 flex items-center gap-2 hover:text-neutral-200 hover:border-neutral-700 hover:bg-[#2D2E36] transition-all active:scale-95 cursor-pointer"
                  >
                    <Icon name="zap" size={14} className="text-[#53D8FB]" />
                    <span>Quick create</span>
                  </button>
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="px-4 py-2 bg-[#25262C] rounded-xl border border-neutral-800/60 text-xs text-neutral-400 flex items-center gap-2 hover:text-neutral-200 hover:border-neutral-700 hover:bg-[#2D2E36] transition-all active:scale-95 cursor-pointer"
                  >
                    <Icon name="plus" size={14} className="text-[#9D4EDD]" />
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
    </div>
  );
};

export default App;
