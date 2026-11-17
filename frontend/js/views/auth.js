import { api } from '../api.js';
import { clear, h, icon, refreshIcons } from '../ui/dom.js';
import { field } from '../ui/components.js';

export async function renderAuth(root, onSuccess) {
  let needsSetup = false;
  try { needsSetup = (await api('/auth/setup')).needs_setup; } catch (err) {
    clear(root).append(h('div', { class: 'auth-wrap' }, h('div', { class: 'error-box', role: 'alert' }, err.message)));
    return;
  }

  const email = h('input', { class: 'input', type: 'email', name: 'email', autocomplete: 'username', required: true });
  const password = h('input', {
    class: 'input', type: 'password', name: 'password', required: true,
    autocomplete: needsSetup ? 'new-password' : 'current-password', minlength: needsSetup ? 12 : undefined,
  });
  const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
  const submit = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, needsSetup ? 'Crear cuenta de propietario' : 'Iniciar sesión');

  const form = h('form', {
    class: 'stack', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      error.hidden = true;
      if (!form.checkValidity()) {
        error.textContent = needsSetup ? 'Introduce un email válido y una contraseña de al menos 12 caracteres.' : 'Introduce email y contraseña.';
        error.hidden = false;
        return;
      }
      submit.disabled = true;
      try {
        const session = await api(needsSetup ? '/auth/setup' : '/auth/login', {
          method: 'POST', body: { email: email.value.trim(), password: password.value },
        });
        onSuccess(session);
      } catch (err) {
        error.textContent = err.status === 401 ? 'Email o contraseña incorrectos.' : err.message;
        error.hidden = false;
        password.value = '';
        password.focus();
      } finally { submit.disabled = false; }
    },
  },
  needsSetup && h('div', { class: 'notice info' }, icon('info'),
    h('div', {}, 'Primera ejecución: crea la cuenta de propietario. Solo puede existir una y esta pantalla desaparece después.')),
  error,
  field('Email', email),
  field('Contraseña', password, needsSetup ? 'Mínimo 12 caracteres.' : undefined),
  submit);

  clear(root).append(h('div', { class: 'auth-wrap' },
    h('main', { class: 'auth-card card', id: 'content' },
      h('div', { class: 'card-body', style: 'padding:32px' },
        h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, 'N'), h('span', {}, 'NEXARO Projects Hub')),
        h('h1', { class: 'sr-only' }, needsSetup ? 'Configuración inicial' : 'Iniciar sesión'),
        form))));
  refreshIcons(root);
  email.focus();
}
