// Safe DOM helpers. User data is always inserted as text nodes (never innerHTML) to prevent XSS.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'html') throw new Error('raw html is not allowed');
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) { el.replaceChildren(); return el; }

/** Lucide icon placeholder; call refreshIcons() after inserting into the DOM. */
export function icon(name, attrs = {}) {
  return h('i', { 'data-lucide': name, 'aria-hidden': 'true', ...attrs });
}

export function refreshIcons(root = document) {
  if (window.lucide) window.lucide.createIcons({ root, attrs: { 'stroke-width': 1.75 } });
}

/** Only allow http(s) links coming from data. */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
  } catch { return null; }
}

export function extLink(url, label) {
  const href = safeUrl(url);
  if (!href) return h('span', { class: 'faint' }, 'Pendiente');
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label || href);
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'ahora mismo';
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}
