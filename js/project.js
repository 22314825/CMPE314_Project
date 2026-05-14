/* ═══════════════════════════════════════════
   PROJECT MANAGER — Create, Switch, Delete Projects
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const ProjectManager = (() => {
  const PROJECTS_KEY = 'vertex_projects';
  const ACTIVE_KEY = 'vertex_active_project';

  function getAll() {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
  }

  function save(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  function getByUser(userId) {
    const user = AuthManager.getCurrentUser();
    const userName = user ? user.name : '';
    return getAll().filter(p => p.ownerId === userId || (p.members && (p.members.includes(userId) || p.members.includes(userName))));
  }

  function create(name, description, color, ownerId, ownerName) {
    if (!name || !name.trim()) return null;
    const project = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name.trim(),
      description: description || '',
      color: color || '#06b6d4',
      ownerId,
      members: [ownerName],
      createdAt: new Date().toISOString()
    };
    const all = getAll();
    all.push(project);
    save(all);
    return project;
  }

  function deleteProject(projectId) {
    const all = getAll().filter(p => p.id !== projectId);
    save(all);
    // Also remove tasks for this project
    TaskManager.deleteByProject(projectId);
    if (getActive() === projectId) {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }

  function getActive() {
    return localStorage.getItem(ACTIVE_KEY);
  }

  function setActive(projectId) {
    localStorage.setItem(ACTIVE_KEY, projectId);
  }

  function getById(projectId) {
    return getAll().find(p => p.id === projectId) || null;
  }

  function addMember(projectId, memberName) {
    const all = getAll();
    const project = all.find(p => p.id === projectId);
    if (project && !project.members.includes(memberName)) {
      project.members.push(memberName);
      save(all);
    }
  }

  function getMembers(projectId) {
    const project = getById(projectId);
    return project ? project.members : [];
  }

  return { getAll, getByUser, create, deleteProject, getActive, setActive, getById, addMember, getMembers };
})();
