/* ═══════════════════════════════════════════
   BOARD RENDERER — Kanban Columns + Drag & Drop
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const BoardRenderer = (() => {
  const statusMap = {
    todo: { bodyId: 'bodyTodo', countId: 'countTodo' },
    inprogress: { bodyId: 'bodyProgress', countId: 'countProgress' },
    done: { bodyId: 'bodyDone', countId: 'countDone' }
  };

  let searchQuery = '';
  let filterPriority = '';
  let filterAssignee = '';

  function render() {
    const projectId = ProjectManager.getActive();
    if (!projectId) {
      Object.values(statusMap).forEach(s => {
        document.getElementById(s.bodyId).innerHTML = '<div class="empty-state"><p>Select or create a project</p></div>';
        document.getElementById(s.countId).textContent = '0';
      });
      return;
    }

    const allTasks = TaskManager.getByProject(projectId);

    ['todo', 'inprogress', 'done'].forEach(status => {
      let tasks = allTasks.filter(t => t.status === status);

      // Apply filters
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
      }
      if (filterPriority) tasks = tasks.filter(t => t.priority === filterPriority);
      if (filterAssignee) tasks = tasks.filter(t => {
        if (Array.isArray(t.assignees)) return t.assignees.includes(filterAssignee);
        return t.assignee === filterAssignee;
      });

      const body = document.getElementById(statusMap[status].bodyId);
      const count = document.getElementById(statusMap[status].countId);
      count.textContent = tasks.length;

      if (tasks.length === 0) {
        body.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg><p>No tasks here</p></div>';
        return;
      }

      body.innerHTML = tasks.map(task => renderCard(task)).join('');
    });

    initDragAndDrop();
  }

  function renderCard(task) {
    const overdue = TaskManager.isOverdue(task);
    const assignees = Array.isArray(task.assignees) ? task.assignees : (task.assignee ? [task.assignee] : []);
    const dueDateStr = task.dueDate ? formatDate(task.dueDate) : '';

    const avatarHtml = assignees.length > 0
      ? `<div class="assignee-stack">${assignees.slice(0, 3).map(a =>
          `<div class="task-avatar" title="${escHtml(a)}">${AuthManager.getInitials(a)}</div>`
        ).join('')}${assignees.length > 3 ? `<div class="task-avatar" title="${assignees.length - 3} more" style="background:var(--bg-glass);color:var(--text-muted);font-size:9px">+${assignees.length - 3}</div>` : ''}</div>`
      : '';

    return `
      <div class="task-card priority-${task.priority}" draggable="true" data-task-id="${task.id}">
        <div class="task-card-header">
          <div class="task-card-title">${escHtml(task.title)}</div>
          <button class="btn-icon task-card-menu" onclick="App.showCardMenu(event, '${task.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
        ${task.description ? `<div class="task-card-desc">${escHtml(task.description)}</div>` : ''}
        <div class="task-card-footer">
          <div class="task-card-meta">
            <span class="task-badge badge-${task.priority}">${task.priority}</span>
            ${dueDateStr ? `<span class="task-date ${overdue ? 'overdue' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${dueDateStr}
            </span>` : ''}
          </div>
          ${avatarHtml}
        </div>
      </div>`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Drag & Drop + Click to View ── */
  function initDragAndDrop() {
    const cards = document.querySelectorAll('.task-card');
    const columns = document.querySelectorAll('.column');

    cards.forEach(card => {
      let didDrag = false;

      card.addEventListener('dragstart', e => {
        didDrag = true;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.taskId);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        columns.forEach(col => col.classList.remove('drag-over'));
        setTimeout(() => { didDrag = false; }, 100);
      });

      // Click to open detail view (View Tasks use case)
      card.addEventListener('click', e => {
        if (didDrag) return;
        if (e.target.closest('.task-card-menu')) return; // don't open on menu click
        ModalController.openDetailModal(card.dataset.taskId);
      });
    });

    columns.forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', e => {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
      });

      col.addEventListener('drop', e => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        if (taskId && newStatus) {
          const task = TaskManager.getById(taskId);
          if (task && task.status !== newStatus) {
            TaskManager.moveTask(taskId, newStatus);
            render();
          }
        }
      });
    });
  }

  function setSearch(q) { searchQuery = q; render(); }
  function setPriorityFilter(p) { filterPriority = p; render(); }
  function setAssigneeFilter(a) { filterAssignee = a; render(); }

  return { render, setSearch, setPriorityFilter, setAssigneeFilter };
})();
