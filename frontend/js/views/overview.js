import { api } from '../api.js';
import { ACTIONS, ATTENTION, CATEGORY, STATUS } from '../labels.js';
import { clear, h, icon, refreshIcons, safeUrl, timeAgo } from '../ui/dom.js';
import { badge, emptyState, errorState, skeleton, statCard } from '../ui/components.js';
import { destroyCharts, makeChart, palette } from './charts.js';

export async function renderOverview(ctx) {
  const { container } = ctx;
  container.append(
    h('div', { class: 'page-header' },
      h('div', {}, h('h1', {}, 'Overview'), h('p', { class: 'muted' }, 'Estado real de tus proyectos, calculado desde la base de datos y GitHub.')),
      h('a', { class: 'btn btn-primary', href: '#/projects?new=1' }, icon('plus'), 'Nuevo proyecto')),
  );
  const body = h('div', { class: 'stack' }, skeleton(8));
  container.append(body);

  let d;
  try { d = await api('/dashboard'); } catch (err) {
    clear(body).append(errorState(err, () => { clear(container); renderOverview(ctx); refreshIcons(container); }));
    return;
  }
  const t = d.totals;
  clear(body);

  if (t.projects === 0) {
    body.append(h('div', { class: 'card' }, emptyState({
      iconName: 'folder-plus', title: 'Todavía no hay proyectos',
      text: 'Crea tu primer proyecto o impórtalo desde GitHub.',
      action: h('a', { class: 'btn btn-primary', href: '#/projects?new=1' }, 'Crear proyecto'),
    })));
    return;
  }

  body.append(h('section', { 'aria-label': 'Métricas', class: 'grid grid-stats' },
    statCard('Proyectos', t.projects, 'folder'),
    statCard('Activos', t.active, 'activity', 'Planificación, desarrollo o testing'),
    statCard('Completados', t.completed, 'check-circle-2', 'Producción o mantenimiento'),
    statCard('En pausa', t.paused, 'pause-circle'),
    statCard('En producción', t.production, 'rocket'),
    statCard('Repos GitHub', t.repositories, 'github'),
    statCard('Tecnologías', t.technologies, 'cpu'),
    statCard('Tareas pendientes', t.pending_tasks, 'list-todo'),
  ));

  if (t.pending_verification) {
    body.append(h('div', { class: 'notice', role: 'note' }, icon('alert-triangle'),
      h('div', {}, `${t.pending_verification} proyecto(s) tienen datos pendientes de verificar (categoría, estado o descripción). `,
        h('a', { href: '#/projects' }, 'Revisarlos'))));
  }

  // Charts
  const statusCanvas = h('canvas', { role: 'img', 'aria-label': 'Proyectos por estado' });
  const catCanvas = h('canvas', { role: 'img', 'aria-label': 'Proyectos por categoría' });
  const statusRows = Object.entries(d.by_status);
  const catRows = Object.entries(d.by_category);
  body.append(h('div', { class: 'grid grid-2' },
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Por estado')),
      h('div', { class: 'card-body' }, h('div', { class: 'chart-box' }, statusCanvas),
        dataTable(statusRows.map(([k, v]) => [k === 'pending' ? 'Pendiente' : STATUS[k].label, v])))),
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Por categoría')),
      h('div', { class: 'card-body' }, h('div', { class: 'chart-box' }, catCanvas),
        dataTable(catRows.map(([k, v]) => [CATEGORY[k], v]))))));

  const drawCharts = () => {
    destroyCharts();
    const colors = palette();
    makeChart(statusCanvas, {
      type: 'doughnut',
      data: { labels: statusRows.map(([k]) => (k === 'pending' ? 'Pendiente' : STATUS[k].label)), datasets: [{ data: statusRows.map(([, v]) => v), backgroundColor: colors, borderWidth: 0 }] },
      options: { cutout: '65%' },
    });
    makeChart(catCanvas, {
      type: 'bar',
      data: { labels: catRows.map(([k]) => CATEGORY[k]), datasets: [{ label: 'Proyectos', data: catRows.map(([, v]) => v), backgroundColor: colors[0], borderRadius: 4, maxBarThickness: 28 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } },
    });
  };
  drawCharts();
  const onTheme = () => { if (document.body.contains(statusCanvas)) drawCharts(); else window.removeEventListener('theme:change', onTheme); };
  window.addEventListener('theme:change', onTheme);

  // Attention / commits / activity
  body.append(h('div', { class: 'grid grid-3' },
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Requieren atención'), badge(String(d.attention.length))),
      d.attention.length
        ? h('ul', { class: 'list' }, d.attention.slice(0, 8).map((a) => h('li', {},
          h('div', { class: 'grow' }, h('a', { href: `#/projects/${a.id}` }, a.name),
            h('div', { class: 'row', style: 'margin-top:4px' }, a.reasons.map((r) => badge(ATTENTION[r] || r, r === 'overdue_tasks' ? 'danger' : 'warning')))))))
        : emptyState({ iconName: 'check', title: 'Todo en orden', text: 'Ningún proyecto requiere atención.' })),
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Commits recientes')),
      d.recent_commits.length
        ? h('ul', { class: 'list' }, d.recent_commits.map((c) => h('li', {},
          h('code', { class: 'chip' }, c.sha),
          h('div', { class: 'grow' },
            safeUrl(c.url) ? h('a', { href: safeUrl(c.url), target: '_blank', rel: 'noopener noreferrer', class: 'truncate', style: 'display:block;color:var(--text)' }, c.message) : h('div', { class: 'truncate' }, c.message),
            h('div', { class: 'xs faint' }, `${c.repository} · ${c.author || 'desconocido'} · ${timeAgo(c.committed_at)}`)))))
        : emptyState({ iconName: 'git-commit-horizontal', title: 'Sin commits', text: 'Importa y sincroniza repositorios para ver su actividad.', action: h('a', { class: 'btn btn-sm', href: '#/repositories' }, 'Ir a Repositorios') })),
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Actividad reciente')),
      d.recent_activity.length
        ? h('ul', { class: 'list' }, d.recent_activity.map((a) => h('li', {},
          h('div', { class: 'grow' }, h('div', { class: 'small' }, ACTIONS[a.action] || a.action),
            h('div', { class: 'xs faint truncate' }, `${a.summary || ''} · ${timeAgo(a.created_at)}`)))))
        : emptyState({ iconName: 'history', title: 'Sin actividad' })),
  ));
}

function dataTable(rows) {
  // Accessible text alternative for the chart.
  return h('details', { class: 'small', style: 'margin-top:8px' }, h('summary', { class: 'faint' }, 'Ver datos'),
    h('table', { class: 'table' }, h('tbody', {}, rows.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, String(v)))))));
}
