import { supabase } from './supabase-client.js';
import { dashPath } from './dashboard/config.js';

const IDLE_KEY = 'mfc_last_active_at';

const IDLE_LIMITS = {
  admin: 20 * 60 * 1000,           // 20 minutes
  supporter: 7 * 24 * 60 * 60 * 1000, // 7 days
};

let cachedAccountType = null;

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    cachedAccountType = null;
  }
});

export async function resolveAccountType() {
  if (cachedAccountType) return cachedAccountType;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: admin } = await supabase
    .from('admins')
    .select('id, is_active')
    .eq('id', session.user.id)
    .maybeSingle();

  if (admin && admin.is_active) {
    cachedAccountType = 'admin';
    return cachedAccountType;
  }

  const { data: supporter } = await supabase
    .from('supporters')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (supporter) {
    cachedAccountType = 'supporter';
    return cachedAccountType;
  }

  return null;
}

export function getCachedAccountType() {
  return cachedAccountType;
}

export async function getProfileSnapshot() {
  const accountType = await resolveAccountType();
  if (!accountType) return { accountType: null, avatarUrl: null };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { accountType: null, avatarUrl: null };

  const table = accountType === 'admin' ? 'admin_profiles' : 'supporters';
  const idColumn = accountType === 'admin' ? 'admin_id' : 'id';

  const { data } = await supabase
    .from(table)
    .select('avatar_url')
    .eq(idColumn, session.user.id)
    .maybeSingle();

  return { accountType, avatarUrl: data?.avatar_url || null };
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };

  const accountType = await resolveAccountType();

  if (accountType === 'admin') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('login_sessions').insert({
        admin_id: user.id,
        email: user.email,
        login_at: new Date().toISOString(),
      });
    }
  }

  touchActivity();
  return { error: null, accountType };
}

export async function signupSupporter(email, password, fullName = '') {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error };

  cachedAccountType = 'supporter';
  touchActivity();
  return { error: null, accountType: 'supporter' };
}

export function requestPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + dashPath('/reset-password'),
  });
}

export async function changePassword(currentPassword, newPassword) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: { message: 'Not logged in.' } };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: currentPassword,
  });
  if (verifyError) return { error: { message: 'Current password is incorrect.' } };

  return supabase.auth.updateUser({ password: newPassword });
}

export async function logout({ redirect = true } = {}) {
  if (cachedAccountType === 'admin') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('login_sessions')
        .update({ logout_at: new Date().toISOString() })
        .eq('admin_id', user.id)
        .is('logout_at', null);
    }
  }

  await supabase.auth.signOut();
  localStorage.removeItem(IDLE_KEY);

  if (redirect) {
    window.location.href = '/';
  }
}

export function touchActivity() {
  localStorage.setItem(IDLE_KEY, String(Date.now()));

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;
    supabase.from('user_activity').upsert({
      id: session.user.id,
      last_active_at: new Date().toISOString(),
    });
  });
}

export function getIdleLimit(accountType) {
  return IDLE_LIMITS[accountType] ?? IDLE_LIMITS.supporter;
}

export { IDLE_KEY };