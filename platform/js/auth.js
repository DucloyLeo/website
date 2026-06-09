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
  if (_notifChannel) { db.removeChannel(_notifChannel); _notifChannel = null; }
  await db.auth.signOut();
  window.location.href = '/index.html';
}

// ─── Formules XP / Niveaux ───────────────────────────

// XP nécessaire pour passer du niveau n au niveau n+1
function xpToNextLevel(n) {
  return Math.min(1200, Math.floor(100 * Math.pow(1.4, n - 1)));
}

// Niveau correspondant à un total d'XP
function levelFromXp(totalXp) {
  let level = 1, cumXp = 0;
  while (true) {
    const needed = xpToNextLevel(level);
    if (cumXp + needed > totalXp) break;
    cumXp += needed;
    level++;
  }
  return level;
}

// XP dans le niveau actuel + XP requis pour passer au suivant
function xpProgressInLevel(totalXp) {
  let level = 1, cumXp = 0;
  while (true) {
    const needed = xpToNextLevel(level);
    if (cumXp + needed > totalXp) return { current: totalXp - cumXp, needed };
    cumXp += needed;
    level++;
  }
}

// ─── Déblocage des items par niveau ──────────────────

async function checkLevelUnlocks(userId, newLevel) {
  try {
    const { data: items } = await db.from('shop_items')
      .select('id')
      .eq('is_active', true)
      .lte('unlock_level', newLevel)
      .not('unlock_level', 'is', null);
    if (!items?.length) return;

    for (const item of items) {
      const { data: existing } = await db.from('player_inventory')
        .select('id').eq('user_id', userId).eq('item_id', item.id).maybeSingle();
      if (!existing) {
        const { error } = await db.from('player_inventory').insert({
          user_id: userId, item_id: item.id, acquired_via: 'level_unlock'
        });
        if (error) console.warn('level_unlock insert:', error.message);
      }
    }
  } catch(e) { console.warn('checkLevelUnlocks:', e); }
}

// ─── Sauvegarde d'une partie ─────────────────────────
// Retourne { xp_earned, coins_earned, new_level, old_level, leveled_up,
//            xp_in_level, xp_to_next, new_badges }

