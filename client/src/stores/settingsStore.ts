import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  aiMode: 'cloud' | 'local' | 'hybrid';
  sidebarCollapsed: boolean;

  setTheme: (theme: Theme) => void;
  setAIMode: (mode: 'cloud' | 'local' | 'hybrid') => void;
  toggleSidebar: () => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      aiMode: 'cloud',
      sidebarCollapsed: false,

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      setAIMode: (aiMode) => set({ aiMode }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      getEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    { name: 'aura-settings' }
  )
);

function applyTheme(theme: Theme) {
  const effective =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  document.documentElement.setAttribute('data-theme', effective);
  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
}

// Apply theme on load
const savedTheme = JSON.parse(localStorage.getItem('aura-settings') || '{}')?.state?.theme || 'dark';
applyTheme(savedTheme);
