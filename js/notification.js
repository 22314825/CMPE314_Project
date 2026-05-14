/* ═══════════════════════════════════════════
   NOTIFICATION MANAGER — Activity Feed, Toasts, Reminders
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const NotificationManager = (() => {
  const NOTIFS_KEY = 'vertex_notifications';
  let reminderInterval = null;

  function getAll() {
    return JSON.parse(localStorage.getItem(NOTIFS_KEY) || '[]');
  }

  function save(notifs) {
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
  }

  function add(notif) {
    const all = getAll();
    all.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type: notif.type || 'info',
      text: notif.text,
      taskId: notif.taskId || '',
      projectId: notif.projectId || '',
      read: false,
      time: new Date().toISOString()
    });
    if (all.length > 50) all.length = 50;
    save(all);
    updateBadge();
    renderPanel();
    showToast(notif.type, stripHtml(notif.text));
  }

  function stripHtml(html) {
    const tmp = document.createElement('span');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function markAllRead() {
    const all = getAll();
    all.forEach(n => n.read = true);
    save(all);
    updateBadge();
  }

  function clearAll() {
    save([]);
    updateBadge();
    renderPanel();
  }

  function getUnreadCount() {
    return getAll().filter(n => !n.read).length;
  }

  function updateBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const count = getUnreadCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderPanel() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const all = getAll();

    if (all.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      return;
    }

    list.innerHTML = all.map(n => {
      const icons = {
        created: '✚',
        moved: '↗',
        updated: '✎',
        deleted: '✕',
        reminder: '⏰',
        info: 'ℹ'
      };
      const clickable = n.taskId ? 'style="cursor:pointer" data-task-id="' + n.taskId + '"' : '';
      return `
        <div class="notif-item ${n.read ? '' : 'unread'}" ${clickable}>
          <div class="notif-icon ${n.type}">${icons[n.type] || 'ℹ'}</div>
          <div>
            <div class="notif-text">${n.text}</div>
            <div class="notif-time">${timeAgo(n.time)}</div>
          </div>
        </div>`;
    }).join('');

    // Click handler: navigate to task
    list.querySelectorAll('.notif-item[data-task-id]').forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.dataset.taskId;
        const task = TaskManager.getById(taskId);
        if (task) {
          // Switch to task's project if needed
          if (task.projectId !== ProjectManager.getActive()) {
            ProjectManager.setActive(task.projectId);
            App.renderSidebar();
            App.onProjectSwitch();
          }
          // Close notification panel
          document.getElementById('notifPanel').classList.remove('open');
          // Open task detail
          ModalController.openDetailModal(taskId);
        }
      });
    });
  }

  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  /* ── Toast ── */
  function showToast(type, message, taskId) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { created: '✅', moved: '📋', updated: '✏️', deleted: '🗑️', reminder: '⏰', info: 'ℹ️' };
    const titles = { created: 'Task Created', moved: 'Task Moved', updated: 'Task Updated', deleted: 'Task Deleted', reminder: 'Reminder', info: 'Info' };

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (taskId) toast.style.cursor = 'pointer';
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${titles[type] || 'Notification'}</div>
        <div class="toast-msg">${message}</div>
        ${taskId ? '<div style="font-size:10px;color:var(--accent-cyan);margin-top:3px">Click to view →</div>' : ''}
      </div>`;

    if (taskId) {
      toast.addEventListener('click', () => {
        const task = TaskManager.getById(taskId);
        if (task) {
          if (task.projectId !== ProjectManager.getActive()) {
            ProjectManager.setActive(task.projectId);
            App.renderSidebar();
            App.onProjectSwitch();
          }
          ModalController.openDetailModal(taskId);
        }
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      });
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, taskId ? 8000 : 4000);
  }

  /* ── Reminder Checker ── */
  function startReminderChecker() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(checkReminders, 30000);
    checkReminders();
  }

  function checkReminders() {
    const allTasks = TaskManager.getAll();
    const now = new Date();

    allTasks.forEach(task => {
      // Check overdue
      if (TaskManager.isOverdue(task)) {
        const overdueKey = `vertex_overdue_${task.id}_${new Date().toDateString()}`;
        if (!sessionStorage.getItem(overdueKey)) {
          sessionStorage.setItem(overdueKey, '1');
          showToast('reminder', `"${task.title}" is overdue!`, task.id);
        }
      }
      // Check reminder time
      if (task.reminder) {
        const reminderTime = new Date(task.reminder);
        const diff = (reminderTime - now) / 60000;
        if (diff >= -1 && diff <= 1) {
          const remKey = `vertex_rem_${task.id}`;
          if (!sessionStorage.getItem(remKey)) {
            sessionStorage.setItem(remKey, '1');
            showToast('reminder', `Reminder: "${task.title}"`, task.id);
            add({ type: 'reminder', text: `Reminder for "<strong>${task.title}</strong>"`, taskId: task.id, projectId: task.projectId });
          }
        }
      }
    });
  }

  function stopReminderChecker() {
    if (reminderInterval) clearInterval(reminderInterval);
  }

  return { add, getAll, clearAll, markAllRead, getUnreadCount, updateBadge, renderPanel, showToast, startReminderChecker, stopReminderChecker };
})();
