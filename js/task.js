/* ═══════════════════════════════════════════
   TASK MANAGER — CRUD, Move, Filter
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const TaskManager = (() => {
  const TASKS_KEY = 'vertex_tasks';

  function getAll() {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
  }

  function save(tasks) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function genId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getByProject(projectId) {
    return getAll().filter(t => t.projectId === projectId);
  }

  function getByStatus(projectId, status) {
    return getByProject(projectId).filter(t => t.status === status);
  }

  function create(data) {
    const task = {
      id: genId(),
      projectId: data.projectId,
      title: data.title.trim(),
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignees: Array.isArray(data.assignees) ? data.assignees : (data.assignee ? [data.assignee] : []),
      assignee: data.assignee || (Array.isArray(data.assignees) ? data.assignees[0] : '') || '',
      dueDate: data.dueDate || '',
      reminder: data.reminder || '',
      createdBy: data.createdBy || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const all = getAll();
    all.push(task);
    save(all);

    NotificationManager.add({
      type: 'created',
      text: `<strong>${task.createdBy}</strong> created task "<strong>${task.title}</strong>"`,
      taskId: task.id,
      projectId: task.projectId
    });

    return task;
  }

  function update(id, data) {
    const all = getAll();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const old = all[idx];
    Object.assign(all[idx], data, { updatedAt: new Date().toISOString() });
    save(all);

    const user = AuthManager.getCurrentUser();
    NotificationManager.add({
      type: 'updated',
      text: `<strong>${user?.name || 'Someone'}</strong> updated task "<strong>${all[idx].title}</strong>"`,
      taskId: id,
      projectId: all[idx].projectId
    });

    return all[idx];
  }

  function moveTask(id, newStatus) {
    const all = getAll();
    const task = all.find(t => t.id === id);
    if (!task) return null;

    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    save(all);

    const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
    const user = AuthManager.getCurrentUser();
    NotificationManager.add({
      type: 'moved',
      text: `<strong>${user?.name || 'Someone'}</strong> moved "<strong>${task.title}</strong>" to <strong>${statusLabels[newStatus]}</strong>`,
      taskId: task.id,
      projectId: task.projectId
    });

    return task;
  }

  function deleteTask(id) {
    const all = getAll();
    const task = all.find(t => t.id === id);
    if (!task) return;

    const user = AuthManager.getCurrentUser();
    NotificationManager.add({
      type: 'deleted',
      text: `<strong>${user?.name || 'Someone'}</strong> deleted task "<strong>${task.title}</strong>"`,
      projectId: task.projectId
    });

    save(all.filter(t => t.id !== id));
  }

  function deleteByProject(projectId) {
    save(getAll().filter(t => t.projectId !== projectId));
  }

  function getById(id) {
    return getAll().find(t => t.id === id) || null;
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  }

  function isDueSoon(task) {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    const now = new Date();
    const diff = (due - now) / (1000 * 60 * 60);
    return diff > 0 && diff <= 24;
  }

  return { getAll, getByProject, getByStatus, create, update, moveTask, deleteTask, deleteByProject, getById, isOverdue, isDueSoon };
})();
