// ─── Auth & Data helpers ──────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}

async function requireAdmin(redirectTo = '/index.html') {
  const admin = await isAdmin();
  if (!admin) { window.location.href = redirectTo; return false; }
  return true;
}

async function requireAuth(redirectTo = '/login.html') {
  const user = await getCurrentUser();
  if (!user) { window.location.href = redirectTo + '?redirect=' + encodeURIComponent(window.location.pathname); return null; }
  return user;
}

// ─── Inscription ─────────────────────────────────────

async function signUp(email, password, username) {
  username = username.trim();
  if (username.length < 3 || username.length > 20) throw new Error('Le pseudo doit faire entre 3 et 20 caractères');
  if (!/^[a-zA-Z0-9_\-]+$/.test(username)) throw new Error('Le pseudo ne peut contenir que des lettres, chiffres, _ et -');

  const { data: existing } = await db.from('profiles').select('id').eq('username', username).maybeSingle();
  if (existing) throw new Error('Ce pseudo est déjà pris');

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) throw new Error(translateAuthError(error.message));
  return data;
}

// ─── Connexion ───────────────────────────────────────

async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));

  await db.from('login_logs').insert({
    user_id: data.user.id,
    ua_hash: await hashString(navigator.userAgent.substring(0, 100))
  });

  return data;
}

async function signOut() {
  await db.auth.signOut();
  window.location.href = '/index.html';
}

// ─── Sauvegarde d'une partie ─────────────────────────

async function saveGameResult(userId, diff, timeSeconds, seed) {
  if (!userId || !['easy', 'medium', 'hard'].includes(diff) || timeSeconds <= 0) return [];

  const { error: levErr } = await db.from('completed_levels').insert({
    user_id: userId, seed: seed || null, difficulty: diff, time_seconds: timeSeconds
  });
  if (levErr) console.warn('completed_levels insert:', levErr.message);

  const { data: existing, error: selErr } = await db
    .from('player_stats').select('*').eq('user_id', userId).eq('difficulty', diff).maybeSingle();
  if (selErr) console.warn('player_stats select:', selErr.message);

  if (existing) {
    const { error: updErr } = await db.from('player_stats').update({
      games_played: existing.games_played + 1,
      total_time:   existing.total_time + timeSeconds,
      best_time:    existing.best_time === 0 ? timeSeconds : Math.min(existing.best_time, timeSeconds),
      updated_at:   new Date().toISOString()
    }).eq('id', existing.id);
    if (updErr) console.warn('player_stats update:', updErr.message);
  } else {
    const { error: insErr } = await db.from('player_stats').insert({
      user_id: userId, difficulty: diff, games_played: 1,
      total_time: timeSeconds, best_time: timeSeconds
    });
    if (insErr) console.warn('player_stats insert:', insErr.message);
  }

  let newBadges = [];
  try { newBadges = await checkAndAwardBadges(userId, diff, timeSeconds) || []; }
  catch(e) { console.warn('badges:', e); }
  return newBadges || [];
}

// ─── Badges ──────────────────────────────────────────

async function checkAndAwardBadges(userId, diff, timeSeconds) {
  const [statsRes, badgesRes, earnedRes] = await Promise.all([
    db.from('player_stats').select('*').eq('user_id', userId),
    db.from('badges').select('*').order('sort_order'),
    db.from('player_badges').select('badge_id').eq('user_id', userId)
  ]);

  const stats      = statsRes.data || [];
  const badges     = badgesRes.data || [];
  const earnedIds  = new Set((earnedRes.data || []).map(b => b.badge_id));
  const totalGames = stats.reduce((s, r) => s + r.games_played, 0);
  const newlyEarned = [];

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    let earned = false;

    if (badge.condition_type === 'games_played') {
      if (badge.condition_diff) {
        const s = stats.find(r => r.difficulty === badge.condition_diff);
        earned = (s?.games_played || 0) >= badge.condition_value;
      } else {
        earned = totalGames >= badge.condition_value;
      }
    } else if (badge.condition_type === 'best_time') {
      const targetDiff = badge.condition_diff || diff;
      if (targetDiff === diff) {
        earned = timeSeconds <= badge.condition_value;
      }
    }

    if (earned) {
      const { error } = await db.from('player_badges').insert({ user_id: userId, badge_id: badge.id });
      if (!error) newlyEarned.push(badge);
    }
  }

  return newlyEarned;
}

