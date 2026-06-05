/**
 * AI Workspace OS - Theme Definitions
 *
 * 6 个预设主题，每个包含：
 * - UI 颜色 token（CSS 变量）
 * - xterm.js 终端配色
 * - 元数据（名称、描述、图标）
 */

export interface ThemeColors {
  // 背景层级
  bg: string;
  surface: string;
  surfaceLight: string;
  surfaceElevated: string;

  // 边框
  border: string;
  borderStrong: string;

  // 文字
  text: string;
  textSecondary: string;
  textMuted: string;

  // 强调色
  accentPrimary: string;
  accentSecondary: string;

  // 语义色
  success: string;
  warning: string;
  error: string;

  // 特殊效果
  glowPrimary: string;
  glowSecondary: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface XtermTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;        // 英文名
  nameZh: string;      // 中文名
  description: string;  // 英文描述（灰色小字）
  icon: string; // emoji
  isDark: boolean;
  colors: ThemeColors;
  xterm: XtermTheme;
}

// ============================================================
// Theme 1: Warp Phenomenon（当前默认 - 暗蓝紫）
// ============================================================
const warpPhenomenon: ThemeDefinition = {
  id: 'warp-phenomenon',
  name: 'Warp Phenomenon',
  nameZh: '深空蓝紫',
  description: 'Deep space blue-purple. The original default.',
  icon: '🌌',
  isDark: true,
  colors: {
    bg: '#1C1D22',
    surface: '#16171B',
    surfaceLight: '#25262C',
    surfaceElevated: '#2D2E36',
    border: '#2C2E35',
    borderStrong: '#3A3C44',
    text: '#E4E6EB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    accentPrimary: '#53D8FB',
    accentSecondary: '#9D4EDD',
    success: '#A8E6CF',
    warning: '#FFD3B6',
    error: '#FF6B6B',
    glowPrimary: 'rgba(83, 216, 251, 0.15)',
    glowSecondary: 'rgba(157, 78, 221, 0.15)',
    gradientFrom: '#53D8FB',
    gradientTo: '#9D4EDD',
  },
  xterm: {
    background: '#1C1D22',
    foreground: '#E4E6EB',
    cursor: '#53D8FB',
    cursorAccent: '#1C1D22',
    selectionBackground: 'rgba(83, 216, 251, 0.2)',
    selectionForeground: '#ffffff',
    black: '#1C1D22',
    red: '#FF6B6B',
    green: '#A8E6CF',
    yellow: '#FFD3B6',
    blue: '#53D8FB',
    magenta: '#9D4EDD',
    cyan: '#53D8FB',
    white: '#E4E6EB',
    brightBlack: '#6B7280',
    brightRed: '#FF8A8A',
    brightGreen: '#C4F0DB',
    brightYellow: '#FFE4CC',
    brightBlue: '#7EE3FC',
    brightMagenta: '#B97DF0',
    brightCyan: '#7EE3FC',
    brightWhite: '#FFFFFF',
  },
};

// ============================================================
// Theme 2: Deep Space Gray（朋友推荐 - 暖橙极简）
// ============================================================
const deepSpaceGray: ThemeDefinition = {
  id: 'deep-space-gray',
  name: 'Deep Space Gray',
  nameZh: '深空灰',
  description: 'Warm orange accents on carbon black. Minimal & cozy.',
  icon: '🪐',
  isDark: true,
  colors: {
    bg: '#1A1A1E',
    surface: '#141416',
    surfaceLight: '#26262B',
    surfaceElevated: '#2E2E33',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',
    text: '#E4E4E7',
    textSecondary: '#71717A',
    textMuted: '#52525B',
    accentPrimary: '#FF6B4A',
    accentSecondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    glowPrimary: 'rgba(255, 107, 74, 0.15)',
    glowSecondary: 'rgba(139, 92, 246, 0.15)',
    gradientFrom: '#FFFFFF',
    gradientTo: '#E4E4E7',
  },
  xterm: {
    background: '#1A1A1E',
    foreground: '#E4E4E7',
    cursor: '#FF6B4A',
    cursorAccent: '#1A1A1E',
    selectionBackground: 'rgba(255, 107, 74, 0.2)',
    selectionForeground: '#ffffff',
    black: '#1A1A1E',
    red: '#EF4444',
    green: '#10B981',
    yellow: '#F59E0B',
    blue: '#3B82F6',
    magenta: '#8B5CF6',
    cyan: '#06B6D4',
    white: '#E4E4E7',
    brightBlack: '#71717A',
    brightRed: '#F87171',
    brightGreen: '#34D399',
    brightYellow: '#FBBF24',
    brightBlue: '#60A5FA',
    brightMagenta: '#A78BFA',
    brightCyan: '#22D3EE',
    brightWhite: '#FFFFFF',
  },
};

