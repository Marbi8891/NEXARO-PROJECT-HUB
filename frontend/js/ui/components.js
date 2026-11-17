import { h, icon, refreshIcons } from './dom.js';
import { CATEGORY, PRIORITY, STATUS } from '../labels.js';

export function badge(text, variant = '', dot = false) {
  return h('span', { class: `badge ${variant ? `badge-${variant}` : ''} ${dot ? 'dot' : ''}` }, text);
}

export function statusBadge(status) {
  if (!status) return badge('Pendiente', 'outline');
  const s = STATUS[status];
  return badge(s.label, s.variant, true);
}

export function categoryBadge(category) {
  return category ? badge(CATEGORY[category]) : badge('Categoría pendiente', 'outline');
}

export function priorityBadge(priority) {
  const p = PRIORITY[priority];
  return badge(p.label, p.variant);
}

export function emptyState({ iconName = 'inbox', title, text, action }) {
  return h('div', { class: 'empty' }, icon(iconName), h('h3', {}, title), text && h('p', { class: 'small' }, text), action);
}

export function errorState(err, retry) {
  return h('div', { class: 'error-box', role: 'alert' },
    h('strong', {}, 'No se pudo cargar. '), err?.message || String(err),
    retry && h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn btn-sm', onclick: retry }, 'Reintentar')));
}

export function skeleton(n = 3, cls = 'grid grid-stats') {
  return h('div', { class: cls, 'aria-busy': 'true', 'aria-label': 'Cargando' },
    Array.from({ length: n }, () => h('div', { class: 'skeleton' })));
}

export function statCard(label, value, iconName, hint) {
  return h('div', { class: 'card stat' },
    h('div', { class: 'label' }, icon(iconName), label),
    h('div', { class: 'value' }, value),
    hint && h('div', { class: 'xs faint' }, hint));
}

export function notice(text, kind = '') {
  return h('div', { class: `notice ${kind}`, role: 'note' }, icon(kind === 'info' ? 'info' : 'alert-triangle'), h('div', {}, text));
}

// ---------- toasts ----------
export function toast(message, kind = 'ok') {
  let root = document.querySelector('.toasts');
  if (!root) {
    root = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(root);
  }
  const t = h('div', { class: `toast ${kind === 'error' ? 'error' : ''}` }, message);
  root.append(t);
  setTimeout(() => t.remove(), 4500);
}

// ---------- modal (native dialog: focus trap + Esc handled by the browser) ----------
export function openModal({ title, body, footer, onClose }) {
  const titleId = `m-${Math.random().toString(36).slice(2)}`;
  const close = () => dlg.close();
  const dlg = h('dialog', { class: 'modal', 'aria-labelledby': titleId },
    h('div', { class: 'modal-header' },
      h('h2', { id: titleId, style: 'font-size:16px' }, title),
      h('button', { class: 'btn btn-ghost btn-icon', 'aria-label': 'Cerrar', onclick: close }, icon('x'))),
    h('div', { class: 'modal-body' }, body),
    footer && h('div', { class: 'modal-footer' }, footer));
  dlg.addEventListener('close', () => { dlg.remove(); onClose?.(); });
  document.body.append(dlg);
  refreshIcons(dlg);
  dlg.showModal();
  return { dialog: dlg, close };
}

export function confirmDialog(title, text, confirmLabel = 'Confirmar', danger = true) {
  return new Promise((resolve) => {
    let result = false;
    const m = openModal({
      title,
      body: h('p', { class: 'muted' }, text),
      footer: [
        h('button', { class: 'btn', onclick: () => m.close() }, 'Cancelar'),
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => { result = true; m.close(); } }, confirmLabel),
      ],
      onClose: () => resolve(result),
    });
  });
}

export function field(label, control, hint) {
  const id = control.id || `f-${Math.random().toString(36).slice(2)}`;
  control.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), control, hint && h('span', { class: 'hint' }, hint));
}

export function selectEl(options, value, attrs = {}) {
  return h('select', { class: 'select', ...attrs },
    options.map(([v, label]) => h('option', { value: v, selected: String(v) === String(value ?? '') ? true : undefined }, label)));
}
