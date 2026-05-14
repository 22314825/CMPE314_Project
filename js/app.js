/* ═══════════════════════════════════════════
   APP CONTROLLER — Main Entry Point
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const App = (() => {
  function init() {
    ModalController.init();

    // Check session
    const user = AuthManager.getCurrentUser();
    if (user) {
      showAppView(user);
    } else {
      showAuthView();
    }

    // Auth tab toggle
    document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('registerTab').addEventListener('click', () => switchAuthTab('register'));

    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Add project button
    document.getElementById('addProjectBtn').addEventListener('click', () => ModalController.openProjectModal());

    // Add task buttons (column footers)
    document.querySelectorAll('.add-task-btn[data-status]').forEach(btn => {
      btn.addEventListener('click', () => ModalController.openTaskModal(btn.dataset.status));
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', e => {
      BoardRenderer.setSearch(e.target.value);
    });

    // Filters
    document.getElementById('filterPriority').addEventListener('change', e => {
      BoardRenderer.setPriorityFilter(e.target.value);
    });
    document.getElementById('filterAssignee').addEventListener('change', e => {
      BoardRenderer.setAssigneeFilter(e.target.value);
    });

    // Notification bell & panel
    document.getElementById('notifBtn').addEventListener('click', toggleNotifPanel);
    document.getElementById('notifCloseBtn').addEventListener('click', () => {
      document.getElementById('notifPanel').classList.remove('open');
    });
    document.getElementById('clearNotifs').addEventListener('click', () => {
      NotificationManager.clearAll();
    });

    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Guide toggle
    document.getElementById('guideToggle').addEventListener('click', () => {
      document.getElementById('sidebarGuide').classList.toggle('open');
    });

    // Responsive check
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
  }

  /* ── Auth ── */
  function switchAuthTab(tab) {
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('registerTab').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    document.getElementById('loginError').textContent = '';
    document.getElementById('regError').textContent = '';
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const result = AuthManager.login(email, password);
    if (result.ok) {
      showAppView(result.user);
    } else {
      document.getElementById('loginError').textContent = result.msg;
    }
  }

  function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const result = AuthManager.register(name, email, password);
    if (result.ok) {
      seedDemoData(result.user);
      showAppView(AuthManager.getCurrentUser());
    } else {
      document.getElementById('regError').textContent = result.msg;
    }
  }

  function handleLogout() {
    AuthManager.logout();
    NotificationManager.stopReminderChecker();
    showAuthView();
  }

  /* ── Views ── */
  function showAuthView() {
    document.getElementById('authView').classList.add('active');
    document.getElementById('appView').classList.remove('active');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
  }

  function showAppView(user) {
    document.getElementById('authView').classList.remove('active');
    document.getElementById('appView').classList.add('active');

    // Set user info
    const u = AuthManager.getCurrentUser();
    document.getElementById('userName').textContent = u.name;
    document.getElementById('userEmail').textContent = u.email;
    document.getElementById('userAvatar').textContent = AuthManager.getInitials(u.name);

    renderSidebar();
    onProjectSwitch();
    NotificationManager.updateBadge();
    NotificationManager.renderPanel();
    NotificationManager.startReminderChecker();
  }

  /* ── Sidebar ── */
  function renderSidebar() {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    const projects = ProjectManager.getByUser(user.userId);
    const activeId = ProjectManager.getActive();
    const list = document.getElementById('projectList');

    if (projects.length === 0) {
      list.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:13px;text-align:center">No projects yet</div>';
      return;
    }

    list.innerHTML = projects.map(p => {
      const taskCount = TaskManager.getByProject(p.id).length;
      return `
        <div class="project-item ${p.id === activeId ? 'active' : ''}" data-project-id="${p.id}">
          <div class="project-dot" style="background:${p.color}"></div>
          <div class="project-item-name">${escHtml(p.name)}</div>
          <div class="project-item-count">${taskCount}</div>
        </div>`;
    }).join('');

    // Click to switch
    list.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', () => {
        ProjectManager.setActive(item.dataset.projectId);
        renderSidebar();
        onProjectSwitch();
        document.getElementById('sidebar').classList.remove('open');
      });

      // Right-click to delete
      item.addEventListener('contextmenu', e => {
        e.preventDefault();
        const pid = item.dataset.projectId;
        const project = ProjectManager.getById(pid);
        ModalController.showConfirm(
          'Delete Project',
          `Delete "${project?.name}"? All tasks will be removed.`,
          () => {
            ProjectManager.deleteProject(pid);
            renderSidebar();
            onProjectSwitch();
          }
        );
      });
    });
  }

  function onProjectSwitch() {
    const projectId = ProjectManager.getActive();
    const project = projectId ? ProjectManager.getById(projectId) : null;
    document.getElementById('topbarTitle').textContent = project ? project.name : 'Select a Project';
    ModalController.updateAssigneeSuggestions();
    BoardRenderer.render();
  }

  /* ── Card Context Menu ── */
  function showCardMenu(e, taskId) {
    e.stopPropagation();
    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <button onclick="App.viewTask('${taskId}')">👁️ View Details</button>
      <button onclick="App.editTask('${taskId}')">✏️ Edit</button>
      <button class="danger" onclick="App.confirmDeleteTask('${taskId}')">🗑️ Delete</button>`;

    const card = e.target.closest('.task-card');
    card.style.position = 'relative';
    menu.style.top = '30px';
    menu.style.right = '8px';
    card.appendChild(menu);

    const close = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  function viewTask(taskId) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    ModalController.openDetailModal(taskId);
  }

  function editTask(taskId) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    ModalController.openTaskModal(null, taskId);
  }

  function confirmDeleteTask(taskId) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    const task = TaskManager.getById(taskId);
    ModalController.showConfirm(
      'Delete Task',
      `Delete "${task?.title}"? This cannot be undone.`,
      () => { TaskManager.deleteTask(taskId); BoardRenderer.render(); renderSidebar(); }
    );
  }

  /* ── Notification Panel ── */
  function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      NotificationManager.markAllRead();
      NotificationManager.updateBadge();
      NotificationManager.renderPanel();
    }
  }

  /* ── Demo Data ── */
  function seedDemoData(user) {
    const project = ProjectManager.create('Vertex KANBAN Project', 'CMPE314 Software Engineering — Task Management System', '#1a8a7d', user.userId, user.name);
    if (!project) return;

    const today = new Date();
    const d = (offset) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().split('T')[0]; };

    const tasks = [
      { title: 'Requirements Gathering', description: 'Collect and document system requirements from stakeholders', status: 'done', priority: 'high', assignees: ['Baran Koç'], dueDate: d(-10) },
      { title: 'Use Case Analysis', description: 'Create UML use case diagrams for the system', status: 'done', priority: 'high', assignees: ['Baran Koç'], dueDate: d(-7) },
      { title: 'System Architecture Design', description: 'Design the overall system architecture and tech stack', status: 'done', priority: 'critical', assignees: ['Efe Kemal Kayış'], dueDate: d(-5) },
      { title: 'Database Design', description: 'Design MongoDB schema for tasks, projects, users', status: 'inprogress', priority: 'high', assignees: ['Efe Kemal Kayış', 'Berk Elmalı'], dueDate: d(2) },
      { title: 'UI/UX Prototyping', description: 'Create wireframes and mockups for the Kanban interface', status: 'inprogress', priority: 'medium', assignees: ['Berk Elmalı'], dueDate: d(3) },
      { title: 'Frontend Development', description: 'Implement the Kanban board with drag-and-drop functionality', status: 'inprogress', priority: 'critical', assignees: ['Berk Elmalı'], dueDate: d(5) },
      { title: 'Backend API Development', description: 'Build Node.js REST API for task CRUD operations', status: 'todo', priority: 'high', assignees: ['Efe Kemal Kayış'], dueDate: d(7) },
      { title: 'Setup Dev Environment', description: 'Configure Git, Node.js, MongoDB for the team', status: 'done', priority: 'medium', assignees: ['Emirhan Keskin'], dueDate: d(-8) },
      { title: 'Unit Testing', description: 'Write unit tests for core task management modules', status: 'todo', priority: 'medium', assignees: ['Emirhan Keskin', 'Berk Elmalı'], dueDate: d(10) },
      { title: 'API Integration', description: 'Connect frontend components with backend REST API endpoints', status: 'todo', priority: 'high', assignees: ['Berk Elmalı', 'Efe Kemal Kayış'], dueDate: d(12) },
      { title: 'Bug Fixing & QA', description: 'Fix bugs found during integration and user testing', status: 'todo', priority: 'medium', assignees: ['Efe Kemal Kayış', 'Berk Elmalı'], dueDate: d(14) },
      { title: 'Project Documentation', description: 'Write final project report, user manual, and deployment guide', status: 'todo', priority: 'low', assignees: ['Baran Koç', 'Emirhan Keskin'], dueDate: d(15) },
    ];

    tasks.forEach(t => {
      TaskManager.create({ ...t, projectId: project.id, createdBy: user.name });
    });

    ProjectManager.setActive(project.id);
  }

  /* ── Responsive ── */
  function checkResponsive() {
    const toggle = document.getElementById('menuToggle');
    toggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { init, renderSidebar, onProjectSwitch, showCardMenu, viewTask, editTask, confirmDeleteTask };
})();

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', App.init);