async function saveGameResult(userId, diff, timeSeconds, seed, hintCount = 0, ctrlHUsed = false) {
  const emptyResult = { xp_earned: 0, coins_earned: 0, new_level: 1, old_level: 1,
                        leveled_up: false, xp_in_level: 0, xp_to_next: 100, new_badges: [] };
  if (!userId || !['easy', 'medium', 'hard', 'extreme'].includes(diff) || timeSeconds <= 0) return emptyResult;

  const assisted = hintCount > 0 || ctrlHUsed;

  // ── Enregistrement de la partie ──
  const { error: levErr } = await db.from('completed_levels').insert({
    user_id: userId, seed: seed || null, difficulty: diff,
    time_seconds: timeSeconds, hints_used: hintCount, ctrl_h_used: ctrlHUsed
  });
  if (levErr) console.warn('completed_levels insert:', levErr.message);

  // ── Statistiques par difficulté ──
  const { data: existing, error: selErr } = await db
    .from('player_stats').select('*').eq('user_id', userId).eq('difficulty', diff).maybeSingle();
  if (selErr) console.warn('player_stats select:', selErr.message);

  if (existing) {
    const update = {
      games_played: existing.games_played + 1,
      total_time:   existing.total_time + timeSeconds,
      updated_at:   new Date().toISOString()
    };
    if (!assisted) {
      update.best_time = existing.best_time === 0 ? timeSeconds : Math.min(existing.best_time, timeSeconds);
    }
    const { error: updErr } = await db.from('player_stats').update(update).eq('id', existing.id);
    if (updErr) console.warn('player_stats update:', updErr.message);
  } else {
    const { error: insErr } = await db.from('player_stats').insert({
      user_id: userId, difficulty: diff, games_played: 1,
      total_time: timeSeconds, best_time: assisted ? 0 : timeSeconds
    });
    if (insErr) console.warn('player_stats insert:', insErr.message);
  }

  // ── Calcul XP & Pièces ──
  let xp_earned = 0, coins_earned = 0;
  if (!ctrlHUsed) {
    const { data: params } = await db.from('xp_params').select('*').eq('id', diff).maybeSingle();
    if (params) {
      const tiers = (params.speed_tiers || []).slice().sort((a, b) => a.max_seconds - b.max_seconds);
      let multiplier = 1.0;
      for (const tier of tiers) {
        if (timeSeconds <= tier.max_seconds) { multiplier = tier.multiplier; break; }
      }
      const baseWithSpeed = Math.floor(params.base_xp * multiplier);
      const penalty = hintCount * params.hint_penalty;
      xp_earned    = Math.max(10, baseWithSpeed - penalty);
      coins_earned = Math.floor(xp_earned / 5);
    }
  }

  // ── Mise à jour profil XP / Niveau / Pièces ──
  let old_level = 1, new_level = 1, leveled_up = false, total_xp = 0;

  const { data: profile } = await db.from('profiles')
    .select('xp, level, coins').eq('id', userId).maybeSingle();

  if (profile) {
    old_level = profile.level || 1;
    total_xp  = (profile.xp || 0) + xp_earned;
    new_level = levelFromXp(total_xp);
    leveled_up = new_level > old_level;

    if (xp_earned > 0 || coins_earned > 0) {
      const { error: upErr } = await db.from('profiles').update({
        xp:     total_xp,
        level:  new_level,
        coins:  (profile.coins || 0) + coins_earned
      }).eq('id', userId);
      if (upErr) console.warn('profiles xp update:', upErr.message);
    }

    if (leveled_up) await checkLevelUnlocks(userId, new_level);
  }

  const { current: xp_in_level, needed: xp_to_next } = xpProgressInLevel(total_xp);

  // ── Badges ──
  let new_badges = [];
  try { new_badges = await checkAndAwardBadges(userId, diff, timeSeconds, assisted, new_level) || []; }
  catch(e) { console.warn('badges:', e); }

  return { xp_earned, coins_earned, new_level, old_level, leveled_up, xp_in_level, xp_to_next, new_badges };
}

// ─── Badges ──────────────────────────────────────────

async function checkAndAwardBadges(userId, diff, timeSeconds, assisted = false, level = 1) {
  const [statsRes, badgesRes, earnedRes, compRes, profRes] = await Promise.all([
    db.from('player_stats').select('*').eq('user_id', userId),
    db.from('badges').select('*').order('sort_order'),
    db.from('player_badges').select('badge_id').eq('user_id', userId),
    db.from('completed_levels').select('difficulty, completed_at').eq('user_id', userId),
    db.from('profiles').select('created_at').eq('id', userId).maybeSingle()
  ]);

  const stats      = statsRes.data || [];
  const badges     = badgesRes.data || [];
  const earnedIds  = new Set((earnedRes.data || []).map(b => b.badge_id));
  const completions = compRes.data || [];
  const totalGames = stats.reduce((s, r) => s + r.games_played, 0);
  const totalTime  = stats.reduce((s, r) => s + (r.total_time || 0), 0);
  const newlyEarned = [];

  const dayKey = ts => { const x = new Date(ts); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const perDay = {};
  completions.forEach(c => { const k = dayKey(c.completed_at); perDay[k] = (perDay[k] || 0) + 1; });
  const dayKeys      = Object.keys(perDay).map(Number).sort((a, b) => a - b);
  const distinctDays = dayKeys.length;
  const maxGamesInDay = dayKeys.reduce((m, k) => Math.max(m, perDay[k]), 0);
  let longestStreak = 0, run = 0, prev = null;
  for (const k of dayKeys) {
    run = (prev !== null && k - prev === 86400000) ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prev = k;
  }

  const nowHour    = new Date().getHours();
  const accountAge = profRes.data?.created_at
    ? Math.floor((Date.now() - new Date(profRes.data.created_at).getTime()) / 86400000)
    : 0;
  const playedDiffs = new Set(stats.filter(r => (r.games_played || 0) > 0).map(r => r.difficulty));

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    const val  = badge.condition_value;
    const cdif = badge.condition_diff;
    let earned = false;

    switch (badge.condition_type) {
      case 'games_played':
        if (cdif) {
          const s = stats.find(r => r.difficulty === cdif);
          earned = (s?.games_played || 0) >= val;
        } else {
          earned = totalGames >= val;
        }
        break;

      case 'best_time':
        if (!assisted && (cdif || diff) === diff) earned = timeSeconds <= val;
        break;

      case 'total_time':
        if (cdif) {
          const s = stats.find(r => r.difficulty === cdif);
          earned = (s?.total_time || 0) >= val;
        } else {
          earned = totalTime >= val;
        }
        break;

      case 'games_in_day':
        earned = maxGamesInDay >= val;
        break;

      case 'streak_days':
        earned = longestStreak >= val;
        break;

      case 'distinct_days':
        earned = distinctDays >= val;
        break;

      case 'fast_solve':
        if (!assisted && (!cdif || cdif === diff)) earned = timeSeconds <= val;
        break;

      case 'night_owl':
        earned = (nowHour >= 0 && nowHour < 5);
        break;

      case 'early_bird':
        earned = (nowHour >= 5 && nowHour < 8);
        break;

      case 'account_age':
        earned = accountAge >= val;
        break;

      case 'all_difficulties':
        earned = ['easy', 'medium', 'hard'].every(d => playedDiffs.has(d));
        break;

      case 'level':
        earned = (level || 1) >= val;
        break;
    }

    if (earned) {
      const { error } = await db.from('player_badges').insert({ user_id: userId, badge_id: badge.id });
      if (!error) newlyEarned.push(badge);
    }
  }

  if (newlyEarned.length) {
    const { error: ne } = await db.from('notifications').insert({
      user_id: userId, type: 'badge', payload: { badges: newlyEarned }
    });
    if (ne) console.warn('notifications insert:', ne.message);
  }

  return newlyEarned;
}

