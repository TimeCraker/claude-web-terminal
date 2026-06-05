import React from 'react';
import { Icon } from './Icon';
import { useThemeStore } from '../themes/useThemeStore';
import { useSessionStore } from '../store/sessionStore';

interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const openSettings = useThemeStore((s) => s.openSettings);
  const { activeWorkspaceId, workspaces } = useSessionStore();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <header className="h-10 flex-shrink-0 bg-theme-surface/80 backdrop-blur-xl border-b border-theme-border/50 flex items-center gap-3 px-3 z-50">
      {/* 侧边栏切换按钮 */}
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 rounded-[6px] flex items-center justify-center text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light transition-all duration-200 hover-glow"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        title={isSidebarOpen ? '折叠侧边栏' : '展开侧边栏'}
      >
        <Icon name={isSidebarOpen ? 'sidebar-open' : 'sidebar-close'} size={18} />
      </button>

      {/* 全局搜索框（半透明圆角） */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-0 rounded-xl bg-theme-surface-light/50 group-hover:bg-theme-surface-light/70 transition-colors" />
          <div className="relative flex items-center gap-2 px-3 py-1.5">
            <Icon name="target" size={14} className="text-theme-text-muted" />
            <span className="text-sm text-theme-text-muted select-none">
              {activeWorkspace ? activeWorkspace.name : 'AI Workspace OS'}
            </span>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-theme-text-muted/60 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-theme-surface-light border border-theme-border text-[10px]">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-theme-surface-light border border-theme-border text-[10px]">K</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* 设置按钮 */}
      <button
        onClick={openSettings}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light transition-all hover-glow"
        aria-label="Settings"
      >
        <Icon name="settings" size={18} />
      </button>
    </header>
  );
};