// ============================================================
// Theme 3: Arctic Light（明亮极简）
// ============================================================
const arcticLight: ThemeDefinition = {
  id: 'arctic-light',
  name: 'Arctic Light',
  nameZh: '极地白',
  description: 'Clean white canvas with indigo accents. Easy on the eyes.',
  icon: '❄️',
  isDark: false,
  colors: {
    bg: '#FFFFFF',
    surface: '#F4F4F6',
    surfaceLight: '#E5E7EB',
    surfaceElevated: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.15)',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    accentPrimary: '#111827',
    accentSecondary: '#374151',
    success: '#10B981',
    warning: '#EAB308',
    error: '#EF4444',
    glowPrimary: 'rgba(0, 0, 0, 0.08)',
    glowSecondary: 'rgba(0, 0, 0, 0.05)',
    gradientFrom: '#111827',
    gradientTo: '#374151',
  },
  xterm: {
    background: '#FAFAFA',
    foreground: '#111827',
    cursor: '#111827',
    cursorAccent: '#FFFFFF',
    selectionBackground: 'rgba(99, 102, 241, 0.15)',
    selectionForeground: '#111827',
    black: '#111827',
    red: '#EF4444',
    green: '#10B981',
    yellow: '#EAB308',
    blue: '#6366F1',
    magenta: '#A855F7',
    cyan: '#06B6D4',
    white: '#F9FAFB',
    brightBlack: '#6B7280',
    brightRed: '#F87171',
    brightGreen: '#34D399',
    brightYellow: '#FBBF24',
    brightBlue: '#818CF8',
    brightMagenta: '#C084FC',
    brightCyan: '#22D3EE',
    brightWhite: '#FFFFFF',
  },
};

// ============================================================
// Theme 4: Cyber Geek（赛博终端 - 全黑荧光）
// ============================================================
const cyberGeek: ThemeDefinition = {
  id: 'cyber-geek',
  name: 'Cyber Geek',
  nameZh: '赛博终端',
  description: 'Abyss black with electric cyan. Retro terminal reimagined.',
  icon: '💚',
  isDark: true,
  colors: {
    bg: '#0A0A0C',
    surface: '#08080A',
    surfaceLight: '#141418',
    surfaceElevated: '#1A1A1F',
    border: 'rgba(6,182,212,0.15)',
    borderStrong: 'rgba(6,182,212,0.3)',
    text: '#06B6D4',
    textSecondary: '#0E7490',
    textMuted: '#164E63',
    accentPrimary: '#06B6D4',
    accentSecondary: '#34D399',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F43F5E',
    glowPrimary: 'rgba(6, 182, 212, 0.2)',
    glowSecondary: 'rgba(52, 211, 153, 0.2)',
    gradientFrom: '#06B6D4',
    gradientTo: '#34D399',
  },
  xterm: {
    background: '#0A0A0C',
    foreground: '#06B6D4',
    cursor: '#34D399',
    cursorAccent: '#0A0A0C',
    selectionBackground: 'rgba(6, 182, 212, 0.2)',
    selectionForeground: '#FFFFFF',
    black: '#0A0A0C',
    red: '#F43F5E',
    green: '#34D399',
    yellow: '#FBBF24',
    blue: '#06B6D4',
    magenta: '#A78BFA',
    cyan: '#06B6D4',
    white: '#CFFAFE',
    brightBlack: '#164E63',
    brightRed: '#FB7185',
    brightGreen: '#6EE7B7',
    brightYellow: '#FDE68A',
    brightBlue: '#22D3EE',
    brightMagenta: '#C4B5FD',
    brightCyan: '#67E8F9',
    brightWhite: '#ECFEFF',
  },
};