// ─── Boutique ─────────────────────────────────────────

async function getShopItems() {
  const { data } = await db.from('shop_items').select('*').eq('is_active', true).order('sort_order');
  return data || [];
}

async function getPlayerInventory(userId) {
  const { data } = await db.from('player_inventory').select('item_id, acquired_via, acquired_at').eq('user_id', userId);
  return data || [];
}

async function purchaseItem(userId, itemId) {
  const { data: item } = await db.from('shop_items').select('*').eq('id', itemId).eq('is_active', true).maybeSingle();
  if (!item) throw new Error('Article introuvable');
  if (item.unlock_level !== null) throw new Error('Cet article se débloque par le niveau');

  const { data: profile } = await db.from('profiles').select('coins, level').eq('id', userId).maybeSingle();
  if (!profile) throw new Error('Profil introuvable');
  if ((profile.coins || 0) < item.cost) throw new Error('Pièces insuffisantes');

  const { data: existing } = await db.from('player_inventory')
    .select('id').eq('user_id', userId).eq('item_id', itemId).maybeSingle();
  if (existing) throw new Error('Article déjà possédé');

  const { error: invErr } = await db.from('player_inventory').insert({
    user_id: userId, item_id: itemId, acquired_via: 'shop'
  });
  if (invErr) throw new Error('Erreur lors de l\'achat');

  const { error: coinsErr } = await db.from('profiles').update({
    coins: (profile.coins || 0) - item.cost
  }).eq('id', userId);
  if (coinsErr) console.warn('coins deduct:', coinsErr.message);

  return item;
}

// ─── Export RGPD ─────────────────────────────────────

