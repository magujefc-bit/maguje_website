import { viewContainer } from '../view-container.js';
import { requireAdmin } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('messages-view', `
  .msg-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid #e2e8e4; }
  .msg-tab { padding: 0.6rem 1rem; font-size: 0.9rem; font-weight: 600; color: #667; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; }
  .msg-tab--active { color: #109b45; border-bottom-color: #109b45; }
  .msg-tab .count { display: inline-block; margin-left: 4px; padding: 1px 7px; border-radius: 999px; background: #eef2ef; font-size: 0.75rem; }
  .msg-tab--active .count { background: #109b45; color: #fff; }
  .msg-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .msg-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1rem; }
  .msg-card__top { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; margin-bottom: 0.4rem; }
  .msg-card__name { font-weight: 700; font-size: 0.95rem; color: #222; }
  .msg-card__date { font-size: 0.75rem; color: #999; white-space: nowrap; }
  .msg-card__email { font-size: 0.8rem; color: #109b45; margin-bottom: 0.5rem; }
  .msg-card__email a { color: inherit; }
  .msg-card__body { font-size: 0.85rem; color: #444; white-space: pre-wrap; margin-bottom: 0.7rem; }
  .msg-card__actions { display: flex; gap: 0.4rem; }
`);

export async function messagesView() {
  const admin = await requireAdmin(['senior_manager', 'match_manager']);
  if (!admin) return { cleanup: null };

  let allMessages = [];
  let currentTab = 'unread';

  viewContainer.render(`
    ${pageHeader('Messages', 'Contact form submissions from the public site.')}

    <div class="msg-tabs">
      <button class="msg-tab msg-tab--active" data-tab="unread">Unread <span class="count" data-count="unread">0</span></button>
      <button class="msg-tab" data-tab="read">Read <span class="count" data-count="read">0</span></button>
    </div>

    <p id="load-status" class="save-status"></p>

    <div class="msg-list" id="msg-list"></div>
  `);

  async function loadMessages() {
    const statusEl = document.getElementById('load-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = '';
    allMessages = data;
    updateCounts();
    renderList();
  }

  function updateCounts() {
    document.querySelector('[data-count="unread"]').textContent = allMessages.filter(m => !m.is_read).length;
    document.querySelector('[data-count="read"]').textContent = allMessages.filter(m => m.is_read).length;
  }

  document.querySelectorAll('.msg-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.msg-tab').forEach(b => b.classList.toggle('msg-tab--active', b === btn));
      renderList();
    });
  });

  function renderList() {
    const list = document.getElementById('msg-list');
    const filtered = allMessages.filter(m => (currentTab === 'unread' ? !m.is_read : m.is_read));

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-msg">No ${currentTab} messages.</div>`;
      return;
    }

    list.innerHTML = '';
    filtered.forEach(msg => list.appendChild(renderMessageCard(msg)));
  }

  function renderMessageCard(msg) {
    const card = document.createElement('div');
    card.className = 'msg-card';
    card.innerHTML = `
      <div class="msg-card__top">
        <span class="msg-card__name">${escapeHtml(msg.name)}</span>
        <span class="msg-card__date">${new Date(msg.created_at).toLocaleString()}</span>
      </div>
      <div class="msg-card__email"><a href="mailto:${escapeAttr(msg.email)}">${escapeHtml(msg.email)}</a></div>
      <div class="msg-card__body">${escapeHtml(msg.message)}</div>
      <div class="msg-card__actions">
        <button class="btn-secondary toggle-read-btn">${msg.is_read ? 'Mark unread' : 'Mark read'}</button>
      </div>
    `;

    card.querySelector('.toggle-read-btn').addEventListener('click', async () => {
      const { error } = await supabaseClient.from('contact_messages').update({ is_read: !msg.is_read }).eq('id', msg.id);
      if (error) { alert(error.message); return; }
      loadMessages();
    });

    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  loadMessages();

  return { cleanup: null };
}
