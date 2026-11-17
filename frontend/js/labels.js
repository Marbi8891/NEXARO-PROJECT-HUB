// Spanish labels for API enum values.
export const CATEGORY = {
  artificial_intelligence: 'Inteligencia Artificial',
  saas: 'SaaS',
  web_development: 'Desarrollo Web',
  cybersecurity: 'Ciberseguridad',
  automation: 'Automatización',
  developer_tools: 'Herramientas de desarrollo',
  education: 'Educación',
  ecommerce: 'E-commerce',
  research: 'Investigación',
  other: 'Otro',
  pending: 'Pendiente',
};

export const STATUS = {
  idea: { label: 'Idea', variant: '' },
  planning: { label: 'Planificación', variant: 'info' },
  in_development: { label: 'En desarrollo', variant: 'accent' },
  testing: { label: 'Testing', variant: 'warning' },
  production: { label: 'Producción', variant: 'success' },
  maintenance: { label: 'Mantenimiento', variant: 'info' },
  archived: { label: 'Archivado', variant: '' },
};

export const PRIORITY = {
  low: { label: 'Baja', variant: '' },
  medium: { label: 'Media', variant: 'info' },
  high: { label: 'Alta', variant: 'warning' },
  critical: { label: 'Crítica', variant: 'danger' },
};

export const TASK_STATUS = { todo: 'Por hacer', in_progress: 'En curso', done: 'Hecha' };

export const ATTENTION = {
  pending_verification: 'Datos pendientes de verificar',
  overdue_tasks: 'Tareas vencidas',
  stale: 'Sin actualizar en 30 días',
  no_repository: 'Sin repositorio vinculado',
};

export const ACTIONS = {
  'project.create': 'Proyecto creado',
  'project.update': 'Proyecto editado',
  'project.status': 'Estado cambiado',
  'project.delete': 'Proyecto eliminado',
  'task.create': 'Tarea creada',
  'task.update': 'Tarea actualizada',
  'task.delete': 'Tarea eliminada',
  'github.connect': 'GitHub conectado',
  'github.disconnect': 'GitHub desconectado',
  'github.import': 'Repositorio importado',
  'github.sync': 'Repositorio sincronizado',
  'repository.link': 'Repositorio vinculado',
  'repository.remove': 'Repositorio quitado',
};

export const options = (map, { withEmpty } = {}) => {
  const entries = Object.entries(map).filter(([k]) => k !== 'pending').map(([k, v]) => [k, typeof v === 'string' ? v : v.label]);
  return withEmpty ? [['', withEmpty], ...entries] : entries;
};
