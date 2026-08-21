/**
 * Team Work Status Dashboard
 * ZIP Based File Exchange Manual Tracker - Connected to PostgreSQL
 * With Multi-Dev Project Coordination & Completion Alerts
 */

// State
let entries = [];
let currentEditingId = null;
let currentStatusTargetId = null;
let currentModalFiles = [];
let isPostgresConnected = false;

// DOM Elements
const workingTableBody = document.getElementById('workingTableBody');
const completedTableBody = document.getElementById('completedTableBody');
const workingBadgeCount = document.getElementById('workingBadgeCount');
const completedBadgeCount = document.getElementById('completedBadgeCount');
const workingCount = document.getElementById('workingCount');
const completedCount = document.getElementById('completedCount');
const workingEmptyState = document.getElementById('workingEmptyState');
const completedEmptyState = document.getElementById('completedEmptyState');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const codebaseFilter = document.getElementById('codebaseFilter');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');
const refreshBtn = document.getElementById('refreshBtn');
const resetDemoBtn = document.getElementById('resetDemoBtn');
const dbStatusBadge = document.getElementById('dbStatusBadge');

// Modals
const entryModal = document.getElementById('entryModal');
const modalTitle = document.getElementById('modalTitle');
const entryForm = document.getElementById('entryForm');
const entryIdInput = document.getElementById('entryId');
const memberNameInput = document.getElementById('memberNameInput');
const codebaseInput = document.getElementById('codebaseInput');
const taskInput = document.getElementById('taskInput');
const commentInput = document.getElementById('commentInput');
const fileTagInput = document.getElementById('fileTagInput');
const fileTagsList = document.getElementById('fileTagsList');
const addFileTagBtn = document.getElementById('addFileTagBtn');
const filesCountBadge = document.getElementById('filesCountBadge');
const addEntryBtn = document.getElementById('addEntryBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');

// Same Project Notice
const sameProjectNotice = document.getElementById('sameProjectNotice');
const sameProjectNoticeText = document.getElementById('sameProjectNoticeText');

// Status Modal
const statusModal = document.getElementById('statusModal');
const statusModalMember = document.getElementById('statusModalMember');
const statusModalTask = document.getElementById('statusModalTask');
const statusModalCodebase = document.getElementById('statusModalCodebase');
const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
const cancelStatusModalBtn = document.getElementById('cancelStatusModalBtn');

// All Files Modal
const allFilesModal = document.getElementById('allFilesModal');
const allFilesTitle = document.getElementById('allFilesTitle');
const allFilesOwner = document.getElementById('allFilesOwner');
const allFilesTask = document.getElementById('allFilesTask');
const allFilesList = document.getElementById('allFilesList');
const closeAllFilesModalBtn = document.getElementById('closeAllFilesModalBtn');
const closeAllFilesBtn = document.getElementById('closeAllFilesBtn');
const copyAllFilesBtn = document.getElementById('copyAllFilesBtn');
let currentViewingFiles = [];

// Sync Alert Modal (Completion Notice)
const syncAlertModal = document.getElementById('syncAlertModal');
const syncAlertCompletedText = document.getElementById('syncAlertCompletedText');
const syncCoworkersList = document.getElementById('syncCoworkersList');
const syncCopyableMessage = document.getElementById('syncCopyableMessage');
const copySyncMessageBtn = document.getElementById('copySyncMessageBtn');
const closeSyncAlertBtn = document.getElementById('closeSyncAlertBtn');
const doneSyncAlertBtn = document.getElementById('doneSyncAlertBtn');

// Form error fields
const memberNameError = document.getElementById('memberNameError');
const codebaseError = document.getElementById('codebaseError');
const taskError = document.getElementById('taskError');
const commentError = document.getElementById('commentError');
const filesError = document.getElementById('filesError');

// Toast
const toastContainer = document.getElementById('toastContainer');

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 200);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateDbBadge(connected) {
  isPostgresConnected = connected;
  if (!dbStatusBadge) return;
  if (connected) {
    dbStatusBadge.className = 'db-status-pill';
    dbStatusBadge.innerHTML = '<span class="db-dot"></span> PostgreSQL Live';
    dbStatusBadge.title = 'Connected to PostgreSQL database (teamdashboard)';
  } else {
    dbStatusBadge.className = 'db-status-pill offline';
    dbStatusBadge.innerHTML = '<span class="db-dot"></span> DB Offline';
    dbStatusBadge.title = 'PostgreSQL server is unreachable';
  }
}

