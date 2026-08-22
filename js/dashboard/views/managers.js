import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('managers-view', `
  .invite-form { display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: flex-end; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  .field label { font-size: 0.78rem; color: #555; }
  .field input, .field select { padding: 0.55rem; border: 1px solid #ccc; border-radius: 6px; font-size: 0.88rem; min-width: 180px; }
  .role-tag { font-size: 0.78rem; color: #444; text-transform: capitalize; }
  @media (max-width: 800px) { .invite-form { flex-direction: column; align-items: stretch; } }
`);

export async function managersView() {
  const admin = await requireAdmin(['super_admin']);
  if (!admin) return { cleanup: null };

  const currentAdmin = admin;

  viewContainer.render(`
    ${pageHeader('Managers', 'Invite new managers and manage existing admin accounts.')}

    <div class="card">
      <h2>Invite a Manager</h2>
      <form id="inviteForm" class="invite-form">
        <div class="field">
          <label for="inviteEmail">Email</label>
          <input type="email" id="inviteEmail" required placeholder="manager@example.com">
        </div>
        <div class="field">
          <label for="inviteRole">Role</label>
          <select id="inviteRole" required>
            <option value="" disabled selected>Select role</option>
            <option value="senior_manager">Senior Manager</option>
            <option value="match_manager">Match Manager</option>
            <option value="content_manager">Content Manager</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <button type="submit" class="btn-primary" id="inviteBtn">Send Invite</button>
      </form>
      <div class="save-status" id="inviteMsg"></div>
    </div>

    <div class="card">
      <h2>All Admins</h2>
      <div id="tableWrap">
        <p class="empty-msg">Loading...</p>
      </div>
    </div>
  `);

  async function loadManagers() {
    const { data, error } = await supabaseClient
      .from('admins')
      .select('id, email, role, is_active, created_at')
      .order('created_at', { ascending: false });

    const wrap = document.getElementById('tableWrap');

    if (error) {
      wrap.innerHTML = `<p class="empty-msg">Could not load admins.</p>`;
      return;
    }

    if (!data.length) {
      wrap.innerHTML = `<p class="empty-msg">No admins yet.</p>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                <td>${row.email}</td>
                <td><span class="role-tag">${row.role.replace('_', ' ')}</span></td>
                <td><span class="badge ${row.is_active ? 'badge-active' : 'badge-banned'}">${row.is_active ? 'Active' : 'Deactivated'}</span></td>
                <td>${new Date(row.created_at).toLocaleDateString()}</td>
                <td>
                  ${row.id === currentAdmin.id
                    ? `<span class="muted">You</span>`
                    : `<button class="btn-secondary" data-id="${row.id}" data-active="${row.is_active}">
                         ${row.is_active ? 'Deactivate' : 'Reactivate'}
                       </button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    wrap.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const isActive = btn.dataset.active === 'true';
        btn.disabled = true;

        const { error: updateError } = await supabaseClient
          .from('admins')
          .update({ is_active: !isActive })
          .eq('id', id);

        if (updateError) {
          alert('Could not update this admin. Try again.');
          btn.disabled = false;
          return;
        }

        loadManagers();
      });
    });
  }

  document.getElementById('inviteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('inviteMsg');
    const btn = document.getElementById('inviteBtn');
    msg.textContent = '';
    msg.className = 'save-status';
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const email = document.getElementById('inviteEmail').value.trim();
    const role = document.getElementById('inviteRole').value;

    const { error } = await supabaseClient.functions.invoke('invite-manager', {
      body: { email, role },
    });

    btn.disabled = false;
    btn.textContent = 'Send Invite';

    if (error) {
      msg.textContent = "Could not send invite. The invite system isn't set up yet.";
      msg.classList.add('error');
      return;
    }

    msg.textContent = `Invite sent to ${email}.`;
    msg.classList.add('success');
    document.getElementById('inviteForm').reset();
    loadManagers();
  });

  loadManagers();

  return { cleanup: null };
}
