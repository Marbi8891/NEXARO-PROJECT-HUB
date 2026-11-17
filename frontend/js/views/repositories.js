import { api } from '../api.js';
import { clear, extLink, h, icon, refreshIcons, timeAgo } from '../ui/dom.js';
import { badge, confirmDialog, emptyState, errorState, notice, openModal, selectEl, skeleton, toast } from '../ui/components.js';

export async function renderRepositories(ctx) {
  const { container } = ctx;
  container.append(h('div', { class: 'page-header' },
    h('div', {}, h('h1', {}, 'Repositorios'), h('p', { class: 'muted' }, 'Importa repositorios de GitHub en modo solo lectura. El Hub nunca escribe en GitHub.'))));
  const body = h('div', { class: 'stack' }, skeleton(2, 'stack'));
  container.append(body);

  async function load() {
    let status; let local; let projects;
    try {
      [status, local, projects] = await Promise.all([api('/github/status'), api('/repositories'), api('/projects', { query: { sort: 'name', limit: 500 } })]);
    } catch (err) { clear(body).append(errorState(err, load)); return; }
    clear(body);

    if (!status.connected) {
      body.append(h('div', { class: 'card' }, emptyState({
        iconName: 'github', title: 'GitHub no está conectado', text: 'Conecta tu cuenta con un token personal de solo lectura desde Ajustes.',
        action: h('a', { class: 'btn btn-primary', href: '#/settings' }, 'Conectar GitHub'),
      })));
    } else {
      const importBtn = h('button', { class: 'btn btn-primary', onclick: () => openImport(projects.items, load) }, icon('download'), 'Importar repositorio');
      body.append(h('div', { class: 'row-between' },
        h('div', { class: 'row' }, badge(`Conectado como ${status.login}`, 'success', true)), importBtn));
    }

    const section = h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Repositorios importados'), badge(String(local.length))));
    if (!local.length) {
      section.append(emptyState({ iconName: 'git-branch', title: 'Ningún repositorio importado', text: status.connected ? 'Usa «Importar repositorio» para traer uno.' : undefined }));
    } else {
      const projectName = Object.fromEntries(projects.items.map((p) => [p.id, p.name]));
      section.append(h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('caption', { class: 'sr-only' }, 'Repositorios importados'),
        h('thead', {}, h('tr', {}, ['Repositorio', 'Proyecto', 'Lenguaje', 'Último push', 'Sincronizado', ''].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, local.map((r) => {
          const linkSel = selectEl([['', '— Sin vincular —'], ...projects.items.map((p) => [p.id, p.name])], r.project_id ?? '', { 'aria-label': `Proyecto vinculado a ${r.full_name}`, style: 'width:auto;max-width:220px' });
          linkSel.addEventListener('change', async () => {
            try { await api(`/repositories/${r.id}/project`, { method: 'PUT', body: { project_id: linkSel.value ? Number(linkSel.value) : null } }); toast('Vinculación actualizada'); } catch (err) { toast(err.message, 'error'); }
          });
          const syncBtn = h('button', {
            class: 'btn btn-sm', disabled: !status.connected || undefined,
            onclick: async () => {
              syncBtn.disabled = true;
              try { await api(`/repositories/${r.id}/sync`, { method: 'POST' }); toast(`${r.full_name} sincronizado`); load(); } catch (err) { toast(err.message, 'error'); syncBtn.disabled = false; }
            },
          }, icon('refresh-cw'), 'Sincronizar');
          return h('tr', {},
            h('td', {}, extLink(r.html_url, r.full_name), ' ', r.private ? badge('Privado', 'outline') : null),
            h('td', {}, linkSel, r.project_id && h('a', { class: 'xs', href: `#/projects/${r.project_id}`, style: 'margin-left:8px' }, projectName[r.project_id] ? 'Abrir' : '')),
            h('td', { class: 'small muted' }, r.primary_language || '—'),
            h('td', { class: 'small muted' }, timeAgo(r.pushed_at)),
            h('td', { class: 'small muted' }, timeAgo(r.last_synced_at)),
            h('td', {}, h('div', { class: 'row', style: 'flex-wrap:nowrap' }, syncBtn,
              h('button', {
                class: 'btn btn-sm btn-ghost btn-danger', 'aria-label': `Quitar ${r.full_name} del Hub`,
                onclick: async () => {
                  if (!(await confirmDialog('Quitar repositorio', `Se borrará la copia local de ${r.full_name} en el Hub. No se modifica nada en GitHub.`, 'Quitar'))) return;
                  try { await api(`/repositories/${r.id}`, { method: 'DELETE' }); load(); } catch (err) { toast(err.message, 'error'); }
                },
              }, icon('x')))));
        })))));
    }
    body.append(section);
    refreshIcons(body);
  }
  await load();
}

async function openImport(projects, onDone) {
  const list = h('div', {}, skeleton(1, 'stack'));
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Filtrar repositorios…', 'aria-label': 'Filtrar repositorios' });
  const target = selectEl([['', 'Crear un proyecto nuevo'], ...projects.map((p) => [p.id, `Vincular a: ${p.name}`])], '', { 'aria-label': 'Destino de la importación' });
  const m = openModal({
    title: 'Importar desde GitHub',
    body: h('div', { class: 'stack' },
      notice('La importación solo lee metadatos, README, lenguajes y commits. Los proyectos nuevos quedan como «pendiente de verificar» hasta que revises categoría y estado.', 'info'),
      h('div', { class: 'row' }, h('div', { class: 'search', style: 'flex:1' }, icon('search'), search), target), list),
  });
  let repos;
  try { repos = await api('/github/repos'); } catch (err) { clear(list).append(errorState(err)); return; }
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const items = repos.filter((r) => r.full_name.toLowerCase().includes(q));
    clear(list).append(items.length ? h('ul', { class: 'list card' }, items.map((r) => h('li', { style: 'align-items:center' },
      h('div', { class: 'grow' },
        h('div', { class: 'row' }, h('strong', { class: 'small' }, r.full_name), r.private ? badge('Privado', 'outline') : null, r.primary_language && h('span', { class: 'chip' }, r.primary_language)),
        r.description && h('div', { class: 'xs faint truncate' }, r.description)),
      r.imported_repository_id
        ? badge('Importado', 'success')
        : h('button', {
          class: 'btn btn-sm',
          onclick: async (e) => {
            const btn = e.currentTarget; btn.disabled = true;
            try {
              await api('/github/import', { method: 'POST', body: { full_name: r.full_name, project_id: target.value ? Number(target.value) : null } });
              r.imported_repository_id = -1; toast(`${r.full_name} importado`); draw(); onDone();
            } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
          },
        }, 'Importar')))) : emptyState({ iconName: 'search-x', title: 'Sin repositorios' }));
    refreshIcons(list);
  };
  search.addEventListener('input', draw);
  draw();
  return m;
}
