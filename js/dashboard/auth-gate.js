import { router } from '../router.js';
import { dashPath } from './config.js';
import { getCurrentAdmin } from './supabase-client-esm.js';
import { sidebar } from './components/sidebar.js';

function showAccessDenied(role) {
  const main = document.getElementById('main');
  if (main) {
    main.innerHTML = `<h1>Access Denied</h1><p class="sub">Your role (${role.replace('_', ' ')}) doesn't have access to this page.</p>`;
  }
}

// Same contract as the original AppShell.init({ allowedRoles }):
// - not logged in -> redirect to login, returns null
// - logged in but wrong role -> renders "Access Denied", returns null
// - logged in and allowed -> mounts the sidebar, returns the admin record
export async function requireAdmin(allowedRoles = null) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    router.navigate(dashPath('/login'), { replace: true });
    return null;
  }

  sidebar.mount(admin.role);

  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    showAccessDenied(admin.role);
    return null;
  }

  return admin;
}
