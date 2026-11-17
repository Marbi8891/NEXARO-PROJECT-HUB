import { api } from '../api.js';
import { CATEGORY, PRIORITY, STATUS, TASK_STATUS, options } from '../labels.js';
import { clear, extLink, fmtDate, h, icon, refreshIcons, timeAgo } from '../ui/dom.js';
import {
  badge, categoryBadge, confirmDialog, emptyState, errorState, notice, priorityBadge, selectEl, skeleton, statusBadge, toast,
} from '../ui/components.js';
import { openProjectForm } from './project-form.js';

export async function renderProjectDetail(ctx, id) {
  const { container, crumbs } = ctx;
  container.append(skeleton(1, 'stack'));
  let p;
  try { p = await api(`/projects/${id}`); } catch (err) {
    clear(container).append(err.status === 404
      ? h('div', { class: 'card' }, emptyState({ iconName: 'folder-x', title: 'Proyecto no encontrado', action: h('a', { class: 'btn', href: '#/projects' }, 'Volver a proyectos') }))
      : errorState(err));
    return;
  }
  clear(crumbs).append(h('a', { href: '#/projects', style: 'color:inherit' }, 'Mis proyectos'), ' / ', p.name);
  document.title = `${p.name} · NEXARO Projects Hub`;
  draw();

  function draw() {
    clear(container);
    const statusSel = selectEl([['', 'Pendiente'], ...options(STATUS)], p.status, { 'aria-label': 'Cambiar estado', style: 'width:auto' });
    statusSel.addEventListener('change', async () => {
      try {
        p = await api(`/projects/${p.id}/status`, { method: 'PUT', body: { status: statusSel.value || null } });
        toast('Estado actualizado'); draw();
      } catch (err) { toast(err.message, 'error'); }
    });

    container.append(
      h('div', { class: 'page-header' },
        h('div', {},
          h('h1', {}, p.name),
          h('div', { class: 'row', style: 'margin-top:8px' }, statusBadge(p.status), categoryBadge(p.category), priorityBadge(p.priority),
            p.is_paused && badge('En pausa', 'warning'), p.is_public ? badge('Público', 'success') : badge('Privado', 'outline'),
            p.current_version && badge(`v${p.current_version}`, 'outline'))),
        h('div', { class: 'row' },
          h('label', { class: 'sr-only', for: 'status-quick' }, 'Estado'), Object.assign(statusSel, { id: 'status-quick' }),
          h('button', { class: 'btn', onclick: async () => { const s = await openProjectForm(p); if (s) { p = s; draw(); } } }, icon('pencil'), 'Editar'),
          h('button', {
            class: 'btn btn-danger', 'aria-label': 'Eliminar proyecto',
            onclick: async () => {
              if (!(await confirmDialog('Eliminar proyecto', `Se eliminará «${p.name}» y sus tareas. Los repositorios de GitHub no se tocan.`, 'Eliminar'))) return;
              try { await api(`/projects/${p.id}`, { method: 'DELETE' }); toast('Proyecto eliminado'); window.location.hash = '#/projects'; } catch (err) { toast(err.message, 'error'); }
            },
          }, icon('trash-2')))),
    );
    if (!p.info_verified) {
      container.append(h('div', { style: 'margin-bottom:16px' },
        notice('Los datos de este proyecto están pendientes de verificar. Revisa categoría, estado y descripción y marca «Datos verificados» al editar.')));
    }

    const panels = {
      resumen: () => overviewPanel(p),
      tareas: () => tasksPanel(p, (n) => { p.open_tasks = n; }),
      repositorio: () => repoPanel(p),
      notas: () => notesPanel(p),
    };
    const labels = { resumen: 'Resumen', tareas: `Tareas${p.open_tasks ? ` (${p.open_tasks})` : ''}`, repositorio: 'Repositorio', notas: 'Notas privadas' };
    const panel = h('div', { role: 'tabpanel', id: 'tab-panel', tabindex: '0' });
    const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones del proyecto' },
      Object.keys(panels).map((k, i) => h('button', {
        class: 'tab', role: 'tab', id: `tab-${k}`, 'aria-selected': String(i === 0), 'aria-controls': 'tab-panel', tabindex: i === 0 ? '0' : '-1',
        onclick: (e) => select(k, e.currentTarget),
        onkeydown: (e) => {
          const all = [...tabs.querySelectorAll('[role=tab]')];
          const idx = all.indexOf(e.currentTarget);
          const next = e.key === 'ArrowRight' ? all[(idx + 1) % all.length] : e.key === 'ArrowLeft' ? all[(idx - 1 + all.length) % all.length] : null;
          if (next) { next.focus(); next.click(); }
        },
      }, labels[k])));
    async function select(k, btn) {
      tabs.querySelectorAll('[role=tab]').forEach((b) => { b.setAttribute('aria-selected', String(b === btn)); b.tabIndex = b === btn ? 0 : -1; });
      panel.setAttribute('aria-labelledby', btn.id);
      clear(panel).append(await panels[k]());
      refreshIcons(panel);
    }
    container.append(tabs, panel);
    select('resumen', tabs.querySelector('[role=tab]'));
    refreshIcons(container);
  }
}

