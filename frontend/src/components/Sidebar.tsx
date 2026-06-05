import React, { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { ResourceType, ClientMessage } from '../types';
import { Icon } from './Icon';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  sendMessage: (message: ClientMessage) => void;
  onCreateWorkspace: (name: string, path: string) => void;
  onCreateResource: (workspaceId: string, type: ResourceType) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteResource: (workspaceId: string, resourceId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sendMessage,
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
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                activeWorkspaceId === workspace.id
                  ? 'bg-gradient-to-r from-[#53D8FB]/15 to-[#9D4EDD]/15 border border-[#53D8FB]/20 text-white'
                  : 'hover:bg-[#25262C] text-neutral-400'
              }`}
              title={workspace.name}
            >
              <Icon name={workspace.icon} size={18} />
            </button>
          ))}
        </div>

        {/* 一键创建默认工作空间 */}
        <button
          onClick={() => sendMessage({ type: 'workspace:quick_create' })}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#53D8FB] to-[#9D4EDD] flex items-center justify-center text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(83,216,251,0.3)] transition-all duration-200 mt-4"
          title="Quick Create Workspace"
        >
          <Icon name="zap" size={18} />
        </button>

        {/* 手动创建工作空间 */}
        <button
          onClick={() => {
            setIsCreating(true);
            setIsCollapsed(false);
          }}
          className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1C1D22] hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-200"
          title="New Workspace (Custom)"
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
        <BrandLogo size={32} showText />
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-8 h-8 rounded-lg bg-[#25262C] hover:bg-[#2D2E36] flex items-center justify-center text-neutral-500 hover:text-neutral-400 transition-all duration-200"
          title="Collapse sidebar"
        >
          <Icon name="chevron-left" size={16} />
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
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeWorkspaceId === workspace.id
                      ? 'bg-gradient-to-r from-[#53D8FB]/20 to-[#9D4EDD]/20 text-white'
                      : 'bg-[#25262C] text-neutral-400'
                  }`}>
                    <Icon name={workspace.icon} size={16} />
                  </div>
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
                        ? 'bg-[#25262C] text-neutral-100 border border-neutral-700/50'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#25262C] border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => setActiveResource(resource.id)}
                      className="flex-1 flex items-center gap-2.5 min-w-0"
                    >
                      <Icon name={getResourceIconName(resource.type)} size={14} />
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
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}

                {/* Add Resource Buttons */}
                <div className="space-y-1 mt-2 pt-2 border-t border-neutral-800/40">
                  {([
                    { type: 'claude' as ResourceType, label: 'Claude' },
                    { type: 'shell' as ResourceType, label: 'Shell' },
                    { type: 'git' as ResourceType, label: 'Git' },
                  ]).map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => onCreateResource(workspace.id, type)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 bg-neutral-800/30 hover:bg-neutral-800/60 rounded-md transition-all group/btn"
                      title={`New ${type}`}
                    >
                      <Icon name="plus" size={12} className="text-neutral-500 group-hover/btn:text-neutral-300" />
                      <Icon name={getResourceIconName(type)} size={12} className="text-neutral-500 group-hover/btn:text-neutral-300" />
                      <span className="text-xs text-neutral-400 group-hover/btn:text-neutral-200 ml-0.5">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Workspace */}
      <div className="p-4 border-t border-neutral-800/60 space-y-2">
        {/* 一键创建 + 手动创建 并排 */}
        <div className="flex gap-2">
          <button
            onClick={() => sendMessage({ type: 'workspace:quick_create' })}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#53D8FB] to-[#9D4EDD] text-white rounded-xl text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(83,216,251,0.3)] transition-all duration-300 flex items-center justify-center gap-2"
            title="Quick Create Workspace"
          >
            <Icon name="zap" size={14} />
            <span>Quick</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 px-4 py-2.5 bg-white text-[#1C1D22] rounded-xl text-sm font-semibold hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Icon name="plus" size={14} />
            <span>Custom</span>
          </button>
        </div>

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
        ) : null}
      </div>
    </div>
  );
};
