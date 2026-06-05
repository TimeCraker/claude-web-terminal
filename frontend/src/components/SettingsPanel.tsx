/**
 * AI Workspace OS - Settings Panel (右侧边栏)
 *
 * 主题卡片选择器 + 字体选择器。
 * 中文标注 + 英文灰色小字注释。
 */

import React, { useCallback } from 'react';
import { useThemeStore, fontOptions, type FontFamily } from '../themes/useThemeStore';
import { themes, type ThemeDefinition } from '../themes/definitions';
import { Icon } from './Icon';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ===== 主题预览卡片 =====
const ThemeCard: React.FC<{
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: (id: string) => void;
}> = ({ theme, isActive, onSelect }) => {
  const c = theme.colors;

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`group relative w-full text-left rounded-xl p-3 transition-all duration-300 border active:scale-[0.98] ${
        isActive
          ? 'border-theme-accent/50 glow-active hover-glow'
          : 'border-theme-border hover:border-theme-border-strong hover-glow'
      }`}
      style={{ background: c.surface }}
    >
      {/* 主题色彩预览条 */}
      <div className="flex gap-1 mb-2">
        <div className="w-5 h-5 rounded" style={{ background: c.bg }} title="背景 Background" />
        <div className="w-5 h-5 rounded" style={{ background: c.surfaceLight }} title="表面 Surface" />
        <div className="w-5 h-5 rounded" style={{ background: c.accentPrimary }} title="主强调 Primary" />
        <div className="w-5 h-5 rounded" style={{ background: c.accentSecondary }} title="次强调 Secondary" />
        <div className="w-5 h-5 rounded" style={{ background: c.success }} title="成功 Success" />
        <div className="w-5 h-5 rounded" style={{ background: c.error }} title="错误 Error" />
      </div>

      {/* 主题名称：中文为主，英文灰色小字 */}
      <div className="flex items-center gap-2">
        <span className="text-base">{theme.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: c.text }}>
              {theme.nameZh}
            </span>
            <span className="text-[10px] truncate" style={{ color: c.textSecondary }}>
              {theme.name}
            </span>
          </div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: c.textSecondary }}>
            {theme.description}
          </div>
        </div>
      </div>

      {/* 激活指示器 */}
      {isActive && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{
            background: c.accentPrimary,
            boxShadow: `0 0 8px ${c.accentPrimary}60`,
          }}
        />
      )}

      {/* 模拟终端预览 */}
      <div
        className="mt-2 rounded-lg p-1.5 font-mono text-[9px] leading-relaxed overflow-hidden"
        style={{ background: c.bg, color: c.text }}
      >
        <div style={{ color: c.textSecondary }}>
          <span style={{ color: c.accentPrimary }}>$</span> claude --theme {theme.id}
        </div>
        <div style={{ color: c.success }}>✓ 主题已应用</div>
      </div>
    </button>
  );
};

// ===== 字体选项 =====
const FontOption: React.FC<{
  id: FontFamily;
  name: string;
  family: string;
  sample: string;
  isActive: boolean;
  onSelect: (id: FontFamily) => void;
}> = ({ id, name, family, sample, isActive, onSelect }) => (
  <button
    onClick={() => onSelect(id)}
    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
      isActive
        ? 'bg-theme-surface-light border-theme-accent/40 shadow-theme-glow'
        : 'bg-theme-surface border-theme-border hover:border-theme-border-strong hover:bg-theme-surface-light hover-glow'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-theme-text">{name}</span>
      {isActive && (
        <div className="w-2 h-2 rounded-full bg-theme-accent shadow-[0_0_6px_var(--theme-glow-primary)]" />
      )}
    </div>
    <div
      className="text-xs text-theme-text-secondary mt-1 font-mono"
      style={{ fontFamily: family }}
    >
      {sample}
    </div>
  </button>
);

// ===== 主组件 =====
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const themeId = useThemeStore((s) => s.themeId);
  const fontId = useThemeStore((s) => s.fontId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setFont = useThemeStore((s) => s.setFont);

  // 主题切换时添加过渡动画
  const handleThemeChange = useCallback(
    (id: string) => {
      document.documentElement.classList.add('theme-transitioning');
      setTheme(id);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
      // 延迟关闭面板，让用户看到主题切换效果
      setTimeout(() => {
        onClose();
      }, 500);
    },
    [setTheme, onClose]
  );

  // 字体切换后关闭面板
  const handleFontChange = useCallback(
    (id: FontFamily) => {
      setFont(id);
      setTimeout(() => {
        onClose();
      }, 300);
    },
    [setFont, onClose]
  );

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 设置面板 - 右侧边栏 */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-[95] w-80 max-w-[85vw]
          bg-theme-surface border-l border-theme-border flex flex-col h-full
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-surface-light flex items-center justify-center">
              <Icon name="settings" size={16} className="text-theme-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text">设置</h2>
              <p className="text-[10px] text-theme-text-muted">Customize your workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-theme-surface-light hover:bg-theme-surface-elevated flex items-center justify-center text-theme-text-muted hover:text-theme-text transition-all duration-200"
            title="关闭设置"
          >
            <Icon name="sidebar-open" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* ===== 主题选择 ===== */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-theme-text">主题</span>
              <span className="text-[10px] text-theme-text-muted">Theme</span>
              <span className="text-[10px] text-theme-text-muted px-2 py-0.5 rounded-full bg-theme-surface-light ml-auto">
                {themes.length} 个预设
              </span>
            </div>
            <div className="space-y-2">
              {themes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={themeId === theme.id}
                  onSelect={handleThemeChange}
                />
              ))}
            </div>
          </section>

          {/* ===== 字体选择 ===== */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-theme-text">终端字体</span>
              <span className="text-[10px] text-theme-text-muted">Terminal Font</span>
            </div>
            <div className="space-y-2">
              {fontOptions.map((font) => (
                <FontOption
                  key={font.id}
                  id={font.id}
                  name={font.name}
                  family={font.family}
                  sample={font.sample}
                  isActive={fontId === font.id}
                  onSelect={handleFontChange}
                />
              ))}
            </div>
          </section>

          {/* ===== 底部信息 ===== */}
          <section className="text-center pt-4 border-t border-theme-border">
            <p className="text-[10px] text-theme-text-muted">
              AI Workspace OS · 设置自动保存到本地
            </p>
            <p className="text-[10px] text-theme-text-muted mt-1">
              Settings saved locally
            </p>
          </section>
        </div>
      </aside>
    </>
  );
};