async function exportUserData(userId) {
  const [profile, stats, levels, badges, inventory] = await Promise.all([
    db.from('profiles').select('username, role, xp, level, coins, created_at').eq('id', userId).single(),
    db.from('player_stats').select('difficulty, games_played, best_time, total_time').eq('user_id', userId),
    db.from('completed_levels').select('difficulty, time_seconds, hints_used, ctrl_h_used, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(500),
    db.from('player_badges').select('badge_id, earned_at, badges(name, icon)').eq('user_id', userId),
    db.from('player_inventory').select('item_id, acquired_via, acquired_at').eq('user_id', userId)
  ]);

  const data = {
    profil:    profile.data,
    stats:     stats.data,
    parties:   levels.data,
    badges:    badges.data,
    inventaire: inventory.data
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'mes-donnees-tango.json'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Suppression de compte ───────────────────────────

async function deleteAccount(userId) {
  await db.from('player_inventory').delete().eq('user_id', userId);
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
  if (s >= 3600) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Préférences utilisateur (DB) ────────────────────

let _currentUserId = null;
let _prefSaveTimer = null;
let _pendingPatch  = {};

async function getUserPrefs(userId) {
  const { data } = await db.from('profiles').select('preferences').eq('id', userId).single();
  return data?.preferences || {};
}

function saveUserPref(userId, patch) {
  _pendingPatch = { ..._pendingPatch, ...patch };
  clearTimeout(_prefSaveTimer);
  _prefSaveTimer = setTimeout(async () => {
    const p = _pendingPatch;
    _pendingPatch = {};
    try {
      const { data } = await db.from('profiles').select('preferences').eq('id', userId).single();
      const merged = { ...(data?.preferences || {}), ...p };
      await db.from('profiles').update({ preferences: merged }).eq('id', userId);
    } catch(e) {}
  }, 600);
}

// ── Menu hamburger commun (pages hors admin) ──────────
function renderGameMenu() {
  if (location.pathname.includes('/admin/')) return;
  const menu = document.getElementById('nav-menu');
  if (!menu) return;
  menu.innerHTML = `
      <button class="nav-menu-item" onclick="menuNew()">✦ Nouvelle partie</button>
      <button class="nav-menu-item" onclick="menuDiff()">🎯 Difficulté</button>
      <button class="nav-menu-item" onclick="menuCommands()">⌨️ Commandes</button>
      <a href="/tips.html" class="nav-menu-item">💡 Conseils</a>
      <a href="/shop.html" class="nav-menu-item">🛒 Boutique</a>
      <div id="menu-auth-item"></div>
      <div class="nav-menu-sep"></div>
      <div class="nav-menu-item menu-pref-row" onclick="toggleRememberDiff(event)">
        <span>Mémoriser la difficulté</span>
        <label class="toggle" onclick="event.stopPropagation()"><input type="checkbox" id="pref-remember" onchange="onPrefChange()"><span class="toggle-track"><span class="toggle-thumb"></span></span></label>
      </div>
      <div class="nav-menu-item menu-pref-row" onclick="toggleExtremeMode(event)" style="color:var(--sun)">
        <span>☠ Mode extrême</span>
        <label class="toggle" onclick="event.stopPropagation()"><input type="checkbox" id="pref-extreme" onchange="onExtremePrefChange()"><span class="toggle-track"><span class="toggle-thumb"></span></span></label>
      </div>
      <div class="nav-menu-item menu-pref-row" onclick="toggleSoundPref(event)">
        <span>🔊 Sons</span>
        <label class="toggle" onclick="event.stopPropagation()"><input type="checkbox" id="pref-sound" onchange="onSoundPrefChange()"><span class="toggle-track"><span class="toggle-thumb"></span></span></label>
      </div>`;
  try {
    const r = document.getElementById('pref-remember'); if (r) r.checked = localStorage.getItem('tango_remember') === '1';
    const e = document.getElementById('pref-extreme');  if (e) e.checked = localStorage.getItem('tango_extreme') === '1';
    const s = document.getElementById('pref-sound');    if (s) s.checked = localStorage.getItem('tango_sound') !== '0';
  } catch (_) {}
}

// Fallbacks (surchargés par le moteur de jeu sur la page de jeu)
function menuNew()      { closeMenu(); location.href = '/index.html'; }
function menuDiff()     { closeMenu(); location.href = '/index.html'; }
function menuCommands() { closeMenu(); location.href = '/index.html'; }
function onPrefChange()        { try { localStorage.setItem('tango_remember', document.getElementById('pref-remember').checked ? '1' : '0'); } catch (e) {} }
function toggleRememberDiff(e) { e.stopPropagation(); const cb = document.getElementById('pref-remember'); cb.checked = !cb.checked; onPrefChange(); }
function onExtremePrefChange() { try { localStorage.setItem('tango_extreme', document.getElementById('pref-extreme').checked ? '1' : '0'); } catch (e) {} }
function toggleExtremeMode(e)  { e.stopPropagation(); const cb = document.getElementById('pref-extreme'); cb.checked = !cb.checked; onExtremePrefChange(); }
function onSoundPrefChange()   { const on = document.getElementById('pref-sound').checked; try { localStorage.setItem('tango_sound', on ? '1' : '0'); } catch (e) {} if (typeof SOUND !== 'undefined') SOUND.setMuted(!on); }
function toggleSoundPref(e)    { e.stopPropagation(); const cb = document.getElementById('pref-sound'); cb.checked = !cb.checked; onSoundPrefChange(); }

// Injecte l'état auth dans la nav (à appeler sur chaque page)
async function initNavAuth(opts = {}) {
  renderGameMenu();
  const user = await getCurrentUser();
  _currentUserId = user?.id || null;
  const el   = document.getElementById('nav-auth');
  const mel  = document.getElementById('menu-auth-item');
  if (!el && !mel) return user;

  if (user) {
    const [profile, prefs] = await Promise.all([getCurrentProfile(), getUserPrefs(user.id).catch(() => ({}))]);
    window._userPrefs = prefs;

    if (prefs.theme && prefs.theme !== document.documentElement.getAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', prefs.theme);
      try { localStorage.setItem('tango_theme', prefs.theme); } catch(e) {}
    }

    _initRealtime(user.id);

    const isVip   = profile?.role === 'vip';
    const isAdmin = profile?.role === 'admin';
    const coins   = profile?.coins || 0;
    if (el) el.innerHTML = `
      <a href="/profile.html" class="nav-auth-link">${profile?.username || 'Profil'}${isVip ? ' <span style="color:var(--moon);font-size:10px">✦ VIP</span>' : ''}</a>
      <span class="nav-coins" title="Pièces">🪙 ${coins}</span>
      ${isAdmin ? '<a href="/admin/" class="nav-auth-link nav-admin">Admin</a>' : ''}
      <button onclick="signOut()" class="nav-auth-btn">Déconnexion</button>`;
    if (mel) mel.innerHTML = `
      <div class="nav-menu-sep"></div>
      <a href="/daily.html" class="nav-menu-item">📅 Niveau du jour</a>
      <a href="/profile.html" class="nav-menu-item">👤 ${profile?.username || 'Profil'}${isVip ? ' ✦' : ''}</a>
      <span class="nav-menu-item" style="pointer-events:none;color:var(--sun)">🪙 ${coins} pièces · Niv. ${profile?.level || 1}</span>
      ${isAdmin ? '<a href="/admin/" class="nav-menu-item">⚙️ Admin</a>' : ''}
      <button onclick="signOut()" class="nav-menu-item">🚪 Déconnexion</button>`;
  } else {
    window._userPrefs = null;
    if (el) el.innerHTML = `<a href="/stats.html" class="nav-auth-link">Statistiques</a><a href="/login.html" class="nav-auth-btn">Connexion</a>`;
    if (mel) mel.innerHTML = `<div class="nav-menu-sep"></div><a href="/daily.html" class="nav-menu-item">📅 Niveau du jour</a><a href="/stats.html" class="nav-menu-item">📊 Statistiques</a><a href="/login.html" class="nav-menu-item">🔑 Connexion</a>`;
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

// ─── Realtime notifications ──────────────────────────

const _notifHandlers = {};
let _notifChannel = null;

function onNotification(type, handler) {
  if (!_notifHandlers[type]) _notifHandlers[type] = [];
  _notifHandlers[type].push(handler);
}

function _dispatchNotif(row) {
  (_notifHandlers[row.type] || []).forEach(h => h(row.payload, row));
}

function _initRealtime(userId) {
  if (_notifChannel) { db.removeChannel(_notifChannel); _notifChannel = null; }
  _notifChannel = db.channel('app-notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
      ({ new: row }) => {
        if (row.user_id === userId || row.user_id === null) _dispatchNotif(row);
      })
    .subscribe();
}

async function sendAdminNotification(type, payload) {
  return db.from('notifications').insert({ user_id: null, type, payload });
}

// ── Système de toasts empilés ──

function _getToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  return c;
}

function _createToast(html, borderColor, duration = 4500) {
  if (typeof SOUND !== 'undefined') SOUND.notify();
  const container = _getToastContainer();
  const toast = document.createElement('div');
  toast.className = 'badge-toast';
  if (borderColor) toast.style.borderColor = borderColor;
  toast.innerHTML = html;

  const close = document.createElement('button');
  close.className = 'badge-toast-close';
  close.innerHTML = '&times;';
  close.setAttribute('aria-label', 'Fermer');
  close.onclick = () => _dismissToast(toast);
  toast.appendChild(close);

  container.prepend(toast);

  toast._timer = setTimeout(() => _dismissToast(toast), duration);
  return toast;
}

function _dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.style.animation = 'toastout .3s ease forwards';
  setTimeout(() => {
    toast.remove();
    const c = document.getElementById('toast-container');
    if (c && !c.children.length) c.remove();
  }, 300);
}

function showBadgeToast(badges) {
  const rows = badges.map(b => `
    <div class="badge-toast-row">
      <span class="badge-toast-ico">${b.icon}</span>
      <div><div class="badge-toast-name">${b.name}</div><div class="badge-toast-desc">${b.description || ''}</div></div>
    </div>`).join('');
  _createToast(`<span class="badge-toast-label">🏅 Badge${badges.length > 1 ? 's' : ''} débloqué${badges.length > 1 ? 's' : ''}</span>${rows}`);
}

function showLevelUpToast(newLevel) {
  _createToast(`
    <span class="badge-toast-label" style="color:var(--sun)">⬆ Niveau supérieur !</span>
    <div class="badge-toast-row">
      <span class="badge-toast-ico">🏆</span>
      <div><div class="badge-toast-name">Niveau ${newLevel} atteint</div><div class="badge-toast-desc">Continuez à jouer pour débloquer de nouvelles récompenses</div></div>
    </div>`, 'rgba(245,200,66,.4)', 5000);
}

function showAdminToast(message) {
  _createToast(`
    <span class="badge-toast-label" style="color:var(--moon)">📢 Message de l'équipe</span>
    <div class="badge-toast-row">
      <span class="badge-toast-ico">📣</span>
      <div style="color:var(--text);font-size:13px">${message}</div>
    </div>`, 'rgba(143,168,212,.45)', 7000);
}

function showRoleToast(role, message) {
  const borderColors = { admin: 'rgba(245,200,66,.4)', vip: 'rgba(143,168,212,.45)', user: 'var(--border2)' };
  const icons = { admin: '⚙️', vip: '✦', user: '👤' };
  _createToast(`
    <span class="badge-toast-label">Changement de rôle</span>
    <div class="badge-toast-row">
      <span class="badge-toast-ico">${icons[role] || '👤'}</span>
      <div style="color:var(--text);font-size:13px">${message}</div>
    </div>`, borderColors[role] || 'var(--border2)', 6000);
}

onNotification('badge',        ({ badges })  => { if (badges?.length) showBadgeToast(badges); });
onNotification('admin_message',({ message }) => { if (message) showAdminToast(message); });
onNotification('role_change',  ({ role, message }) => { if (message) showRoleToast(role, message); });

// ─── Theme ───────────────────────────────────────────

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('tango_theme', t); } catch(e) {}
  if (_currentUserId) saveUserPref(_currentUserId, { theme: t });
}

function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
}

(function initThemeToggle() {
  const navLeft = document.querySelector('.nav-left');
  if (!navLeft) return;
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.id = 'theme-btn';
  btn.setAttribute('aria-label', 'Changer de thème');
  btn.onclick = function(e) { e.stopPropagation(); toggleTheme(); };
  btn.innerHTML = '<span class="theme-toggle-track">'
    + '<span class="theme-toggle-icon theme-icon-moon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>'
    + '<span class="theme-toggle-icon theme-icon-sun"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></span>'
    + '<span class="theme-toggle-thumb"></span></span>';
  const hamburger = navLeft.querySelector('.hamburger');
  if (hamburger) hamburger.after(btn);
  else navLeft.prepend(btn);
})();