// Fetch all entries from PostgreSQL backend
async function fetchEntries() {
  try {
    const res = await fetch('/api/entries');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success) {
      entries = data.entries || [];
      if (data.lastUpdatedTime) {
        lastUpdatedTime.textContent = data.lastUpdatedTime;
      }
      updateDbBadge(true);
      renderDashboard();
    }
  } catch (err) {
    console.error('Failed to load entries from PostgreSQL:', err);
    updateDbBadge(false);
  }
}

// Codebase Filter Population
function updateCodebaseFilterOptions() {
  const currentSelection = codebaseFilter.value;
  const uniqueCodebases = Array.from(new Set(entries.map(e => e.codebase?.trim()).filter(Boolean))).sort();
  
  codebaseFilter.innerHTML = '<option value="">All Codebases</option>';
  uniqueCodebases.forEach(cb => {
    const opt = document.createElement('option');
    opt.value = cb;
    opt.textContent = cb;
    if (cb === currentSelection) opt.selected = true;
    codebaseFilter.appendChild(opt);
  });
}

// Check if multiple developers are working on the same codebase
function getActiveCodebaseDevCount(codebase) {
  if (!codebase) return 0;
  return entries.filter(e => e.status === 'working' && e.codebase.toLowerCase() === codebase.toLowerCase()).length;
}

// Check other developers working on the same codebase
function checkSameProjectCollaborators() {
  const selectedCodebase = codebaseInput.value.trim().toLowerCase();
  const currentMember = memberNameInput.value.trim().toLowerCase();

  if (!selectedCodebase) {
    sameProjectNotice.style.display = 'none';
    return;
  }

  const otherActiveDevs = entries.filter(e => {
    const isSameCodebase = (e.codebase || '').trim().toLowerCase() === selectedCodebase;
    const isWorking = e.status === 'working';
    const isDifferentEntry = currentEditingId ? e.id.toString() !== currentEditingId.toString() : true;
    const isDifferentPerson = currentMember ? (e.memberName || '').trim().toLowerCase() !== currentMember : true;
    return isSameCodebase && isWorking && isDifferentEntry && isDifferentPerson;
  });

  if (otherActiveDevs.length > 0) {
    const devNamesList = otherActiveDevs.map(d => `<strong>${escapeHtml(d.memberName)}</strong> (Task: <code>${escapeHtml(d.task)}</code>)`).join(', ');
    sameProjectNoticeText.innerHTML = `⚠️ ${devNamesList} is already actively working on this codebase. Please keep on updating and coordinate file changes with them to avoid ZIP conflicts!`;
    sameProjectNotice.style.display = 'block';
  } else {
    sameProjectNotice.style.display = 'none';
  }
}

codebaseInput.addEventListener('input', checkSameProjectCollaborators);
memberNameInput.addEventListener('input', checkSameProjectCollaborators);

// Rendering Dashboard Tables
function renderDashboard() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCodebase = codebaseFilter.value;

  const filtered = entries.filter(item => {
    if (selectedCodebase && item.codebase !== selectedCodebase) {
      return false;
    }

    if (!searchTerm) return true;

    const memberMatch = (item.memberName || '').toLowerCase().includes(searchTerm);
    const codebaseMatch = (item.codebase || '').toLowerCase().includes(searchTerm);
    const taskMatch = (item.task || '').toLowerCase().includes(searchTerm);
    const commentMatch = (item.comment || '').toLowerCase().includes(searchTerm);
    const filesMatch = (item.files || []).some(f => f.toLowerCase().includes(searchTerm));

    return memberMatch || codebaseMatch || taskMatch || commentMatch || filesMatch;
  });

  const workingList = filtered.filter(item => item.status === 'working');
  const completedList = filtered.filter(item => item.status === 'completed');

  // Count summaries
  workingCount.textContent = workingList.length;
  completedCount.textContent = completedList.length;
  workingBadgeCount.textContent = workingList.length;
  completedBadgeCount.textContent = completedList.length;

  // Render Working Table
  renderTableRows(workingTableBody, workingList, 'working');
  workingEmptyState.style.display = workingList.length === 0 ? 'block' : 'none';

  // Render Completed Table
  renderTableRows(completedTableBody, completedList, 'completed');
  completedEmptyState.style.display = completedList.length === 0 ? 'block' : 'none';

  updateCodebaseFilterOptions();
}

