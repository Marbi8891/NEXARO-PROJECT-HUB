import { h } from '../ui/dom.js';
import { emptyState } from '../ui/components.js';

const DESCRIPTIONS = {
  development: 'Kanban, roadmaps, hitos e historial de versiones. Mientras tanto, cada proyecto ya tiene su lista de tareas.',
  documentation: 'Centro de documentación por proyecto (Markdown, diagramas, enlaces externos).',
  ai: 'Analista IA con Claude API y Ollama, separando hallazgos verificados de sugerencias.',
  workspace: 'Gestión de CLAUDE.md, skills, agentes, hooks y configuraciones MCP con aprobación explícita.',
  analytics: 'Analítica avanzada: actividad de commits, histórico y finalización de tareas.',
};

export function renderPlaceholder(ctx, nav) {
  ctx.container.append(
    h('div', { class: 'page-header' }, h('div', {}, h('h1', {}, nav.label))),
    h('div', { class: 'card' }, emptyState({
      iconName: nav.icon,
      title: `Planificado para la fase ${nav.phase}`,
      text: `${DESCRIPTIONS[nav.path] || ''} Esta sección todavía no está implementada; no muestra datos simulados.`,
    })),
  );
}
