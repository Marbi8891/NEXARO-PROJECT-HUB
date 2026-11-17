import { api } from '../api.js';
import { clear, h, icon, refreshIcons } from '../ui/dom.js';
import { emptyState, errorState, notice, skeleton, statusBadge, toast } from '../ui/components.js';

export async function renderPortfolioAdmin(ctx) {
  const { container } = ctx;
  container.append(h('div', { class: 'page-header' },
    h('div', {}, h('h1', {}, 'Portfolio'), h('p', { class: 'muted' }, 'Elige qué proyectos aparecen en tu portfolio público.')),
    h('a', { class: 'btn', href: 'portfolio.html', target: '_blank', rel: 'noopener' }, icon('external-link'), 'Ver portfolio público')));
  container.append(h('div', { style: 'margin-bottom:16px' },
    notice('El portfolio solo muestra: nombre, resumen público, categoría, estado, stack, funcionalidades, arquitectura, demo, documentación y el enlace a GitHub si el repositorio es público. Nunca notas privadas, tareas ni información de seguridad.', 'info')));
  const body = h('div', {}, skeleton(1, 'stack'));
  container.append(body);

  let projects;
  try { projects = (await api('/projects', { query: { sort: 'name', limit: 500 } })).items; } catch (err) { clear(body).append(errorState(err)); return; }
  clear(body);
  if (!projects.length) { body.append(h('div', { class: 'card' }, emptyState({ iconName: 'globe', title: 'No hay proyectos todavía' }))); return; }
  body.append(h('div', { class: 'card' }, h('ul', { class: 'list' }, projects.map((p) => {
    const cb = h('input', { type: 'checkbox', checked: p.is_public, 'aria-label': `Publicar ${p.name}` });
    cb.addEventListener('change', async () => {
      try { await api(`/projects/${p.id}`, { method: 'PATCH', body: { is_public: cb.checked } }); toast(cb.checked ? `${p.name} es público` : `${p.name} ya no es público`); } catch (err) { cb.checked = !cb.checked; toast(err.message, 'error'); }
    });
    return h('li', { style: 'align-items:center' },
      h('label', { class: 'checkbox' }, cb, h('span', { class: 'sr-only' }, 'Público')),
      h('div', { class: 'grow' }, h('a', { href: `#/projects/${p.id}` }, p.name),
        !(p.public_summary || p.description) && h('div', { class: 'xs faint' }, 'Sin resumen público: añade uno antes de publicarlo.')),
      statusBadge(p.status));
  }))));
  refreshIcons(body);
}