// ─── Export RGPD ─────────────────────────────────────

async function exportUserData(userId) {
  const [profile, stats, levels, badges] = await Promise.all([
    db.from('profiles').select('username, role, created_at').eq('id', userId).single(),
    db.from('player_stats').select('difficulty, games_played, best_time, total_time').eq('user_id', userId),
    db.from('completed_levels').select('difficulty, time_seconds, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(500),
    db.from('player_badges').select('badge_id, earned_at, badges(name, icon)').eq('user_id', userId)
  ]);

  const data = {
    profil:   profile.data,
    stats:    stats.data,
    parties:  levels.data,
    badges:   badges.data
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'mes-donnees-tango.json'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Suppression de compte ───────────────────────────

async function deleteAccount(userId) {
  await db.from('completed_levels').delete().eq('user_id', userId);
  await db.from('player_stats').delete().eq('user_id', userId);
  await db.from('player_badges').delete().eq('user_id', userId);
  await db.from('login_logs').delete().eq('user_id', userId);
  await db.from('profiles').delete().eq('id', userId);
  await db.auth.signOut();
}

// ─── Utilitaires ─────────────────────────────────────

async function hashString(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

function translateAuthError(msg) {
  if (msg.includes('Invalid login'))      return 'Email ou mot de passe incorrect';
  if (msg.includes('Email not confirmed')) return 'Vérifiez votre email pour confirmer votre compte';
  if (msg.includes('already registered')) return 'Cet email est déjà utilisé';
  if (msg.includes('Password'))           return 'Mot de passe trop court (6 caractères minimum)';
  return msg;
}

function fmtTime(s) {
  if (!s || s === 0) return '—';
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Injecte l'état auth dans la nav (à appeler sur chaque page)
async function initNavAuth(opts = {}) {
  const user = await getCurrentUser();
  const el   = document.getElementById('nav-auth');
  const mel  = document.getElementById('menu-auth-item');
  if (!el && !mel) return user;

  if (user) {
    const profile = await getCurrentProfile();
    if (el) el.innerHTML = `
      <a href="/profile.html" class="nav-auth-link">${profile?.username || 'Profil'}</a>
      ${profile?.role === 'admin' ? '<a href="/admin/" class="nav-auth-link nav-admin">Admin</a>' : ''}
      <button onclick="signOut()" class="nav-auth-btn">Déconnexion</button>`;
    if (mel) mel.innerHTML = `
      <div class="nav-menu-sep"></div>
      <a href="/profile.html" class="nav-menu-item">👤 ${profile?.username || 'Profil'}</a>
      ${profile?.role === 'admin' ? '<a href="/admin/" class="nav-menu-item">⚙️ Admin</a>' : ''}
      <button onclick="signOut()" class="nav-menu-item">🚪 Déconnexion</button>`;
  } else {
    if (el) el.innerHTML = `<a href="/login.html" class="nav-auth-btn">Connexion</a>`;
    if (mel) mel.innerHTML = `<div class="nav-menu-sep"></div><a href="/login.html" class="nav-menu-item">🔑 Connexion</a>`;
  }

  return user;
}

// ─── Hamburger ───────────────────────────────────────

function toggleMenu(e) {
  e.stopPropagation();
  document.getElementById('nav-menu').classList.toggle('open');
}
function closeMenu() {
  const m = document.getElementById('nav-menu');
  if (m) m.classList.remove('open');
}
document.addEventListener('click', closeMenu);
