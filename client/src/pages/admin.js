// ─── Admin Dashboard Page ────────────────────────────────────────────────────
// Admin-only stats panel and user catalog.
// Visualizes current noise signal levels using custom inline CSS bars.

import { api } from '../api.js';
import { navigateTo } from '../router.js';
import { escapeHtml } from '../lib/escape.js';

export async function adminPage() {
  const el = document.createElement('div');
  el.className = 'container';
  el.style.maxWidth = '780px'; // expand width for database-style dashboards

  el.innerHTML = `
    <div class="logo">
      <div class="logo-icon" aria-hidden="true">📊</div>
      <h1>Admin Dashboard</h1>
    </div>
    <p class="subtitle" style="margin-bottom:2rem;">System metrics & user administration</p>

    <!-- Stats cards grid -->
    <div class="admin-grid" id="adminGrid">
      <div class="admin-card"><div class="admin-card-value">—</div><div class="admin-card-label">Active Zones</div></div>
      <div class="admin-card"><div class="admin-card-value">—</div><div class="admin-card-label">Active Signals</div></div>
      <div class="admin-card"><div class="admin-card-value">—</div><div class="admin-card-label">Total Users</div></div>
      <div class="admin-card"><div class="admin-card-value">—</div><div class="admin-card-label">Shared Spots</div></div>
    </div>

    <!-- Noise Distribution Panel -->
    <div class="admin-section-title">Active Noise Distribution</div>
    <div class="admin-chart-container" id="chartContainer">
      <div style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem;">Loading signals distribution…</div>
    </div>

    <!-- Users table -->
    <div class="admin-section-title">User Catalog</div>
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Registered</th>
            <th>Saved Spots</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="usersTableBody">
          <tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Fetching database records…</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination controls -->
    <div class="pagination-controls">
      <button id="prevPageBtn" class="btn-mini" disabled>← Previous</button>
      <span id="pageInfo" style="font-size:0.75rem;color:var(--text-secondary);">Page 1 of 1</span>
      <button id="nextPageBtn" class="btn-mini" disabled>Next →</button>
    </div>

    <div class="footer" style="margin-top:2rem;">
      <button class="stats-btn" id="backHomeBtn" style="margin: 0;">← Back to Home</button>
    </div>
  `;

  let currentPage = 1;
  let totalPages = 1;



  async function loadDashboard() {
    try {
      const stats = await api.getAdminStats();
      
      // Load Stats Card metrics
      const grid = el.querySelector('#adminGrid');
      if (grid) {
        grid.innerHTML = `
          <div class="admin-card"><div class="admin-card-value">${stats.active_geohash_zones}</div><div class="admin-card-label">Active Zones</div></div>
          <div class="admin-card"><div class="admin-card-value">${stats.total_active_signals}</div><div class="admin-card-label">Active Signals</div></div>
          <div class="admin-card"><div class="admin-card-value">${stats.total_users}</div><div class="admin-card-label">Total Users</div></div>
          <div class="admin-card"><div class="admin-card-value">${stats.total_shared_locations}</div><div class="admin-card-label">Shared Spots</div></div>
        `;
      }

      // Load noise distribution charts
      const dist = stats.noise_distribution || { very_quiet: 0, quiet: 0, moderate: 0, loud: 0 };
      const maxVal = Math.max(...Object.values(dist), 1);
      
      const buckets = [
        { key: 'very_quiet', name: 'Very Quiet', color: 'var(--bucket-very-quiet)' },
        { key: 'quiet', name: 'Quiet', color: 'var(--bucket-quiet)' },
        { key: 'moderate', name: 'Moderate', color: 'var(--bucket-moderate)' },
        { key: 'loud', name: 'Loud', color: 'var(--bucket-loud)' }
      ];

      const chartHtml = buckets.map(b => {
        const count = dist[b.key] || 0;
        const pct = Math.round((count / maxVal) * 100);
        return `
          <div class="admin-bar-row">
            <div class="admin-bar-label">${b.name}</div>
            <div class="admin-bar-wrapper">
              <div class="admin-bar" style="background:${b.color}; width:${pct}%;"></div>
            </div>
            <div class="admin-bar-count">${count}</div>
          </div>
        `;
      }).join('');
      
      const chartContainer = el.querySelector('#chartContainer');
      if (chartContainer) {
        chartContainer.innerHTML = chartHtml;
      }

    } catch (err) {
      console.error('[admin] Failed to load dashboard stats:', err);
    }
  }

  async function loadUsers(page) {
    try {
      const data = await api.getAdminUsers(page);
      currentPage = data.pagination.page;
      totalPages = data.pagination.totalPages;

      const tbody = el.querySelector('#usersTableBody');
      if (!tbody) return;

      if (data.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">No users registered yet.</td></tr>`;
        return;
      }

      const currentUser = (() => { try { return JSON.parse(localStorage.getItem('voidmap_user')); } catch { return null; } })();

      tbody.innerHTML = data.users.map(u => `
        <tr data-user-id="${u.id}" data-email="${escapeHtml(u.email)}">
          <td>${escapeHtml(u.email)}</td>
          <td>${u.isAdmin ? '<span class="badge-admin">Admin</span>' : '<span style="color:var(--text-secondary)">User</span>'}</td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>${u.locationCount}</td>
          <td>
            ${currentUser?.id === u.id 
              ? '<span style="font-size:0.75rem;color:var(--text-muted);">Current User</span>' 
              : `
                <button class="btn-mini btn-role" data-action="toggle-role" data-is-admin="${u.isAdmin}" style="margin-right:0.4rem;">
                  ${u.isAdmin ? 'Demote' : 'Promote'}
                </button>
                <button class="btn-mini btn-delete-user" data-action="delete-user" style="color:var(--error);border-color:rgba(255,59,107,0.3);">
                  Delete
                </button>
              `}
          </td>
        </tr>
      `).join('');

      // Event delegation for table action buttons
      tbody.onclick = async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const row = btn.closest('tr');
        const userId = row.dataset.userId;
        const email = row.dataset.email;
        const action = btn.dataset.action;

        if (action === 'delete-user') {
          if (confirm(`Are you sure you want to delete user "${email}"? This will permanently remove their saved locations.`)) {
            btn.disabled = true;
            btn.textContent = 'Deleting…';
            try {
              await api.deleteAdminUser(userId);
              loadUsers(currentPage);
              loadDashboard();
            } catch (err) {
              alert(`Could not delete user: ${err.message}`);
              btn.disabled = false;
              btn.textContent = 'Delete';
            }
          }
        } else if (action === 'toggle-role') {
          const currentIsAdmin = btn.dataset.isAdmin === 'true';
          const newRole = !currentIsAdmin;
          btn.disabled = true;
          btn.textContent = 'Updating…';
          try {
            await api.updateAdminUserRole(userId, newRole);
            loadUsers(currentPage);
          } catch (err) {
            alert(`Could not update role: ${err.message}`);
            btn.disabled = false;
            btn.textContent = currentIsAdmin ? 'Demote' : 'Promote';
          }
        }
      };

      // Update table pagination details
      const pageInfo = el.querySelector('#pageInfo');
      if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

      const prevBtn = el.querySelector('#prevPageBtn');
      if (prevBtn) prevBtn.disabled = currentPage <= 1;

      const nextBtn = el.querySelector('#nextPageBtn');
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    } catch (err) {
      console.error('[admin] Failed to load user catalog:', err);
    }
  }

  // Initial fetches
  loadDashboard();
  loadUsers(currentPage);

  // Event handlers
  el.querySelector('#backHomeBtn')?.addEventListener('click', () => {
    navigateTo('#/');
  });

  el.querySelector('#prevPageBtn')?.addEventListener('click', () => {
    if (currentPage > 1) loadUsers(currentPage - 1);
  });

  el.querySelector('#nextPageBtn')?.addEventListener('click', () => {
    if (currentPage < totalPages) loadUsers(currentPage + 1);
  });

  return el;
}


