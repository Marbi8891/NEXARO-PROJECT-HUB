const KEY = 'nexaro-theme';

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getThemePref() {
  try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; }
}

export function applyTheme(pref = getThemePref()) {
  const theme = pref === 'system' ? systemTheme() : pref;
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent('theme:change', { detail: theme }));
  return theme;
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* storage blocked */ }
  return applyTheme(pref);
}

export function toggleTheme() {
  return setThemePref(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (getThemePref() === 'system') applyTheme('system');
});
