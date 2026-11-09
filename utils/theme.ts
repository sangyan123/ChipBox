export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'chipbox_theme';

export const getThemeChoice = (): ThemeChoice => {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
};

export const applyTheme = () => {
  const c = getThemeChoice();
  const dark = c === 'dark' || (c === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
};

export const setThemeChoice = (c: ThemeChoice) => {
  localStorage.setItem(KEY, c);
  applyTheme();
};

export const initTheme = () => {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemeChoice() === 'system') applyTheme();
  });
};
