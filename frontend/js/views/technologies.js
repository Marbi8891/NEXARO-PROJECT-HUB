import { api } from '../api.js';
import { clear, h } from '../ui/dom.js';
import { emptyState, errorState, skeleton } from '../ui/components.js';

export async function renderTechnologies(ctx) {
  const { container } = ctx;
  container.append(h('div', { class: 'page-header' },
    h('div', {}, h('h1', {}, 'Tecnologías'), h('p', { class: 'muted' }, 'Lenguajes y frameworks declarados en tus proyectos o detectados por GitHub.'))));
  const body = h('div', {}, skeleton(1, 'stack'));
  container.append(body);
  let projects;
  try { projects = (await api('/projects', { query: { limit: 500 } })).items; } catch (err) { clear(body).append(errorState(err)); return; }
  const map = new Map();
  projects.forEach((p) => {
    [...p.languages.map((n) => [n, 'Lenguaje']), ...p.frameworks.map((n) => [n, 'Framework'])].forEach(([n, kind]) => {
      const e = map.get(n) || { kind, projects: [] };
      if (!e.projects.some((x) => x.id === p.id)) e.projects.push(p);
      map.set(n, e);
    });
  });
  clear(body);
  if (!map.size) { body.append(h('div', { class: 'card' }, emptyState({ iconName: 'cpu', title: 'Sin tecnologías registradas', text: 'Añade lenguajes y frameworks a tus proyectos o sincroniza un repositorio.' }))); return; }
  const rows = [...map.entries()].sort((a, b) => b[1].projects.length - a[1].projects.length || a[0].localeCompare(b[0]));
  body.append(h('div', { class: 'card table-wrap' }, h('table', { class: 'table' },
    h('caption', { class: 'sr-only' }, 'Tecnologías por proyecto'),
    h('thead', {}, h('tr', {}, ['Tecnología', 'Tipo', 'Proyectos', 'Usada en'].map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, rows.map(([n, e]) => h('tr', {},
      h('td', {}, h('span', { class: 'chip' }, n)), h('td', { class: 'small muted' }, e.kind), h('td', {}, String(e.projects.length)),
      h('td', { class: 'small' }, e.projects.map((p, i) => [i ? ', ' : '', h('a', { href: `#/projects/${p.id}` }, p.name)]))))))));
}
