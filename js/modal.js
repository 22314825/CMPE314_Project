/* ═══════════════════════════════════════════
   MODAL CONTROLLER — Multi-Assignee Tags + Validation
   Vertex KANBAN System
   ═══════════════════════════════════════════ */

const ModalController = (() => {
  let editingTaskId = null;
  let selectedAssignees = [];

  function init() {
    document.getElementById('taskModalClose').addEventListener('click', closeTaskModal);
    document.getElementById('taskModalCancel').addEventListener('click', closeTaskModal);
    document.getElementById('taskModalSave').addEventListener('click', saveTask);
    document.getElementById('taskModal').addEventListener('click', e => { if (e.target.id === 'taskModal') closeTaskModal(); });

    document.getElementById('projectModalClose').addEventListener('click', closeProjectModal);
    document.getElementById('projectModalCancel').addEventListener('click', closeProjectModal);
    document.getElementById('projectModalSave').addEventListener('click', saveProject);
    document.getElementById('projectModal').addEventListener('click', e => { if (e.target.id === 'projectModal') closeProjectModal(); });

    document.getElementById('detailClose').addEventListener('click', closeDetailModal);
    document.getElementById('detailDone').addEventListener('click', closeDetailModal);
    document.getElementById('taskDetailModal').addEventListener('click', e => { if (e.target.id === 'taskDetailModal') closeDetailModal(); });

    document.getElementById('colorPicker').addEventListener('click', e => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      document.querySelectorAll('.color-dot').forEach(d => { d.style.borderColor = 'transparent'; d.classList.remove('active'); });
      dot.style.borderColor = '#fff'; dot.classList.add('active');
    });

    document.getElementById('confirmCancel').addEventListener('click', closeConfirm);

    // Multi-assignee tag input
    initTagInput();

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeTaskModal(); closeProjectModal(); closeDetailModal(); closeConfirm(); document.getElementById('notifPanel').classList.remove('open'); }
    });
  }

  /* ── Multi-Assignee Tag Input ── */
  function initTagInput() {
    const input = document.getElementById('assigneeInput');
    const wrap = document.getElementById('assigneeWrap');
    const dropdown = document.getElementById('assigneeSuggestionsDropdown');

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (val && !selectedAssignees.includes(val)) {
          selectedAssignees.push(val);
          renderTags();
        }
        input.value = '';
        dropdown.classList.remove('open');
      }
      if (e.key === 'Backspace' && !input.value && selectedAssignees.length > 0) {
        selectedAssignees.pop();
        renderTags();
      }
    });

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (!val) { dropdown.classList.remove('open'); return; }
      const allAssignees = getAllKnownAssignees();
      const filtered = allAssignees.filter(a => a.toLowerCase().includes(val) && !selectedAssignees.includes(a));
      if (filtered.length === 0) { dropdown.classList.remove('open'); return; }
      dropdown.innerHTML = filtered.map(a => `<div class="tag-suggestion-item">${escHtml(a)}</div>`).join('');
      dropdown.classList.add('open');
      dropdown.querySelectorAll('.tag-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          if (!selectedAssignees.includes(item.textContent)) {
            selectedAssignees.push(item.textContent);
            renderTags();
          }
          input.value = '';
          dropdown.classList.remove('open');
          input.focus();
        });
      });
    });

    wrap.addEventListener('click', () => input.focus());
    document.addEventListener('click', e => { if (!wrap.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('open'); });
  }

  function renderTags() {
    const wrap = document.getElementById('assigneeWrap');
    const input = document.getElementById('assigneeInput');
    wrap.querySelectorAll('.assignee-tag').forEach(t => t.remove());
    selectedAssignees.forEach((name, idx) => {
      const tag = document.createElement('span');
      tag.className = 'assignee-tag';
      tag.innerHTML = `${escHtml(name)}<button type="button" data-idx="${idx}">×</button>`;
      tag.querySelector('button').addEventListener('click', e => {
        e.stopPropagation();
        selectedAssignees.splice(idx, 1);
        renderTags();
      });
      wrap.insertBefore(tag, input);
    });
    // Clear error if valid
    if (selectedAssignees.length > 0) document.getElementById('assigneeError').classList.remove('show');
  }

  function getAllKnownAssignees() {
    const allTasks = TaskManager.getAll();
    const set = new Set();
    allTasks.forEach(t => {
      if (Array.isArray(t.assignees)) t.assignees.forEach(a => set.add(a));
      else if (t.assignee) set.add(t.assignee);
    });
    return [...set].sort();
  }

  function updateAssigneeSuggestions() {
    const filterSelect = document.getElementById('filterAssignee');
    if (!filterSelect) return;
    const assignees = getAllKnownAssignees();
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Members</option>' +
      assignees.map(a => `<option value="${a}"${a === currentVal ? ' selected' : ''}>${a}</option>`).join('');
  }

  /* ── Task Modal ── */
  function openTaskModal(status, taskId) {
    editingTaskId = taskId || null;
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');
    const saveBtn = document.getElementById('taskModalSave');

    // Reset errors
    document.getElementById('dueDateError').classList.remove('show');
    document.getElementById('assigneeError').classList.remove('show');
    document.querySelectorAll('.form-input.invalid').forEach(el => el.classList.remove('invalid'));

    if (taskId) {
      const task = TaskManager.getById(taskId);
      if (!task) return;
      title.textContent = 'Edit Task';
      saveBtn.textContent = 'Save Changes';
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDesc').value = task.description;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskDue').value = task.dueDate;
      document.getElementById('taskReminder').value = task.reminder || '';
      document.getElementById('taskId').value = task.id;
      // Load assignees
      selectedAssignees = Array.isArray(task.assignees) ? [...task.assignees] : (task.assignee ? [task.assignee] : []);
    } else {
      title.textContent = 'Create Task';
      saveBtn.textContent = 'Create Task';
      document.getElementById('taskForm').reset();
      document.getElementById('taskStatus').value = status || 'todo';
      document.getElementById('taskId').value = '';
      selectedAssignees = [];
    }

    renderTags();
    modal.classList.add('active');
    setTimeout(() => document.getElementById('taskTitle').focus(), 200);
  }

  function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    editingTaskId = null;
    selectedAssignees = [];
  }

  function saveTask() {
    let valid = true;
    const titleInput = document.getElementById('taskTitle');
    const dueInput = document.getElementById('taskDue');

    if (!titleInput.value.trim()) { titleInput.classList.add('invalid'); valid = false; setTimeout(() => titleInput.classList.remove('invalid'), 1500); }
    if (!dueInput.value) { dueInput.classList.add('invalid'); document.getElementById('dueDateError').classList.add('show'); valid = false; setTimeout(() => { dueInput.classList.remove('invalid'); }, 1500); }
    if (selectedAssignees.length === 0) { document.getElementById('assigneeError').classList.add('show'); document.getElementById('assigneeWrap').style.borderColor = 'var(--priority-critical)'; valid = false; setTimeout(() => { document.getElementById('assigneeWrap').style.borderColor = ''; }, 1500); }

    if (!valid) return;

    const projectId = ProjectManager.getActive();
    if (!projectId) return;
    const user = AuthManager.getCurrentUser();

    const data = {
      projectId,
      title: titleInput.value.trim(),
      description: document.getElementById('taskDesc').value.trim(),
      priority: document.getElementById('taskPriority').value,
      status: document.getElementById('taskStatus').value,
      assignees: [...selectedAssignees],
      assignee: selectedAssignees[0] || '',
      dueDate: dueInput.value,
      reminder: document.getElementById('taskReminder').value,
      createdBy: user ? user.name : 'Unknown'
    };

    const taskId = document.getElementById('taskId').value;
    if (taskId) { TaskManager.update(taskId, data); } else { TaskManager.create(data); }

    closeTaskModal();
    updateAssigneeSuggestions();
    BoardRenderer.render();
  }

  /* ── Task Detail Modal ── */
  function openDetailModal(taskId) {
    const task = TaskManager.getById(taskId);
    if (!task) return;
    const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
    const priorityLabels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const overdue = TaskManager.isOverdue(task);
    const assignees = Array.isArray(task.assignees) ? task.assignees : (task.assignee ? [task.assignee] : []);

    document.getElementById('detailTitle').textContent = task.title;
    document.getElementById('detailBody').innerHTML = `
      ${task.description ? `<div class="detail-row"><div class="detail-label">Description</div><div class="detail-value desc">${escHtml(task.description)}</div></div>` : ''}
      <div class="detail-row"><div class="detail-label">Status</div><div class="detail-value"><span class="detail-status s-${task.status}">${statusLabels[task.status]}</span></div></div>
      <div class="detail-row"><div class="detail-label">Priority</div><div class="detail-value"><span class="task-badge badge-${task.priority}">${priorityLabels[task.priority]}</span></div></div>
      ${assignees.length ? `<div class="detail-row"><div class="detail-label">Assignees</div><div class="detail-value" style="display:flex;flex-wrap:wrap;gap:6px">${assignees.map(a => `<span class="assignee-tag" style="cursor:default">${escHtml(a)}</span>`).join('')}</div></div>` : ''}
      ${task.dueDate ? `<div class="detail-row"><div class="detail-label">Due Date</div><div class="detail-value${overdue ? '" style="color:var(--priority-critical);font-weight:600' : ''}">${fmtDate(task.dueDate)}${overdue ? ' (Overdue!)' : ''}</div></div>` : ''}
      ${task.reminder ? `<div class="detail-row"><div class="detail-label">Reminder</div><div class="detail-value">${fmtDateTime(task.reminder)}</div></div>` : ''}
      <div class="detail-row"><div class="detail-label">Created</div><div class="detail-value" style="color:var(--text-muted);font-size:12px">By ${escHtml(task.createdBy)} · ${fmtDate(task.createdAt)}</div></div>`;

    document.getElementById('detailEdit').onclick = () => { closeDetailModal(); openTaskModal(null, taskId); };
    document.getElementById('detailDelete').onclick = () => {
      closeDetailModal();
      showConfirm('Delete Task', `Delete "${task.title}"?`, () => { TaskManager.deleteTask(taskId); BoardRenderer.render(); App.renderSidebar(); });
    };
    document.getElementById('taskDetailModal').classList.add('active');
  }

  function closeDetailModal() { document.getElementById('taskDetailModal').classList.remove('active'); }
  function fmtDate(s) { const d = new Date(s); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
  function fmtDateTime(s) { const d = new Date(s); return `${fmtDate(s)} at ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ── Project Modal ── */
  function openProjectModal() {
    document.getElementById('projectForm').reset();
    document.querySelectorAll('.color-dot').forEach((d, i) => { d.style.borderColor = i === 0 ? '#fff' : 'transparent'; if (i === 0) d.classList.add('active'); else d.classList.remove('active'); });
    document.getElementById('projectModal').classList.add('active');
    setTimeout(() => document.getElementById('projectName').focus(), 200);
  }
  function closeProjectModal() { document.getElementById('projectModal').classList.remove('active'); }

  function saveProject() {
    const nameInput = document.getElementById('projectName');
    if (!nameInput.value.trim()) { nameInput.classList.add('invalid'); setTimeout(() => nameInput.classList.remove('invalid'), 1500); return; }
    const user = AuthManager.getCurrentUser();
    const project = ProjectManager.create(nameInput.value.trim(), document.getElementById('projectDesc').value.trim(), document.querySelector('.color-dot.active')?.dataset.color || '#06b6d4', user.userId, user.name);
    if (project) { ProjectManager.setActive(project.id); closeProjectModal(); App.renderSidebar(); App.onProjectSwitch(); }
  }

  /* ── Confirm ── */
  let confirmCb = null;
  function showConfirm(t, m, cb) {
    document.getElementById('confirmTitle').textContent = t;
    document.getElementById('confirmMsg').textContent = m;
    confirmCb = cb;
    document.getElementById('confirmOverlay').classList.add('active');
    document.getElementById('confirmOk').onclick = () => { if (confirmCb) confirmCb(); closeConfirm(); };
  }
  function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('active'); confirmCb = null; }

  return { init, openTaskModal, closeTaskModal, openProjectModal, closeProjectModal, openDetailModal, closeDetailModal, showConfirm, updateAssigneeSuggestions };
})();