function renderTableRows(tbody, items, type) {
  tbody.innerHTML = '';

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;

    // Files rendering
    const MAX_VISIBLE_FILES = 4;
    const fileCount = (item.files || []).length;
    let filesHtml = '<ul class="files-list">';

    if (fileCount === 0) {
      filesHtml += '<li class="file-item"><span class="file-bullet">•</span> <span style="color:#94a3b8;">(None listed)</span></li>';
    } else {
      const visibleFiles = item.files.slice(0, MAX_VISIBLE_FILES);
      visibleFiles.forEach(fileName => {
        filesHtml += `
          <li class="file-item">
            <span class="file-bullet">•</span>
            <span class="file-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
          </li>
        `;
      });

      if (fileCount > MAX_VISIBLE_FILES) {
        const remaining = fileCount - MAX_VISIBLE_FILES;
        filesHtml += `
          <li>
            <button type="button" class="file-more-btn" onclick="openAllFilesModal('${item.id}')">+ ${remaining} more files</button>
          </li>
        `;
      }
    }
    filesHtml += '</ul>';

    const statusBadge = type === 'working' 
      ? `<span class="status-pill status-pill-working"><span class="dot dot-working"></span> Working</span>`
      : `<span class="status-pill status-pill-completed"><span class="dot dot-completed"></span> Completed</span>`;

    const timestampCol = type === 'working' 
      ? `<span class="timestamp-text">${escapeHtml(item.lastUpdated || '-')}</span>`
      : `<span class="timestamp-text">${escapeHtml(item.completedOn || item.lastUpdated || '-')}</span>`;

    // Multi-dev tag if 2 or more working on this codebase
    const activeDevCount = type === 'working' ? getActiveCodebaseDevCount(item.codebase) : 0;
    const multiDevBadge = (type === 'working' && activeDevCount > 1) 
      ? `<br><span class="multi-dev-tag" title="Multiple developers are actively working on this codebase">⚠️ ${activeDevCount} Devs Working</span>` 
      : '';

    tr.innerHTML = `
      <td class="text-center row-index">${index + 1}</td>
      <td><div class="member-name">${escapeHtml(item.memberName)}</div></td>
      <td>
        <div class="codebase-name">${escapeHtml(item.codebase)}</div>
        ${multiDevBadge}
      </td>
      <td><span class="task-name">${escapeHtml(item.task)}</span></td>
      <td><div class="comment-text">${escapeHtml(item.comment)}</div></td>
      <td>${filesHtml}</td>
      <td class="text-center">${statusBadge}</td>
      <td>${timestampCol}</td>
      <td class="text-center">
        <div class="action-buttons-group">
          <button type="button" class="btn-action btn-action-edit" onclick="openEditModal('${item.id}')" title="Edit Entry Details">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Edit</span>
          </button>
          <button type="button" class="btn-action btn-action-status" onclick="openStatusModal('${item.id}')" title="Change Status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            <span>Status Update</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// File Tags Input Logic
function renderFileTags() {
  fileTagsList.innerHTML = '';
  currentModalFiles.forEach((file, idx) => {
    const tag = document.createElement('div');
    tag.className = 'file-tag';
    tag.innerHTML = `
      <span>${escapeHtml(file)}</span>
      <button type="button" class="file-tag-remove" aria-label="Remove ${escapeHtml(file)}" onclick="removeFileTag(${idx})">×</button>
    `;
    fileTagsList.appendChild(tag);
  });
  filesCountBadge.textContent = `${currentModalFiles.length} file${currentModalFiles.length === 1 ? '' : 's'}`;
}

window.removeFileTag = function(idx) {
  currentModalFiles.splice(idx, 1);
  renderFileTags();
};

function addFilesFromInput(inputStr) {
  if (!inputStr) return;
  const rawNames = inputStr.split(/[\n,;]+/);
  let addedCount = 0;

  rawNames.forEach(name => {
    const cleaned = name.trim().replace(/^[\s•*-]+/, '').trim();
    if (cleaned && !currentModalFiles.includes(cleaned)) {
      currentModalFiles.push(cleaned);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    renderFileTags();
    filesError.style.display = 'none';
  }
}

fileTagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = fileTagInput.value;
    if (val.trim()) {
      addFilesFromInput(val);
      fileTagInput.value = '';
    }
  }
});

fileTagInput.addEventListener('paste', (e) => {
  setTimeout(() => {
    const val = fileTagInput.value;
    if (val.includes('\n') || val.includes(',')) {
      addFilesFromInput(val);
      fileTagInput.value = '';
    }
  }, 0);
});

addFileTagBtn.addEventListener('click', () => {
  const val = fileTagInput.value;
  if (val.trim()) {
    addFilesFromInput(val);
    fileTagInput.value = '';
  }
});

// Modal Open / Close Logic
function openAddModal() {
  currentEditingId = null;
  modalTitle.textContent = 'Add New Entry';
  entryIdInput.value = '';
  memberNameInput.value = '';
  codebaseInput.value = '';
  taskInput.value = '';
  commentInput.value = '';
  fileTagInput.value = '';
  currentModalFiles = [];
  deleteEntryBtn.style.display = 'none';
  sameProjectNotice.style.display = 'none';

  const workingRadio = document.querySelector('input[name="statusRadio"][value="working"]');
  if (workingRadio) workingRadio.checked = true;

  clearFormErrors();
  renderFileTags();
  entryModal.classList.add('active');
  memberNameInput.focus();
}

window.openEditModal = function(id) {
  const entry = entries.find(e => e.id.toString() === id.toString());
  if (!entry) return;

  currentEditingId = id;
  modalTitle.textContent = 'Edit Entry';
  entryIdInput.value = entry.id;
  memberNameInput.value = entry.memberName;
  codebaseInput.value = entry.codebase;
  taskInput.value = entry.task;
  commentInput.value = entry.comment;
  fileTagInput.value = '';
  currentModalFiles = [...(entry.files || [])];
  deleteEntryBtn.style.display = 'inline-flex';

  const statusRadio = document.querySelector(`input[name="statusRadio"][value="${entry.status}"]`);
  if (statusRadio) statusRadio.checked = true;

  clearFormErrors();
  renderFileTags();
  checkSameProjectCollaborators();
  entryModal.classList.add('active');
  memberNameInput.focus();
};

function closeEntryModal() {
  entryModal.classList.remove('active');
  currentEditingId = null;
  currentModalFiles = [];
  sameProjectNotice.style.display = 'none';
  clearFormErrors();
}

function clearFormErrors() {
  memberNameError.style.display = 'none';
  codebaseError.style.display = 'none';
  taskError.style.display = 'none';
  commentError.style.display = 'none';
  filesError.style.display = 'none';
  document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
}

// Trigger Completion Alert if someone completes work on a shared codebase
function triggerCompletionSyncAlert(completedEntry) {
  const targetCodebase = (completedEntry.codebase || '').trim().toLowerCase();
  const completedMember = completedEntry.memberName;

  // Find other developers currently WORKING on this same codebase
  const otherWorkingDevs = entries.filter(e => {
    return e.status === 'working' && 
           (e.codebase || '').trim().toLowerCase() === targetCodebase && 
           e.id.toString() !== completedEntry.id.toString() &&
           (e.memberName || '').trim().toLowerCase() !== (completedMember || '').trim().toLowerCase();
  });

  if (otherWorkingDevs.length === 0) return;

  // Populate Alert Modal
  syncAlertCompletedText.innerHTML = `🎉 <strong>${escapeHtml(completedMember)}</strong> has marked <code>${escapeHtml(completedEntry.task)}</code> as <strong>COMPLETED</strong> on <strong>${escapeHtml(completedEntry.codebase)}</strong>!`;

  syncCoworkersList.innerHTML = '';
  const coworkerNames = [];
  otherWorkingDevs.forEach(dev => {
    coworkerNames.push(dev.memberName);
    const li = document.createElement('li');
    li.innerHTML = `<span>👤 <strong>${escapeHtml(dev.memberName)}</strong> — Working on <code>${escapeHtml(dev.task)}</code></span>`;
    syncCoworkersList.appendChild(li);
  });

  const filesListStr = (completedEntry.files && completedEntry.files.length > 0)
    ? `\nFiles changed:\n- ` + completedEntry.files.join('\n- ')
    : '';

  const readyMessage = `Hey ${coworkerNames.join(', ')}!\n` +
    `I have just completed my task "${completedEntry.task}" on ${completedEntry.codebase}.\n` +
    `Please sync with my latest ZIP file before continuing your changes to avoid merge conflicts!${filesListStr}`;

  syncCopyableMessage.value = readyMessage;
  syncAlertModal.classList.add('active');
}

// Save Entry Form -> Calls PostgreSQL API
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (fileTagInput.value.trim()) {
    addFilesFromInput(fileTagInput.value.trim());
    fileTagInput.value = '';
  }

  const memberName = memberNameInput.value.trim();
  const codebase = codebaseInput.value.trim();
  const task = taskInput.value.trim();
  const comment = commentInput.value.trim();
  const status = document.querySelector('input[name="statusRadio"]:checked')?.value || 'working';

  let hasError = false;
  clearFormErrors();

  if (!memberName) {
    memberNameError.style.display = 'block';
    memberNameInput.closest('.form-group').classList.add('has-error');
    hasError = true;
  }
  if (!codebase) {
    codebaseError.style.display = 'block';
    codebaseInput.closest('.form-group').classList.add('has-error');
    hasError = true;
  }
  if (!task) {
    taskError.style.display = 'block';
    taskInput.closest('.form-group').classList.add('has-error');
    hasError = true;
  }
  if (!comment) {
    commentError.style.display = 'block';
    commentInput.closest('.form-group').classList.add('has-error');
    hasError = true;
  }
  if (currentModalFiles.length === 0) {
    filesError.style.display = 'block';
    hasError = true;
  }

  if (hasError) return;

  const payload = {
    memberName,
    codebase,
    task,
    comment,
    files: currentModalFiles,
    status
  };

  try {
    let savedEntry = null;

    if (currentEditingId) {
      const prevEntry = entries.find(e => e.id.toString() === currentEditingId.toString());
      const res = await fetch(`/api/entries/${currentEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update');
      savedEntry = data.entry;
      showToast(`Updated entry for ${memberName} in PostgreSQL`);

      // Check if transitioned to completed
      if (prevEntry && prevEntry.status === 'working' && status === 'completed') {
        triggerCompletionSyncAlert(savedEntry);
      }
    } else {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create');
      savedEntry = data.entry;
      showToast(`Saved ${memberName}'s entry into PostgreSQL`);

      if (status === 'completed') {
        triggerCompletionSyncAlert(savedEntry);
      }
    }

    closeEntryModal();
    await fetchEntries();
  } catch (err) {
    console.error('Save error:', err);
    alert('Error saving to PostgreSQL: ' + err.message);
  }
});

