/**
 * AI Workspace OS - Theme Provider
 *
 * Injects CSS custom properties into :root based on the current theme.
 * Also manages font family on the document.
 *
 * Usage: wrap your app with <ThemeProvider> in main.tsx.
 */

import { useEffect } from 'react';
import { useThemeStore } from './useThemeStore';
import type { ThemeColors } from './definitions';

/**
 * Map ThemeColors to CSS custom property assignments.
 * All vars are prefixed with --theme-.
 */
function colorsToVars(colors: ThemeColors): Record<string, string> {
  return {
    '--theme-bg': colors.bg,
    '--theme-surface': colors.surface,
    '--theme-surface-light': colors.surfaceLight,
    '--theme-surface-elevated': colors.surfaceElevated,
    '--theme-border': colors.border,
    '--theme-border-strong': colors.borderStrong,
    '--theme-text': colors.text,
    '--theme-text-secondary': colors.textSecondary,
    '--theme-text-muted': colors.textMuted,
    '--theme-accent-primary': colors.accentPrimary,
    '--theme-accent-secondary': colors.accentSecondary,
    '--theme-success': colors.success,
    '--theme-warning': colors.warning,
    '--theme-error': colors.error,
    '--theme-glow-primary': colors.glowPrimary,
    '--theme-glow-secondary': colors.glowSecondary,
    '--theme-gradient-from': colors.gradientFrom,
    '--theme-gradient-to': colors.gradientTo,
  };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeId = useThemeStore((s) => s.themeId);
  const fontId = useThemeStore((s) => s.fontId);
  const getTheme = useThemeStore((s) => s.getTheme);
  const getFont = useThemeStore((s) => s.getFont);

  useEffect(() => {
    const theme = getTheme();
    const root = document.documentElement;

    // Inject CSS variables
    const vars = colorsToVars(theme.colors);
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set data-theme for conditional styling
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-dark', theme.isDark ? 'true' : 'false');

    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme.colors.surface);
    }
  }, [themeId, getTheme]);

  useEffect(() => {
    const font = getFont();
    document.documentElement.style.setProperty('--theme-font-mono', font.family);
  }, [fontId, getFont]);

  return <>{children}</>;
};
