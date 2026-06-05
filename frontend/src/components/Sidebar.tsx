import React, { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { ResourceType } from '../types';

interface SidebarProps {
  onCreateWorkspace: (name: string, path: string) => void;
  onCreateResource: (workspaceId: string, type: ResourceType) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteResource: (workspaceId: string, resourceId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCreateWorkspace,
  onCreateResource,
  onDeleteWorkspace,
  onDeleteResource,
}) => {
  const {
    workspaces,
    activeWorkspaceId,
    activeResourceId,
    setActiveWorkspace,
    setActiveResource,
  } = useSessionStore();

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]';
      case 'STARTING':
      case 'CREATING':
        return 'bg-amber-400 animate-pulse';
      case 'ERROR':
        return 'bg-red-400';
      default:
        return 'bg-neutral-600';
    }
  };

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'claude':
        return '🤖';
      case 'shell':
        return '💻';
      case 'git':
        return '📦';
      case 'logs':
        return '📋';
      case 'browser':
        return '🌐';
      default:
        return '⚙️';
    }
  };

  // 折叠状态
  if (isCollapsed) {
    return (
      <div className="w-16 bg-[#16171B] border-r border-neutral-800/60 flex flex-col items-center py-4 h-full transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-10 h-10 rounded-xl bg-[#25262C] hover:bg-[#2D2E36] flex items-center justify-center text-neutral-400 hover:text-neutral-300 transition-all duration-200 mb-4"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => {
                setActiveWorkspace(workspace.id);
                setIsCollapsed(false);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 ${
                activeWorkspaceId === workspace.id
                  ? 'bg-gradient-to-r from-[#53D8FB]/15 to-[#9D4EDD]/15 border border-[#53D8FB]/20'
                  : 'hover:bg-[#25262C]'
              }`}
              title={workspace.name}
            >
              {workspace.icon}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setIsCollapsed(false);
          }}
          className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1C1D22] text-lg font-bold hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-200 mt-4"
          title="New Workspace"
        >
          +
        </button>
      </div>
    );
  }

  // 展开状态
  return (
    <div className="w-72 bg-[#16171B] border-r border-neutral-800/60 flex flex-col h-full transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800/60 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
            AI Workspace
          </h1>
          <p className="text-[11px] text-neutral-500 mt-0.5 font-medium tracking-wider uppercase">
            Terminal Manager
          </p>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-8 h-8 rounded-lg bg-[#25262C] hover:bg-[#2D2E36] flex items-center justify-center text-neutral-500 hover:text-neutral-400 transition-all duration-200"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {workspaces.map((workspace) => (
          <div key={workspace.id}>
            {/* Workspace Header */}
            <div
              className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${
                activeWorkspaceId === workspace.id
                  ? 'bg-[#25262C] border border-neutral-700/50'
                  : 'hover:bg-[#25262C] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveWorkspace(workspace.id)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className="text-xl">{workspace.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-neutral-200 truncate">
                      {workspace.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5 font-mono">
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
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                  title="Delete workspace"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
                        ? 'bg-[#25262C] text-neutral-100 border border-neutral-700/50'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#25262C] border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => setActiveResource(resource.id)}
                      className="flex-1 flex items-center gap-2.5 min-w-0"
                    >
                      <span className="text-sm">{getResourceIcon(resource.type)}</span>
                      <span className="flex-1 truncate font-medium text-left">{resource.name}</span>
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
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                      title="Close terminal"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add Resource Buttons */}
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-neutral-800/40">
                  {(['claude', 'shell', 'git'] as ResourceType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => onCreateResource(workspace.id, type)}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-[#25262C] hover:bg-[#2D2E36] text-neutral-400 hover:text-neutral-300 transition-all duration-200 border border-neutral-800/40 hover:border-neutral-700/50"
                      title={`New ${type}`}
                    >
                      + {getResourceIcon(type)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Workspace */}
      <div className="p-4 border-t border-neutral-800/60">
        {isCreating ? (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Workspace Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#25262C] border border-neutral-800/60 rounded-xl text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/40 focus:border-[#53D8FB]/20 transition-all duration-300"
            />
            <input
              type="text"
              placeholder="/path/to/project"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#25262C] border border-neutral-800/60 rounded-xl text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/40 focus:border-[#53D8FB]/20 transition-all duration-300"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2.5 bg-white text-[#1C1D22] rounded-xl text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2.5 bg-[#25262C] text-neutral-400 rounded-xl text-sm hover:bg-[#2D2E36] transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-4 py-3 bg-white text-[#1C1D22] rounded-xl text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>New Workspace</span>
          </button>
        )}
      </div>
    </div>
  );
};