// Delete Entry in PostgreSQL
deleteEntryBtn.addEventListener('click', async () => {
  if (!currentEditingId) return;
  const entry = entries.find(e => e.id.toString() === currentEditingId.toString());
  if (!entry) return;

  if (confirm(`Are you sure you want to delete the entry for "${entry.memberName}" (${entry.task}) from PostgreSQL?`)) {
    try {
      const res = await fetch(`/api/entries/${currentEditingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      
      closeEntryModal();
      showToast('Entry deleted from PostgreSQL');
      await fetchEntries();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }
});

// Quick Status Update Modal Logic -> Calls PostgreSQL API
window.openStatusModal = function(id) {
  const entry = entries.find(e => e.id.toString() === id.toString());
  if (!entry) return;

  currentStatusTargetId = id;
  statusModalMember.textContent = entry.memberName;
  statusModalTask.textContent = entry.task;
  statusModalCodebase.textContent = entry.codebase;

  document.querySelectorAll('.status-option-btn').forEach(btn => {
    const isThisStatus = btn.dataset.status === entry.status;
    btn.classList.toggle('active', isThisStatus);
  });

  statusModal.classList.add('active');
};

function closeStatusModal() {
  statusModal.classList.remove('active');
  currentStatusTargetId = null;
}

document.querySelectorAll('.status-option-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!currentStatusTargetId) return;
    const targetStatus = btn.dataset.status;
    const currentEntry = entries.find(e => e.id.toString() === currentStatusTargetId.toString());

    try {
      const res = await fetch(`/api/entries/${currentStatusTargetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Status update failed');

      const updatedEntry = data.entry;
      closeStatusModal();
      showToast(`Status updated to ${targetStatus.toUpperCase()} in PostgreSQL`);
      
      // If switched from working to completed, trigger co-worker alert
      if (currentEntry && currentEntry.status === 'working' && targetStatus === 'completed') {
        triggerCompletionSyncAlert(updatedEntry);
      }

      await fetchEntries();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  });
});

// Sync Alert Modal Copy Button
copySyncMessageBtn.addEventListener('click', () => {
  const text = syncCopyableMessage.value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied notification message to clipboard!');
  }).catch(() => {
    showToast('Failed to copy text');
  });
});

