/**
 * AI Workspace OS - Theme Store
 *
 * Zustand store for theme state with localStorage persistence.
 * Stores: current theme ID, font preference.
 */

import { create } from 'zustand';
import { themes, DEFAULT_THEME_ID, getThemeById, type ThemeDefinition } from './definitions';

export type FontFamily = 'jetbrains' | 'fira-code' | 'cascadia' | 'source-code';

interface FontOption {
  id: FontFamily;
  name: string;
  family: string;
  sample: string;
}

export const fontOptions: FontOption[] = [
  {
    id: 'jetbrains',
    name: 'JetBrains Mono',
    family: "'JetBrains Mono', monospace",
    sample: 'const x = () => {}',
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    family: "'Fira Code', monospace",
    sample: 'const x = () => {}',
  },
  {
    id: 'cascadia',
    name: 'Cascadia Code',
    family: "'Cascadia Code', monospace",
    sample: 'const x = () => {}',
  },
  {
    id: 'source-code',
    name: 'Source Code Pro',
    family: "'Source Code Pro', monospace",
    sample: 'const x = () => {}',
  },
];

interface ThemeStore {
  themeId: string;
  fontId: FontFamily;
  isSettingsOpen: boolean;

  // Actions
  setTheme: (id: string) => void;
  setFont: (id: FontFamily) => void;
  toggleSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;

  // Getters
  getTheme: () => ThemeDefinition;
  getFont: () => FontOption;
}

const STORAGE_KEY = 'ai-workspace-theme';
const FONT_STORAGE_KEY = 'ai-workspace-font';

function loadThemeId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && themes.some((t) => t.id === saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_THEME_ID;
}

function loadFontId(): FontFamily {
  try {
    const saved = localStorage.getItem(FONT_STORAGE_KEY) as FontFamily;
    if (saved && fontOptions.some((f) => f.id === saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  return 'jetbrains';
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themeId: loadThemeId(),
  fontId: loadFontId(),
  isSettingsOpen: false,

  setTheme: (id: string) => {
    set({ themeId: id });
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  },

  setFont: (id: FontFamily) => {
    set({ fontId: id });
    try {
      localStorage.setItem(FONT_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  },

  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  getTheme: () => getThemeById(get().themeId),
  getFont: () => fontOptions.find((f) => f.id === get().fontId) ?? fontOptions[0],
}));