const pending = () => h('span', { class: 'faint' }, 'Pendiente');
const chips = (list) => (list?.length ? h('div', { class: 'row' }, list.map((x) => h('span', { class: 'chip' }, x))) : pending());

function overviewPanel(p) {
  return h('div', { class: 'grid grid-2' },
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Perfil')),
      h('div', { class: 'card-body stack' },
        h('p', { class: 'prose' }, p.description || 'Descripción pendiente.'),
        h('dl', { class: 'kv' },
          h('dt', {}, 'Categoría'), h('dd', {}, p.category ? CATEGORY[p.category] : pending()),
          h('dt', {}, 'Estado'), h('dd', {}, p.status ? STATUS[p.status].label : pending()),
          h('dt', {}, 'Prioridad'), h('dd', {}, PRIORITY[p.priority].label),
          h('dt', {}, 'Versión'), h('dd', {}, p.current_version || pending()),
          h('dt', {}, 'Inicio'), h('dd', {}, p.start_date ? fmtDate(p.start_date) : pending()),
          h('dt', {}, 'Última actualización'), h('dd', {}, `${fmtDate(p.updated_at)} (${timeAgo(p.updated_at)})`),
          h('dt', {}, 'Demo'), h('dd', {}, p.demo_url ? extLink(p.demo_url) : pending()),
          h('dt', {}, 'Documentación'), h('dd', {}, p.docs_url ? extLink(p.docs_url) : pending()),
          h('dt', {}, 'GitHub'), h('dd', {}, p.repositories.length ? h('div', { class: 'stack', style: 'gap:4px' }, p.repositories.map((r) => extLink(r.html_url, r.full_name))) : pending())))),
    h('div', { class: 'stack' },
      h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Stack técnico')),
        h('div', { class: 'card-body' }, h('dl', { class: 'kv' },
          h('dt', {}, 'Lenguajes'), h('dd', {}, chips(p.languages)),
          h('dt', {}, 'Frameworks'), h('dd', {}, chips(p.frameworks)),
          h('dt', {}, 'Dependencias'), h('dd', {}, chips(p.dependencies)),
          h('dt', {}, 'Funcionalidades'), h('dd', {}, chips(p.features))))),
      h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Arquitectura')),
        h('div', { class: 'card-body' }, p.architecture ? h('p', { class: 'prose' }, p.architecture) : h('p', { class: 'faint small' }, 'Sin documentar todavía.')))));
}

async function tasksPanel(p, onCount) {
  const wrap = h('section', { class: 'card' });
  const title = h('input', { class: 'input', placeholder: 'Nueva tarea…', maxlength: 200, 'aria-label': 'Título de la nueva tarea' });
  const due = h('input', { class: 'input', type: 'date', 'aria-label': 'Fecha límite', style: 'width:auto' });
  const prio = selectEl(options(PRIORITY), 'medium', { 'aria-label': 'Prioridad', style: 'width:auto' });
  const list = h('ul', { class: 'list' });
  const form = h('form', {
    class: 'card-header', style: 'gap:8px',
    onsubmit: async (e) => {
      e.preventDefault();
      if (!title.value.trim()) return;
      try {
        await api(`/projects/${p.id}/tasks`, { method: 'POST', body: { title: title.value.trim(), priority: prio.value, due_date: due.value || null } });
        title.value = ''; due.value = ''; load();
      } catch (err) { toast(err.message, 'error'); }
    },
  }, title, due, prio, h('button', { class: 'btn btn-primary', type: 'submit' }, icon('plus'), 'Añadir'));
  wrap.append(form, list);

  async function load() {
    let tasks;
    try { tasks = await api(`/projects/${p.id}/tasks`); } catch (err) { clear(list).append(errorState(err, load)); return; }
    onCount(tasks.filter((t) => t.status !== 'done').length);
    clear(list);
    if (!tasks.length) { list.append(h('li', {}, emptyState({ iconName: 'list-todo', title: 'Sin tareas', text: 'Añade la primera tarea arriba.' }))); return; }
    const today = new Date().toISOString().slice(0, 10);
    tasks.forEach((t) => {
      const sel = selectEl(Object.entries(TASK_STATUS), t.status, { 'aria-label': `Estado de ${t.title}`, style: 'width:auto' });
      sel.addEventListener('change', async () => {
        try { await api(`/projects/${p.id}/tasks/${t.id}`, { method: 'PATCH', body: { status: sel.value } }); load(); } catch (err) { toast(err.message, 'error'); }
      });
      const overdue = t.due_date && t.status !== 'done' && t.due_date < today;
      list.append(h('li', { style: 'align-items:center' },
        h('div', { class: 'grow' },
          h('div', { style: t.status === 'done' ? 'text-decoration:line-through;color:var(--text-faint)' : '' }, t.title),
          h('div', { class: 'row', style: 'margin-top:4px' }, priorityBadge(t.priority),
            t.due_date && badge(`Vence ${fmtDate(t.due_date)}`, overdue ? 'danger' : 'outline'))),
        sel,
        h('button', {
          class: 'btn btn-ghost btn-icon', 'aria-label': `Eliminar tarea ${t.title}`,
          onclick: async () => { try { await api(`/projects/${p.id}/tasks/${t.id}`, { method: 'DELETE' }); load(); } catch (err) { toast(err.message, 'error'); } },
        }, icon('trash-2'))));
    });
    refreshIcons(list);
  }
  await load();
  return wrap;
}