// ============================================================
// Theme 5: Linear Dark（薰衣草深空）
// ============================================================
const linearDark: ThemeDefinition = {
  id: 'linear-dark',
  name: 'Linear Dark',
  nameZh: '薰衣草深空',
  description: 'Near-black luxury with lavender-blue accent. Quietly premium.',
  icon: '🔮',
  isDark: true,
  colors: {
    bg: '#010102',
    surface: '#0F1011',
    surfaceLight: '#18191A',
    surfaceElevated: '#1F2023',
    border: '#23252A',
    borderStrong: '#34343A',
    text: '#F7F8F8',
    textSecondary: '#8A8F98',
    textMuted: '#62666D',
    accentPrimary: '#5E6AD2',
    accentSecondary: '#7A7FAD',
    success: '#27A644',
    warning: '#EAB308',
    error: '#EF4444',
    glowPrimary: 'rgba(94, 106, 210, 0.15)',
    glowSecondary: 'rgba(122, 127, 173, 0.15)',
    gradientFrom: '#5E6AD2',
    gradientTo: '#7A7FAD',
  },
  xterm: {
    background: '#010102',
    foreground: '#F7F8F8',
    cursor: '#5E6AD2',
    cursorAccent: '#010102',
    selectionBackground: 'rgba(94, 106, 210, 0.2)',
    selectionForeground: '#FFFFFF',
    black: '#010102',
    red: '#EF4444',
    green: '#27A644',
    yellow: '#EAB308',
    blue: '#5E6AD2',
    magenta: '#A78BFA',
    cyan: '#22D3EE',
    white: '#F7F8F8',
    brightBlack: '#62666D',
    brightRed: '#F87171',
    brightGreen: '#4ADE80',
    brightYellow: '#FBBF24',
    brightBlue: '#818CF8',
    brightMagenta: '#C4B5FD',
    brightCyan: '#67E8F9',
    brightWhite: '#FFFFFF',
  },
};

// ============================================================
// Theme 6: Sunset Warm（暖色琥珀）
// ============================================================
const sunsetWarm: ThemeDefinition = {
  id: 'sunset-warm',
  name: 'Sunset Warm',
  nameZh: '暮色琥珀',
  description: 'Amber & rose on warm charcoal. Cozy late-night vibes.',
  icon: '🌅',
  isDark: true,
  colors: {
    bg: '#1A1614',
    surface: '#15120F',
    surfaceLight: '#2A2420',
    surfaceElevated: '#332C27',
    border: 'rgba(245,158,11,0.12)',
    borderStrong: 'rgba(245,158,11,0.25)',
    text: '#F5E6D3',
    textSecondary: '#A89585',
    textMuted: '#7A6B5E',
    accentPrimary: '#D4856A',
    accentSecondary: '#C07A5E',
    success: '#22C55E',
    warning: '#D4A574',
    error: '#EF4444',
    glowPrimary: 'rgba(212, 133, 106, 0.12)',
    glowSecondary: 'rgba(192, 122, 94, 0.12)',
    gradientFrom: '#D4856A',
    gradientTo: '#C07A5E',
  },
  xterm: {
    background: '#1A1614',
    foreground: '#F5E6D3',
    cursor: '#D4856A',
    cursorAccent: '#1A1614',
    selectionBackground: 'rgba(245, 158, 11, 0.2)',
    selectionForeground: '#FFFFFF',
    black: '#1A1614',
    red: '#EF4444',
    green: '#22C55E',
    yellow: '#F59E0B',
    blue: '#3B82F6',
    magenta: '#E11D48',
    cyan: '#06B6D4',
    white: '#F5E6D3',
    brightBlack: '#7A6B5E',
    brightRed: '#F87171',
    brightGreen: '#4ADE80',
    brightYellow: '#FDE68A',
    brightBlue: '#60A5FA',
    brightMagenta: '#FB7185',
    brightCyan: '#22D3EE',
    brightWhite: '#FFF7ED',
  },
};

// ============================================================
// Export
// ============================================================
export const themes: ThemeDefinition[] = [
  warpPhenomenon,
  deepSpaceGray,
  arcticLight,
  cyberGeek,
  linearDark,
  sunsetWarm,
];

export const DEFAULT_THEME_ID = 'warp-phenomenon';

export function getThemeById(id: string): ThemeDefinition {
  return themes.find((t) => t.id === id) ?? warpPhenomenon;
}
