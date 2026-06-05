import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { useWebSocket } from './hooks/useWebSocket';
import { useSessionStore } from './store/sessionStore';
import { ResourceType } from './types';

const App: React.FC = () => {
  const { sendMessage } = useWebSocket();
  const { activeResourceId, setActiveResource } = useSessionStore();

  const handleCreateWorkspace = (name: string, path: string) => {
    const icons = ['🚀', '📁', '💼', '🔧', '🎯', '📊', '🌐', '💡'];
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
    <div className="h-screen flex flex-col bg-[#1C1D22] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <Sidebar
          onCreateWorkspace={handleCreateWorkspace}
          onCreateResource={handleCreateResource}
          onDeleteWorkspace={handleDeleteWorkspace}
          onDeleteResource={handleDeleteResource}
        />

        {/* Terminal Area - overflow-hidden 防止 xterm canvas 溢出 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeResourceId ? (
            <Terminal sendMessage={sendMessage} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#1C1D22]">
              <div className="text-center space-y-6">
                {/* Logo */}
                <div className="relative">
                  <div className="text-7xl mb-2">🖥️</div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#53D8FB]/15 to-[#9D4EDD]/15 blur-3xl rounded-full" />
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                    Welcome to AI Workspace OS
                  </h2>
                  <p className="text-neutral-500 text-sm mt-2">
                    Select or create a workspace to get started
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3 justify-center">
                  <div className="px-4 py-2 bg-[#25262C] rounded-xl border border-neutral-800/60 text-xs text-neutral-500">
                    <span className="text-[#53D8FB]">⌘</span> + Click to select
                  </div>
                  <div className="px-4 py-2 bg-[#25262C] rounded-xl border border-neutral-800/60 text-xs text-neutral-500">
                    <span className="text-[#9D4EDD]">⇧</span> + Enter to create
                  </div>
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
