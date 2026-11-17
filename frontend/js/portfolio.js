// Public portfolio. Uses only the unauthenticated /api/public endpoints.
import { CATEGORY, STATUS } from './labels.js';
import { toggleTheme } from './theme.js';
import { clear, extLink, h, safeUrl } from './ui/dom.js';
import { badge, emptyState, errorState } from './ui/components.js';

const main = document.getElementById('content');
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

async function get(path) {
  const r = await fetch(`/api/public${path}`, { headers: { Accept: 'application/json' }, credentials: 'omit' });
  if (!r.ok) { const e = new Error(r.status === 404 ? 'Proyecto no encontrado' : `Error ${r.status}`); e.status = r.status; throw e; }
  return r.json();
}

function cover(p) {
  const src = safeUrl(p.cover_url);
  return h('div', { class: 'pf-cover' }, src ? h('img', { src, alt: `Imagen de ${p.name}`, loading: 'lazy', referrerpolicy: 'no-referrer' }) : p.name.slice(0, 1));
}

const stack = (p) => [...p.languages, ...p.frameworks];

async function list() {
  document.title = 'Portfolio · NEXARO';
  clear(main).append(h('div', { class: 'pf-hero' }, h('h1', {}, 'Proyectos'), h('p', { class: 'muted' }, 'Selección de proyectos de software en desarrollo y en producción.')));
  let items;
  try { items = await get('/projects'); } catch (err) { main.append(errorState(err)); return; }
  if (!items.length) { main.append(h('div', { class: 'card' }, emptyState({ title: 'Aún no hay proyectos publicados' }))); return; }
  main.append(h('div', { class: 'grid grid-cards' }, items.map((p) => h('a', { class: 'card card-link', href: `#/${encodeURIComponent(p.slug)}` },
    h('div', { class: 'card-body stack', style: 'gap:12px' }, cover(p),
      h('h2', { style: 'font-size:17px' }, p.name),
      p.summary && h('p', { class: 'muted small' }, p.summary),
      h('div', { class: 'row' }, p.category && badge(CATEGORY[p.category]), p.status && badge(STATUS[p.status].label, STATUS[p.status].variant, true)),
      stack(p).length > 0 && h('div', { class: 'row' }, stack(p).slice(0, 6).map((t) => h('span', { class: 'chip' }, t))))))));
}

async function detail(slug) {
  clear(main);
  let p;
  try { p = await get(`/projects/${encodeURIComponent(slug)}`); } catch (err) {
    main.append(err.status === 404 ? h('div', { class: 'card' }, emptyState({ title: 'Proyecto no encontrado', action: h('a', { class: 'btn', href: '#/' }, 'Volver') })) : errorState(err));
    return;
  }
  document.title = `${p.name} · Portfolio`;
  main.append(
    h('a', { href: '#/', class: 'small' }, '← Todos los proyectos'),
    h('div', { class: 'pf-hero', style: 'margin-top:16px' }, h('h1', {}, p.name), p.summary && h('p', { class: 'muted' }, p.summary),
      h('div', { class: 'row', style: 'margin-top:12px' }, p.category && badge(CATEGORY[p.category]), p.status && badge(STATUS[p.status].label, STATUS[p.status].variant, true))),
    h('div', { style: 'max-width:720px' }, cover(p)),
    h('div', { class: 'row pf-section' },
      p.github_url && h('span', { class: 'btn' }, extLink(p.github_url, 'Código en GitHub')),
      p.demo_url && h('span', { class: 'btn' }, extLink(p.demo_url, 'Demo en vivo')),
      p.docs_url && h('span', { class: 'btn' }, extLink(p.docs_url, 'Documentación'))),
    p.features.length > 0 && h('section', { class: 'pf-section' }, h('h2', {}, 'Funcionalidades'), h('ul', {}, p.features.map((f) => h('li', {}, f)))),
    stack(p).length > 0 && h('section', { class: 'pf-section' }, h('h2', {}, 'Stack tecnológico'), h('div', { class: 'row' }, stack(p).map((t) => h('span', { class: 'chip' }, t)))),
    p.architecture && h('section', { class: 'pf-section' }, h('h2', {}, 'Arquitectura'), h('p', { class: 'prose' }, p.architecture)),
  );
}

function route() {
  const slug = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
  (slug ? detail(slug) : list()).then(() => main.focus({ preventScroll: true }));
}
window.addEventListener('hashchange', route);
route();