closeSyncAlertBtn.addEventListener('click', () => {
  syncAlertModal.classList.remove('active');
});

doneSyncAlertBtn.addEventListener('click', () => {
  syncAlertModal.classList.remove('active');
});

// All Files Modal Logic
window.openAllFilesModal = function(id) {
  const entry = entries.find(e => e.id.toString() === id.toString());
  if (!entry) return;

  currentViewingFiles = entry.files || [];
  allFilesTitle.textContent = `All Changed Files (${currentViewingFiles.length})`;
  allFilesOwner.textContent = entry.memberName;
  allFilesTask.textContent = entry.task;

  allFilesList.innerHTML = '';
  currentViewingFiles.forEach(file => {
    const li = document.createElement('li');
    li.textContent = file;
    allFilesList.appendChild(li);
  });

  allFilesModal.classList.add('active');
};

function closeAllFilesModal() {
  allFilesModal.classList.remove('active');
  currentViewingFiles = [];
}

copyAllFilesBtn.addEventListener('click', () => {
  if (currentViewingFiles.length === 0) return;
  const textToCopy = currentViewingFiles.join('\n');
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast(`Copied ${currentViewingFiles.length} file names to clipboard!`);
  }).catch(() => {
    showToast('Failed to copy file names');
  });
});

// Event Listeners
addEntryBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', closeEntryModal);
cancelModalBtn.addEventListener('click', closeEntryModal);

