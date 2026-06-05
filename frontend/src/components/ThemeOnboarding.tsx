/**
 * AI Workspace OS - Theme Onboarding
 *
 * 首次访问时的主题选择引导。
 * 推荐深空灰和极地白作为默认选项。
 */

import React, { useState, useCallback } from 'react';
import { useThemeStore } from '../themes/useThemeStore';
import { themes, type ThemeDefinition } from '../themes/definitions';
import { Icon } from './Icon';

// 推荐的主题（默认显示）
const RECOMMENDED_IDS = ['deep-space-gray', 'arctic-light'];

export const ThemeOnboarding: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => {
    // 检查是否已经完成引导
    try {
      return !localStorage.getItem('theme-onboarded');
    } catch {
      return true;
    }
  });

  const setTheme = useThemeStore((s) => s.setTheme);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const recommendedThemes = themes.filter(t => RECOMMENDED_IDS.includes(t.id));
  const otherThemes = themes.filter(t => !RECOMMENDED_IDS.includes(t.id));

  const handleConfirm = useCallback(() => {
    if (selectedId) {
      document.documentElement.classList.add('theme-transitioning');
      setTheme(selectedId);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);

      // 标记引导完成
      try {
        localStorage.setItem('theme-onboarded', 'true');
      } catch {
        // ignore
      }

      // 延迟关闭
      setTimeout(() => {
        setIsOpen(false);
      }, 500);
    }
  }, [selectedId, setTheme]);

  const handleThemeSelect = useCallback((id: string) => {
    setSelectedId(id);
    // 实时预览
    document.documentElement.classList.add('theme-transitioning');
    setTheme(id);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
  }, [setTheme]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-theme-bg">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-theme-surface flex items-center justify-center border border-theme-border">
              <Icon name="settings" size={32} className="text-theme-accent" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-theme-text mb-2">
            选择你的主题
          </h1>
          <p className="text-sm text-theme-text-secondary">
            Choose your theme · 选择后可随时在设置中更改
          </p>
        </div>

        {/* 推荐主题 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-theme-text">推荐主题</span>
            <span className="text-[10px] text-theme-text-muted">Recommended</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recommendedThemes.map((theme) => (
              <ThemeOption
                key={theme.id}
                theme={theme}
                isSelected={selectedId === theme.id}
                onSelect={handleThemeSelect}
                isRecommended
              />
            ))}
          </div>
        </div>

        {/* 其他主题 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-theme-text">更多主题</span>
            <span className="text-[10px] text-theme-text-muted">More themes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {otherThemes.map((theme) => (
              <ThemeOption
                key={theme.id}
                theme={theme}
                isSelected={selectedId === theme.id}
                onSelect={handleThemeSelect}
              />
            ))}
          </div>
        </div>

        {/* 确认按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              selectedId
                ? 'bg-theme-text text-theme-bg hover:scale-[1.02] hover-glow cursor-pointer'
                : 'bg-theme-surface-light text-theme-text-muted cursor-not-allowed'
            }`}
          >
            {selectedId ? '确认选择' : '请选择一个主题'}
          </button>
        </div>

        {/* 跳过提示 */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              // 使用默认主题
              setTheme('warp-phenomenon');
              try {
                localStorage.setItem('theme-onboarded', 'true');
              } catch {
                // ignore
              }
              setIsOpen(false);
            }}
            className="text-xs text-theme-text-muted hover:text-theme-text-secondary transition-colors"
          >
            跳过，使用默认主题
          </button>
        </div>
      </div>
    </div>
  );
};

// 主题选项组件
const ThemeOption: React.FC<{
  theme: ThemeDefinition;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isRecommended?: boolean;
}> = ({ theme, isSelected, onSelect, isRecommended }) => {
  const c = theme.colors;

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`relative text-left rounded-xl p-3 transition-all duration-300 border ${
        isSelected
          ? 'border-theme-accent/50 glow-active'
          : 'border-theme-border hover:border-theme-border-strong hover-glow'
      }`}
      style={{ background: c.surface }}
    >
      {/* 推荐标签 */}
      {isRecommended && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-theme-accent/20 text-theme-accent">
          推荐
        </div>
      )}

      {/* 主题色彩预览条 */}
      <div className="flex gap-1 mb-2">
        <div className="w-4 h-4 rounded" style={{ background: c.bg }} />
        <div className="w-4 h-4 rounded" style={{ background: c.surfaceLight }} />
        <div className="w-4 h-4 rounded" style={{ background: c.accentPrimary }} />
        <div className="w-4 h-4 rounded" style={{ background: c.accentSecondary }} />
      </div>

      {/* 主题名称 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{theme.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: c.text }}>
            {theme.nameZh}
          </div>
          <div className="text-[10px] truncate" style={{ color: c.textSecondary }}>
            {theme.name}
          </div>
        </div>
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div
          className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full"
          style={{
            background: c.accentPrimary,
            boxShadow: `0 0 8px ${c.accentPrimary}60`,
          }}
        />
      )}
    </button>
  );
};