async function repoPanel(p) {
  if (!p.repositories.length) {
    return h('div', { class: 'card' }, emptyState({
      iconName: 'github', title: 'Sin repositorio vinculado', text: 'Importa un repositorio desde GitHub y vincúlalo a este proyecto.',
      action: h('a', { class: 'btn', href: '#/repositories' }, 'Ir a Repositorios'),
    }));
  }
  const repos = await Promise.all(p.repositories.map((r) => api(`/repositories/${r.id}`)));
  return h('div', { class: 'stack' }, repos.map((r) => h('section', { class: 'card' },
    h('div', { class: 'card-header' }, h('h2', {}, extLink(r.html_url, r.full_name)),
      h('div', { class: 'row' }, r.private ? badge('Privado', 'outline') : badge('Público', 'success'),
        h('span', { class: 'xs faint' }, `Sincronizado ${timeAgo(r.last_synced_at)}`))),
    h('div', { class: 'card-body stack' },
      h('dl', { class: 'kv' },
        h('dt', {}, 'Lenguajes (GitHub)'), h('dd', {}, chips(Object.keys(r.languages))),
        h('dt', {}, 'Gestores / ficheros de dependencias'), h('dd', {}, r.dependency_files.length ? chips(r.dependency_files.map((d) => `${d.file} (${d.manager})`)) : h('span', { class: 'faint' }, 'No detectados en la raíz')),
        h('dt', {}, 'Rama por defecto'), h('dd', {}, r.default_branch || '—'),
        h('dt', {}, 'Stars / forks / issues'), h('dd', {}, `${r.stars} / ${r.forks} / ${r.open_issues}`),
        h('dt', {}, 'Último push'), h('dd', {}, fmtDate(r.pushed_at))),
      h('div', {}, h('h3', { style: 'font-size:14px;margin-bottom:8px' }, 'README'),
        r.readme ? h('pre', { class: 'readme' }, r.readme) : h('p', { class: 'faint small' }, 'El repositorio no tiene README.')),
      h('div', {}, h('h3', { style: 'font-size:14px;margin-bottom:8px' }, 'Últimos commits'),
        r.commits.length ? h('ul', { class: 'list card' }, r.commits.slice(0, 10).map((c) => h('li', {},
          h('code', { class: 'chip' }, c.sha.slice(0, 7)),
          h('div', { class: 'grow' }, h('div', { class: 'truncate' }, c.message.split('\n')[0]),
            h('div', { class: 'xs faint' }, `${c.author || 'desconocido'} · ${timeAgo(c.committed_at)}`))))) : h('p', { class: 'faint small' }, 'Sin commits sincronizados.'))))));
}

function notesPanel(p) {
  return h('div', { class: 'stack' },
    notice('Estas notas son privadas: nunca se muestran en el portfolio público.', 'info'),
    h('div', { class: 'grid grid-2' },
      h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Notas de desarrollo')),
        h('div', { class: 'card-body' }, p.dev_notes ? h('p', { class: 'prose' }, p.dev_notes) : h('p', { class: 'faint small' }, 'Sin notas.'))),
      h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Seguridad')),
        h('div', { class: 'card-body' }, p.security_notes ? h('p', { class: 'prose' }, p.security_notes) : h('p', { class: 'faint small' }, 'Sin información de seguridad registrada.')))));
}
