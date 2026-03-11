// admin.js — Admin mode: login, upload, delete, drag-and-drop reorder

let adminToken = null;
let sortableInstances = [];

// --- Login / Logout ---

function showLoginPrompt() {
  document.getElementById('admin-login-overlay').style.display = 'flex';
  document.getElementById('admin-password-input').value = '';
  document.getElementById('admin-password-input').focus();
}

function hideLoginPrompt() {
  document.getElementById('admin-login-overlay').style.display = 'none';
  document.getElementById('admin-login-error').style.display = 'none';
}

async function attemptLogin() {
  const password = document.getElementById('admin-password-input').value;
  if (!password) return;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      const data = await res.json();
      adminToken = data.token;
      sessionStorage.setItem('adminToken', adminToken);
      hideLoginPrompt();
      enterAdminMode();
    } else {
      document.getElementById('admin-login-error').style.display = 'block';
    }
  } catch (err) {
    console.error('Login failed:', err);
  }
}

async function logout() {
  if (adminToken) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken }
      });
    } catch (e) { /* ignore */ }
  }
  adminToken = null;
  sessionStorage.removeItem('adminToken');
  exitAdminMode();
}

function enterAdminMode() {
  document.body.classList.add('admin-mode');
  initSortable();
}

function exitAdminMode() {
  document.body.classList.remove('admin-mode');
  destroySortable();
}

// --- Drag and Drop (SortableJS) ---

function initSortable() {
  destroySortable();

  // Make each row sortable (drag photos within/between rows)
  const rows = document.querySelectorAll('.gallery-row');
  rows.forEach(row => {
    const instance = new Sortable(row, {
      group: 'gallery-photos',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      handle: '.col',
      onEnd: saveSortOrder
    });
    sortableInstances.push(instance);
  });

  // Make the gallery-grid sortable for row reordering
  const container = document.getElementById('gallery-grid');
  const rowSortable = new Sortable(container, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    handle: '.gallery-row',
    onEnd: saveSortOrder
  });
  sortableInstances.push(rowSortable);
}

function destroySortable() {
  sortableInstances.forEach(s => s.destroy());
  sortableInstances = [];
}

async function saveSortOrder() {
  // Rebuild galleryData from DOM
  const newData = [];
  const rowWrappers = document.querySelectorAll('#gallery-grid > div');

  rowWrappers.forEach(wrapper => {
    const cols = wrapper.querySelectorAll('.col');
    const row = [];
    cols.forEach(col => {
      const src = col.getAttribute('data-photo-src');
      const img = col.querySelector('img');
      const alt = img ? img.alt : '';
      row.push({ src, alt });
    });
    if (row.length > 0) {
      newData.push(row);
    }
  });

  galleryData = newData;

  try {
    await fetch('/api/gallery', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify(newData)
    });
  } catch (err) {
    console.error('Failed to save layout:', err);
  }
}

// --- Upload ---

function triggerUpload() {
  document.getElementById('admin-file-input').click();
}

async function handleUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('photos', files[i]);
  }

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
      body: formData
    });

    if (res.ok) {
      // Reload gallery to show new photos
      await loadGallery();
    } else {
      alert('Upload failed. Please try again.');
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('Upload failed. Please try again.');
  }

  // Reset file input
  event.target.value = '';
}

// --- Delete ---

async function deletePhoto(src) {
  try {
    const res = await fetch('/api/photo', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ src })
    });

    if (res.ok) {
      await loadGallery();
    } else {
      alert('Delete failed. Please try again.');
    }
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  // Lock icon click
  const lockBtn = document.getElementById('admin-lock-btn');
  if (lockBtn) {
    lockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (adminToken) {
        logout();
      } else {
        showLoginPrompt();
      }
    });
  }

  // Login form submit
  const loginBtn = document.getElementById('admin-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', attemptLogin);
  }

  // Enter key in password field
  const pwInput = document.getElementById('admin-password-input');
  if (pwInput) {
    pwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  }

  // Cancel login
  const cancelBtn = document.getElementById('admin-login-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideLoginPrompt);
  }

  // Upload button
  const uploadBtn = document.getElementById('admin-upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', triggerUpload);
  }

  // File input change
  const fileInput = document.getElementById('admin-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleUpload);
  }

  // Logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Check for existing session
  const savedToken = sessionStorage.getItem('adminToken');
  if (savedToken) {
    adminToken = savedToken;
    enterAdminMode();
  }
});
