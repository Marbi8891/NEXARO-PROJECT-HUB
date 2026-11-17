import { api } from '../api.js';
import { getThemePref, setThemePref } from '../theme.js';
import { clear, h, icon, refreshIcons, timeAgo } from '../ui/dom.js';
import { badge, confirmDialog, errorState, field, notice, selectEl, toast } from '../ui/components.js';

export async function renderSettings(ctx) {
  const { container, user } = ctx;
  container.append(h('div', { class: 'page-header' }, h('div', {}, h('h1', {}, 'Ajustes'))));

  const theme = selectEl([['system', 'Según el sistema'], ['dark', 'Oscuro'], ['light', 'Claro']], getThemePref(), { style: 'max-width:240px' });
  theme.addEventListener('change', () => setThemePref(theme.value));

  const gh = h('div', { class: 'card-body stack' });
  container.append(h('div', { class: 'stack' },
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Apariencia')), h('div', { class: 'card-body' }, field('Tema', theme))),
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'Cuenta')),
      h('div', { class: 'card-body' }, h('dl', { class: 'kv' }, h('dt', {}, 'Email'), h('dd', {}, user.email), h('dt', {}, 'Rol'), h('dd', {}, user.role)))),
    h('section', { class: 'card' }, h('div', { class: 'card-header' }, h('h2', {}, 'GitHub')), gh)));

  async function drawGithub() {
    let status;
    try { status = await api('/github/status'); } catch (err) { clear(gh).append(errorState(err, drawGithub)); return; }
    clear(gh);
    if (status.connected) {
      gh.append(
        h('div', { class: 'row' }, badge(`Conectado como ${status.login}`, 'success', true), h('span', { class: 'xs faint' }, `desde ${timeAgo(status.connected_at)}`)),
        status.scopes ? h('p', { class: 'small muted' }, `Permisos del token: ${status.scopes}`) : null,
        h('div', {}, h('button', {
          class: 'btn btn-danger', onclick: async () => {
            if (!(await confirmDialog('Desconectar GitHub', 'Se borrará el token cifrado. Los repositorios importados se conservan.', 'Desconectar'))) return;
            try { await api('/github/connect', { method: 'DELETE' }); toast('GitHub desconectado'); drawGithub(); } catch (err) { toast(err.message, 'error'); }
          },
        }, icon('unlink'), 'Desconectar')));
    } else {
      const token = h('input', { class: 'input', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…', style: 'max-width:420px' });
      const err = h('div', { class: 'form-error', role: 'alert', hidden: true });
      const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, icon('link'), 'Conectar');
      gh.append(
        notice('Usa un token «fine-grained» con permisos de SOLO LECTURA (Contents, Metadata). El token se valida contra GitHub, se guarda cifrado en el servidor y nunca vuelve al navegador.', 'info'),
        h('form', {
          class: 'stack',
          onsubmit: async (e) => {
            e.preventDefault(); err.hidden = true; btn.disabled = true;
            try { await api('/github/connect', { method: 'POST', body: { token: token.value.trim() } }); token.value = ''; toast('GitHub conectado'); drawGithub(); } catch (e2) { err.textContent = e2.message; err.hidden = false; } finally { btn.disabled = false; }
          },
        }, err, field('Token personal de GitHub', token, h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener noreferrer' }, 'Crear un token en GitHub')), h('div', {}, btn)));
    }
    refreshIcons(gh);
  }
  await drawGithub();
}