closeStatusModalBtn.addEventListener('click', closeStatusModal);
cancelStatusModalBtn.addEventListener('click', closeStatusModal);

closeAllFilesModalBtn.addEventListener('click', closeAllFilesModal);
closeAllFilesBtn.addEventListener('click', closeAllFilesModal);

// Close modal on backdrop click
[entryModal, statusModal, allFilesModal, syncAlertModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (modal === entryModal) closeEntryModal();
      else if (modal === statusModal) closeStatusModal();
      else if (modal === allFilesModal) closeAllFilesModal();
      else if (modal === syncAlertModal) syncAlertModal.classList.remove('active');
    }
  });
});

// Escape key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (entryModal.classList.contains('active')) closeEntryModal();
    if (statusModal.classList.contains('active')) closeStatusModal();
    if (allFilesModal.classList.contains('active')) closeAllFilesModal();
    if (syncAlertModal.classList.contains('active')) syncAlertModal.classList.remove('active');
  }
});

// Search & Filter Interactions
searchInput.addEventListener('input', () => {
  clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
  renderDashboard();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  renderDashboard();
  searchInput.focus();
});

codebaseFilter.addEventListener('change', () => {
  renderDashboard();
});

// Refresh Button
refreshBtn.addEventListener('click', async () => {
  refreshBtn.classList.add('spinning');
  await fetchEntries();
  setTimeout(() => {
    refreshBtn.classList.remove('spinning');
    showToast('Synced with PostgreSQL');
  }, 400);
});

// Reset Demo Data in PostgreSQL
resetDemoBtn.addEventListener('click', async () => {
  if (confirm('Reset database back to initial sample rows in PostgreSQL?')) {
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Reset failed');
      await fetchEntries();
      showToast('PostgreSQL demo data restored successfully');
    } catch (err) {
      alert('Error resetting demo data: ' + err.message);
    }
  }
});

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  fetchEntries();
});
