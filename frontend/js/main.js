import { api, setCsrf } from './api.js';
import { applyTheme, toggleTheme } from './theme.js';
import { clear, h, icon, refreshIcons } from './ui/dom.js';
import { toast } from './ui/components.js';
import { renderAuth } from './views/auth.js';
import { renderOverview } from './views/overview.js';
import { renderProjects } from './views/projects.js';
import { renderProjectDetail } from './views/project-detail.js';
import { renderRepositories } from './views/repositories.js';
import { renderTechnologies } from './views/technologies.js';
import { renderPortfolioAdmin } from './views/portfolio-admin.js';
import { renderSettings } from './views/settings.js';
import { renderPlaceholder } from './views/placeholder.js';

export const state = { user: null };

const NAV = [
  { path: 'overview', label: 'Overview', icon: 'layout-dashboard', render: renderOverview },
  { path: 'projects', label: 'Mis proyectos', icon: 'folder-kanban', render: renderProjects },
  { path: 'repositories', label: 'Repositorios', icon: 'github', render: renderRepositories },
  { path: 'technologies', label: 'Tecnologías', icon: 'cpu', render: renderTechnologies },
  { path: 'development', label: 'Desarrollo', icon: 'kanban-square', phase: 10 },
  { path: 'documentation', label: 'Documentación', icon: 'book-open', phase: 11 },
  { path: 'ai', label: 'AI Analyst', icon: 'sparkles', phase: 7 },
  { path: 'workspace', label: 'Claude Code Workspace', icon: 'terminal-square', phase: 8 },
  { path: 'analytics', label: 'Analytics', icon: 'bar-chart-3', phase: 9 },
  { path: 'portfolio', label: 'Portfolio', icon: 'globe', render: renderPortfolioAdmin },
  { path: 'settings', label: 'Ajustes', icon: 'settings', render: renderSettings },
];

const COLLAPSE_KEY = 'nexaro-sidebar-collapsed';
let shell = null;

function buildShell() {
  const root = document.getElementById('root');
  let collapsed = false;
  try { collapsed = localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { /* ignore */ }

  const navLinks = NAV.map((n) => h('li', {},
    h('a', { href: `#/${n.path}`, dataset: { path: n.path }, title: n.label },
      icon(n.icon), h('span', { class: 'nav-label' }, n.label), n.phase && h('span', { class: 'soon' }, `F${n.phase}`))));

  const content = h('main', { class: 'content', id: 'content', tabindex: '-1' });
  const crumbs = h('div', { class: 'crumbs' });
  const app = h('div', { class: `app ${collapsed ? 'is-collapsed' : ''}` });

  const closeMobile = () => { app.classList.remove('nav-open'); backdrop.hidden = true; };
  const backdrop = h('div', { class: 'backdrop', hidden: true, onclick: closeMobile });

  const collapseBtn = h('button', {
    class: 'btn btn-ghost btn-icon desktop-only', 'aria-label': 'Contraer o expandir barra lateral', 'aria-expanded': String(!collapsed),
    onclick: () => {
      const c = app.classList.toggle('is-collapsed');
      collapseBtn.setAttribute('aria-expanded', String(!c));
      try { localStorage.setItem(COLLAPSE_KEY, c ? '1' : '0'); } catch { /* ignore */ }
    },
  }, icon('panel-left'));
  const menuBtn = h('button', {
    class: 'btn btn-ghost btn-icon mobile-only', 'aria-label': 'Abrir menú',
    onclick: () => { app.classList.add('nav-open'); backdrop.hidden = false; },
  }, icon('menu'));

  const themeBtn = h('button', { class: 'btn btn-ghost btn-icon', 'aria-label': 'Cambiar tema claro/oscuro', onclick: () => { toggleTheme(); } }, icon('sun-moon'));

  const logoutBtn = h('button', {
    class: 'btn btn-ghost btn-sm', onclick: async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      state.user = null; setCsrf(null); shell = null; boot();
    },
  }, icon('log-out'), h('span', { class: 'nav-label' }, 'Salir'));

  const sidebar = h('nav', { class: 'sidebar', 'aria-label': 'Navegación principal' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, 'N'),
      h('span', { class: 'brand-text' }, 'NEXARO', h('small', {}, 'Projects Hub'))),
    h('ul', { class: 'nav', onclick: (e) => { if (e.target.closest('a')) closeMobile(); } }, navLinks),
    h('div', { class: 'sidebar-footer' },
      h('div', { class: 'xs faint nav-label truncate', style: 'padding:0 8px 8px' }, state.user.email),
      logoutBtn));

  append(app, sidebar, backdrop,
    h('div', { class: 'main' },
      h('header', { class: 'topbar' }, menuBtn, collapseBtn, crumbs, h('div', { class: 'spacer' }),
        h('a', { class: 'btn btn-ghost btn-sm desktop-only', href: 'portfolio.html', target: '_blank', rel: 'noopener' }, icon('external-link'), 'Portfolio público'),
        themeBtn),
      content));
  clear(root).append(app);
  shell = { content, crumbs, navLinks: sidebar.querySelectorAll('.nav a') };
}

function append(parent, ...kids) { kids.forEach((k) => parent.append(k)); }

async function route() {
  if (!state.user) return;
  if (!shell) buildShell();
  const raw = window.location.hash.replace(/^#\/?/, '') || 'overview';
  const [pathPart, qs] = raw.split('?');
  const [section, id] = pathPart.split('/');
  const nav = NAV.find((n) => n.path === section) || NAV[0];
  shell.navLinks.forEach((a) => (a.dataset.path === nav.path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  clear(shell.crumbs).append(nav.label);
  document.title = `${nav.label} · NEXARO Projects Hub`;
  const ctx = { container: clear(shell.content), crumbs: shell.crumbs, user: state.user, query: new URLSearchParams(qs || '') };
  try {
    if (nav.path === 'projects' && id) await renderProjectDetail(ctx, Number(id));
    else if (nav.render) await nav.render(ctx);
    else renderPlaceholder(ctx, nav);
  } catch (err) {
    console.error(err);
    toast(err.message || 'Error inesperado', 'error');
  }
  refreshIcons(shell.content);
  refreshIcons(document.querySelector('.sidebar'));
  refreshIcons(document.querySelector('.topbar'));
}

export async function boot() {
  applyTheme();
  try {
    const me = await api('/auth/me');
    state.user = me.user;
    setCsrf(me.csrf_token);
    shell = null;
    await route();
  } catch {
    state.user = null;
    await renderAuth(document.getElementById('root'), (session) => {
      state.user = session.user;
      setCsrf(session.csrf_token);
      shell = null;
      if (!window.location.hash) window.location.hash = '#/overview';
      route();
    });
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('auth:expired', () => {
  if (state.user) { toast('La sesión ha caducado. Vuelve a iniciar sesión.', 'error'); state.user = null; shell = null; boot(); }
});
window.addEventListener('DOMContentLoaded', boot);
