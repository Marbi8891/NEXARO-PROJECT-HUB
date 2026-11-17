import { api } from '../api.js';
import { CATEGORY, PRIORITY, STATUS, options } from '../labels.js';
import { h } from '../ui/dom.js';
import { field, openModal, selectEl, toast } from '../ui/components.js';

const listToText = (l) => (l || []).join(', ');
const textToList = (t) => t.split(',').map((s) => s.trim()).filter(Boolean);
const orNull = (v) => (v.trim() === '' ? null : v.trim());

/** Opens the create/edit modal. Resolves with the saved project, or null if cancelled. */
export function openProjectForm(project = null) {
  return new Promise((resolve) => {
    const p = project || {};
    const f = {
      name: h('input', { class: 'input', required: true, maxlength: 160, value: p.name || '' }),
      description: h('textarea', { class: 'textarea', maxlength: 5000 }, p.description || ''),
      category: selectEl(options(CATEGORY, { withEmpty: 'Pendiente' }), p.category),
      status: selectEl(options(STATUS, { withEmpty: 'Pendiente' }), p.status),
      priority: selectEl(options(PRIORITY), p.priority || 'medium'),
      current_version: h('input', { class: 'input', maxlength: 40, value: p.current_version || '', placeholder: '0.1.0' }),
      start_date: h('input', { class: 'input', type: 'date', value: p.start_date || '' }),
      demo_url: h('input', { class: 'input', type: 'url', value: p.demo_url || '', placeholder: 'https://' }),
      docs_url: h('input', { class: 'input', type: 'url', value: p.docs_url || '', placeholder: 'https://' }),
      cover_url: h('input', { class: 'input', type: 'url', value: p.cover_url || '', placeholder: 'https://' }),
      languages: h('input', { class: 'input', value: listToText(p.languages), placeholder: 'Python, JavaScript' }),
      frameworks: h('input', { class: 'input', value: listToText(p.frameworks), placeholder: 'FastAPI, Chart.js' }),
      dependencies: h('input', { class: 'input', value: listToText(p.dependencies) }),
      features: h('input', { class: 'input', value: listToText(p.features) }),
      architecture: h('textarea', { class: 'textarea', maxlength: 20000 }, p.architecture || ''),
      dev_notes: h('textarea', { class: 'textarea', maxlength: 20000 }, p.dev_notes || ''),
      security_notes: h('textarea', { class: 'textarea', maxlength: 20000 }, p.security_notes || ''),
      public_summary: h('textarea', { class: 'textarea', maxlength: 5000 }, p.public_summary || ''),
      is_public: h('input', { type: 'checkbox', checked: p.is_public }),
      is_paused: h('input', { type: 'checkbox', checked: p.is_paused }),
      info_verified: h('input', { type: 'checkbox', checked: project ? p.info_verified : true }),
    };
    const error = h('div', { class: 'form-error', role: 'alert', hidden: true });
    const save = h('button', { class: 'btn btn-primary', type: 'submit', form: 'project-form' }, project ? 'Guardar cambios' : 'Crear proyecto');
    let saved = null;

    const form = h('form', {
      id: 'project-form', class: 'stack', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.hidden = true;
        if (!f.name.value.trim()) {
          f.name.setAttribute('aria-invalid', 'true'); f.name.focus();
          error.textContent = 'El nombre es obligatorio.'; error.hidden = false; return;
        }
        const body = {
          name: f.name.value.trim(),
          description: orNull(f.description.value),
          category: f.category.value || null,
          status: f.status.value || null,
          priority: f.priority.value,
          current_version: orNull(f.current_version.value),
          start_date: f.start_date.value || null,
          demo_url: orNull(f.demo_url.value),
          docs_url: orNull(f.docs_url.value),
          cover_url: orNull(f.cover_url.value),
          languages: textToList(f.languages.value),
          frameworks: textToList(f.frameworks.value),
          dependencies: textToList(f.dependencies.value),
          features: textToList(f.features.value),
          architecture: orNull(f.architecture.value),
          dev_notes: orNull(f.dev_notes.value),
          security_notes: orNull(f.security_notes.value),
          public_summary: orNull(f.public_summary.value),
          is_public: f.is_public.checked,
          is_paused: f.is_paused.checked,
          info_verified: f.info_verified.checked,
        };
        save.disabled = true;
        try {
          saved = project
            ? await api(`/projects/${project.id}`, { method: 'PATCH', body })
            : await api('/projects', { method: 'POST', body });
          toast(project ? 'Proyecto actualizado' : 'Proyecto creado');
          modal.close();
        } catch (err) {
          error.textContent = err.message; error.hidden = false;
        } finally { save.disabled = false; }
      },
    },
    error,
    h('div', { class: 'form-grid' },
      h('div', { class: 'span-2' }, field('Nombre *', f.name)),
      h('div', { class: 'span-2' }, field('Descripción', f.description)),
      field('Categoría', f.category), field('Estado', f.status),
      field('Prioridad', f.priority), field('Versión actual', f.current_version),
      field('Fecha de inicio', f.start_date), field('Demo en vivo', f.demo_url),
      field('Documentación', f.docs_url), field('Logo / portada (URL)', f.cover_url),
      field('Lenguajes', f.languages, 'Separados por comas'), field('Frameworks', f.frameworks, 'Separados por comas'),
      field('Dependencias', f.dependencies, 'Separadas por comas'), field('Funcionalidades', f.features, 'Separadas por comas'),
      h('div', { class: 'span-2' }, field('Arquitectura técnica', f.architecture, 'Visible en el portfolio si el proyecto es público.')),
      h('div', { class: 'span-2' }, field('Notas de desarrollo (privadas)', f.dev_notes)),
      h('div', { class: 'span-2' }, field('Información de seguridad (privada)', f.security_notes)),
      h('div', { class: 'span-2' }, field('Resumen público', f.public_summary, 'Texto que verá el portfolio. Si está vacío se usa la descripción.')),
      h('div', { class: 'span-2 row', style: 'gap:24px' },
        h('label', { class: 'checkbox' }, f.info_verified, 'Datos verificados'),
        h('label', { class: 'checkbox' }, f.is_paused, 'En pausa'),
        h('label', { class: 'checkbox' }, f.is_public, 'Mostrar en portfolio público'))));

    const modal = openModal({
      title: project ? `Editar · ${project.name}` : 'Nuevo proyecto',
      body: form,
      footer: [h('button', { class: 'btn', type: 'button', onclick: () => modal.close() }, 'Cancelar'), save],
      onClose: () => resolve(saved),
    });
    f.name.focus();
  });
}
