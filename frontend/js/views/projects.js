import { api } from '../api.js';
import { CATEGORY, PRIORITY, STATUS, options } from '../labels.js';
import { clear, h, icon, refreshIcons, safeUrl, timeAgo } from '../ui/dom.js';
import { badge, categoryBadge, emptyState, errorState, priorityBadge, selectEl, skeleton, statusBadge } from '../ui/components.js';
import { openProjectForm } from './project-form.js';

const VIEW_KEY = 'nexaro-projects-view';

export async function renderProjects(ctx) {
  const { container, query } = ctx;
  const filters = { q: '', category: '', status: '', priority: '', sort: 'updated' };
  let view = 'grid';
  try { view = localStorage.getItem(VIEW_KEY) || 'grid'; } catch { /* ignore */ }

  const newBtn = h('button', { class: 'btn btn-primary', onclick: async () => { if (await openProjectForm()) load(); } }, icon('plus'), 'Nuevo proyecto');
  container.append(h('div', { class: 'page-header' },
    h('div', {}, h('h1', {}, 'Mis proyectos'), h('p', { class: 'muted', id: 'project-count' }, ' ')),
    h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/repositories' }, icon('github'), 'Importar de GitHub'), newBtn)));

  const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar por nombre o descripción…', 'aria-label': 'Buscar proyectos' });
  const category = selectEl(options(CATEGORY, { withEmpty: 'Todas las categorías' }), '', { 'aria-label': 'Filtrar por categoría' });
  const status = selectEl([['', 'Todos los estados'], ['pending', 'Pendiente de verificar'], ...options(STATUS)], '', { 'aria-label': 'Filtrar por estado' });
  const priority = selectEl(options(PRIORITY, { withEmpty: 'Cualquier prioridad' }), '', { 'aria-label': 'Filtrar por prioridad' });
  const sort = selectEl([['updated', 'Última actualización'], ['created', 'Fecha de creación'], ['name', 'Nombre'], ['priority', 'Prioridad']], 'updated', { 'aria-label': 'Ordenar por' });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Vista' },
    h('button', { 'aria-pressed': String(view === 'grid'), 'aria-label': 'Vista en tarjetas', onclick: () => setView('grid') }, icon('layout-grid', { style: 'width:14px;height:14px' })),
    h('button', { 'aria-pressed': String(view === 'table'), 'aria-label': 'Vista en tabla', onclick: () => setView('table') }, icon('list', { style: 'width:14px;height:14px' })));

  container.append(h('div', { class: 'toolbar', role: 'search' },
    h('div', { class: 'search' }, icon('search'), search), category, status, priority, sort, seg));
  const results = h('div', {});
  container.append(results);

  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { filters.q = search.value.trim(); load(); }, 250); });
  [[category, 'category'], [status, 'status'], [priority, 'priority'], [sort, 'sort']].forEach(([el, k]) =>
    el.addEventListener('change', () => { filters[k] = el.value; load(); }));

  function setView(v) {
    view = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
    seg.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === (v === 'grid'))));
    load();
  }

  let seq = 0;
  async function load() {
    const my = ++seq;
    clear(results).append(skeleton(6, 'grid grid-cards'));
    let data;
    try { data = await api('/projects', { query: { ...filters, limit: 500 } }); } catch (err) {
      clear(results).append(errorState(err, load)); return;
    }
    if (my !== seq) return;
    document.getElementById('project-count').textContent = `${data.total} proyecto(s)`;
    clear(results);
    const filtered = Object.entries(filters).some(([k, v]) => k !== 'sort' && v);
    if (!data.items.length) {
      results.append(h('div', { class: 'card' }, filtered
        ? emptyState({ iconName: 'search-x', title: 'Sin resultados', text: 'Ningún proyecto coincide con los filtros.' })
        : emptyState({ iconName: 'folder-plus', title: 'Aún no hay proyectos', text: 'Crea uno manualmente o impórtalo desde GitHub.', action: h('button', { class: 'btn btn-primary', onclick: () => newBtn.click() }, 'Crear proyecto') })));
    } else if (view === 'table') {
      results.append(table(data.items));
    } else {
      results.append(h('div', { class: 'grid grid-cards' }, data.items.map(card)));
    }
    refreshIcons(results);
  }

  await load();
  if (query?.get('new')) { history.replaceState(null, '', '#/projects'); newBtn.click(); }
}

function avatar(p) {
  const src = safeUrl(p.cover_url);
  return h('div', { class: 'avatar', 'aria-hidden': 'true' }, src ? h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : p.name.slice(0, 1).toUpperCase());
}

function card(p) {
  return h('a', { class: 'card card-link project-card', href: `#/projects/${p.id}` },
    h('div', { class: 'card-body' },
      h('div', { class: 'row', style: 'flex-wrap:nowrap' }, avatar(p),
        h('div', { style: 'min-width:0;flex:1' }, h('h3', { class: 'truncate', style: 'font-size:15px' }, p.name),
          h('div', { class: 'xs faint' }, `Actualizado ${timeAgo(p.updated_at)}`)),
        p.is_public && h('span', { title: 'Público en el portfolio' }, icon('globe', { style: 'width:14px;height:14px;color:var(--text-faint)' }))),
      h('p', { class: 'desc' }, p.description || (p.info_verified ? 'Sin descripción' : 'Descripción pendiente de verificar')),
      h('div', { class: 'meta' }, statusBadge(p.status), categoryBadge(p.category), priorityBadge(p.priority),
        p.is_paused && badge('En pausa', 'warning'),
        !p.info_verified && badge('Pendiente de verificar', 'outline'),
        p.repositories.length > 0 && badge(`${p.repositories.length} repo`, 'outline'),
        p.open_tasks > 0 && badge(`${p.open_tasks} tareas`, 'outline'))));
}

function table(items) {
  return h('div', { class: 'card table-wrap' }, h('table', { class: 'table' },
    h('caption', { class: 'sr-only' }, 'Lista de proyectos'),
    h('thead', {}, h('tr', {}, ['Proyecto', 'Estado', 'Categoría', 'Prioridad', 'Lenguajes', 'Tareas', 'Actualizado'].map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, items.map((p) => h('tr', {},
      h('td', {}, h('a', { href: `#/projects/${p.id}` }, p.name), !p.info_verified && h('div', { class: 'xs faint' }, 'Pendiente de verificar')),
      h('td', {}, statusBadge(p.status)), h('td', {}, categoryBadge(p.category)), h('td', {}, priorityBadge(p.priority)),
      h('td', { class: 'small muted' }, p.languages.slice(0, 3).join(', ') || '—'),
      h('td', {}, String(p.open_tasks)), h('td', { class: 'small muted' }, timeAgo(p.updated_at)))))));
}
