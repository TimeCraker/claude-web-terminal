/**
 * AI Workspace OS - Settings Modal
 *
 * 主题卡片选择器 + 字体选择器。
 * 设计参考朋友建议：无边框、色差分隔、胶囊按钮。
 */

import React, { useCallback } from 'react';
import { useThemeStore, fontOptions, type FontFamily } from '../themes/useThemeStore';
import { themes, type ThemeDefinition } from '../themes/definitions';
import { Icon } from './Icon';

interface SettingsModalProps {
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
      className={`group relative w-full text-left rounded-xl p-4 transition-all duration-300 border ${
        isActive
          ? 'border-theme-accent/50 shadow-theme-glow scale-[1.02]'
          : 'border-theme-border hover:border-theme-border-strong hover:scale-[1.01]'
      }`}
      style={{ background: c.surface }}
    >
      {/* 主题色彩预览条 */}
      <div className="flex gap-1.5 mb-3">
        <div className="w-6 h-6 rounded-md" style={{ background: c.bg }} title="Background" />
        <div className="w-6 h-6 rounded-md" style={{ background: c.surfaceLight }} title="Surface" />
        <div className="w-6 h-6 rounded-md" style={{ background: c.accentPrimary }} title="Accent" />
        <div className="w-6 h-6 rounded-md" style={{ background: c.accentSecondary }} title="Secondary" />
        <div className="w-6 h-6 rounded-md" style={{ background: c.success }} title="Success" />
        <div className="w-6 h-6 rounded-md" style={{ background: c.error }} title="Error" />
      </div>

      {/* 主题名称 */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{theme.icon}</span>
        <div>
          <div className="text-sm font-semibold" style={{ color: c.text }}>
            {theme.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: c.textSecondary }}>
            {theme.description}
          </div>
        </div>
      </div>

      {/* 激活指示器 */}
      {isActive && (
        <div
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
          style={{
            background: c.accentPrimary,
            boxShadow: `0 0 8px ${c.accentPrimary}60`,
          }}
        />
      )}

      {/* 模拟终端预览 */}
      <div
        className="mt-3 rounded-lg p-2 font-mono text-[10px] leading-relaxed overflow-hidden"
        style={{ background: c.bg, color: c.text }}
      >
        <div style={{ color: c.textSecondary }}>
          <span style={{ color: c.accentPrimary }}>$</span> claude --theme {theme.id}
        </div>
        <div style={{ color: c.success }}>✓ Theme applied successfully</div>
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
    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 border ${
      isActive
        ? 'bg-theme-surface-light border-theme-accent/40 shadow-theme-glow'
        : 'bg-theme-surface border-theme-border hover:border-theme-border-strong hover:bg-theme-surface-light'
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
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
    },
    [setTheme]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden pointer-events-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-theme-surface-light flex items-center justify-center">
                <Icon name="settings" size={16} className="text-theme-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-theme-text">Settings</h2>
                <p className="text-xs text-theme-text-muted">Customize your workspace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-theme-surface-light hover:bg-theme-surface-elevated flex items-center justify-center text-theme-text-muted hover:text-theme-text transition-all"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
            {/* ===== Theme Section ===== */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-theme-text">Theme</span>
                <span className="text-[11px] text-theme-text-muted px-2 py-0.5 rounded-full bg-theme-surface-light">
                  {themes.length} presets
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* ===== Font Section ===== */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-theme-text">Terminal Font</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fontOptions.map((font) => (
                  <FontOption
                    key={font.id}
                    id={font.id}
                    name={font.name}
                    family={font.family}
                    sample={font.sample}
                    isActive={fontId === font.id}
                    onSelect={setFont}
                  />
                ))}
              </div>
            </section>

            {/* ===== Info Section ===== */}
            <section className="text-center pt-4 border-t border-theme-border">
              <p className="text-xs text-theme-text-muted">
                AI Workspace OS · Theme settings are saved locally
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};
