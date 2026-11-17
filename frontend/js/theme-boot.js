// Runs before first paint to avoid a flash of the wrong theme (classic script, not a module).
(function () {
  var pref = 'system';
  try { pref = localStorage.getItem('nexaro-theme') || 'system'; } catch (e) { /* ignore */ }
  var theme = pref === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : pref;
  document.documentElement.setAttribute('data-theme', theme);
})();
