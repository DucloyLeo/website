// ═══════════════════════════════════════════════════
//  skins.js — Rendu des symboles du jeu (soleil / lune)
//
//  Principe : le moteur de jeu n'écrit jamais un glyphe.
//  Il marque chaque cellule comme sun / moon / empty via
//  setCellSymbol(), et c'est le CSS (piloté par l'attribut
//  data-skin sur <html>) qui décide de l'apparence.
//
//  Skins disponibles : 'legacy' (défaut), 'circles', 'bw', et autres payants.
// ═══════════════════════════════════════════════════

const SKINS = {
  legacy:   { label: 'Legacy',         desc: '☀ / 🌙 classiques' },
  circles:  { label: 'Ronds colorés',  desc: 'Rouge / Bleu' },
  bw:       { label: 'Cases N&B',      desc: 'Cellule blanche / noire' },
  cards1:   { label: 'Cartes #1',      desc: '❤ / ♠ (Cœur/Pique)' },
  cards2:   { label: 'Cartes #2',      desc: '♦ / ♣ (Carreau/Trèfle)' },
  skull:    { label: 'Amour & Mort',   desc: '❤ / 💀 (Cœur/Tête)' },
  tictactoe: { label: 'TicTacToe',     desc: '🔵 / ❌ (Bleu/Rouge)' },
  fruits:   { label: 'Fruits',         desc: '🍎 / 🍌 (Pomme/Banane)' }
};

// Marque une cellule selon sa valeur (0 = vide, 1 = soleil, 2 = lune).
// Le glyphe éventuel est rendu par le CSS (::after) — pas en texte.
function setCellSymbol(el, val) {
  el.classList.remove('sym-sun', 'sym-moon', 'sym-empty');
  el.classList.add(val === 1 ? 'sym-sun' : val === 2 ? 'sym-moon' : 'sym-empty');
  // La classe du skin est posée sur la cellule elle-même (pas via un
  // ancêtre data-skin) pour éviter toute « fuite » entre contextes.
  el.classList.remove('skin-legacy', 'skin-circles', 'skin-bw', 'skin-cards1', 'skin-cards2', 'skin-skull', 'skin-tictactoe', 'skin-fruits');
  el.classList.add('skin-' + getSkin());
  el.textContent = '';
}

// Applique un skin et le mémorise (localStorage).
function applySkin(name) {
  if (!SKINS[name]) name = 'legacy';
  document.documentElement.setAttribute('data-skin', name);
  try { localStorage.setItem('tango_skin', name); } catch (e) {}
}

// Lit le skin mémorisé (défaut : legacy).
function getSkin() {
  let s = null;
  try { s = localStorage.getItem('tango_skin'); } catch (e) {}
  return SKINS[s] ? s : 'legacy';
}

// Rafraîchit les vues affectées par un changement de skin (si présentes).
function _refreshSkinViews() {
  if (typeof renderGrid === 'function') { try { renderGrid(); } catch (e) {} }
  if (typeof renderSkinOptions === 'function') { try { renderSkinOptions(); } catch (e) {} }
}

// Persiste le skin dans le compte (préférences Supabase) si connecté.
async function saveSkinToAccount(name) {
  try {
    if (typeof getCurrentUser !== 'function' || typeof saveUserPref !== 'function') return;
    const user = await getCurrentUser();
    if (user) saveUserPref(user.id, { skin: name });
  } catch (e) {}
}

// Au chargement : si connecté, le skin du compte fait autorité (sync multi-appareils).
async function syncSkinFromAccount() {
  try {
    if (typeof getCurrentUser !== 'function' || typeof getUserPrefs !== 'function') return;
    const user = await getCurrentUser();
    if (!user) return;
    const prefs = await getUserPrefs(user.id);
    const s = prefs && prefs.skin;
    if (s && SKINS[s] && s !== getSkin()) {
      applySkin(s);
      _refreshSkinViews();
    }
  } catch (e) {}
}

// Définit le skin : applique en local, sync les vues, et persiste au compte.
function setSkin(name) {
  applySkin(name);
  _refreshSkinViews();
  saveSkinToAccount(name);
}

// Vérifie si un skin est déverrouillé pour l'utilisateur courant.
// legacy et bw sont toujours disponibles. Les autres doivent être achetés ou débloqués par niveau.
async function isSkinUnlocked(skinKey) {
  if (['legacy', 'bw'].includes(skinKey)) return true;
  try {
    if (typeof getCurrentUser !== 'function') return false;
    const user = await getCurrentUser();
    if (!user) return false;

    const itemId = 'skin-' + skinKey;
    const [invRes, itemRes, profileRes] = await Promise.all([
      db.from('player_inventory').select('id').eq('user_id', user.id).eq('item_id', itemId).maybeSingle(),
      db.from('shop_items').select('unlock_level').eq('id', itemId).maybeSingle(),
      db.from('profiles').select('level').eq('id', user.id).maybeSingle()
    ]);

    if (invRes.data) return true;

    const unlockLevel = itemRes.data?.unlock_level;
    const userLevel   = profileRes.data?.level || 1;
    return unlockLevel !== null && unlockLevel !== undefined && userLevel >= unlockLevel;
  } catch(e) { return false; }
}

// Init au chargement du script (rendu immédiat depuis le cache local).
document.documentElement.setAttribute('data-skin', getSkin());

// Sync inter-onglets du même navigateur (changement dans un autre onglet).
window.addEventListener('storage', e => {
  if (e.key === 'tango_skin' && e.newValue && SKINS[e.newValue]) {
    document.documentElement.setAttribute('data-skin', e.newValue);
    _refreshSkinViews();
  }
});

// Sync depuis le compte (asynchrone, écrase le cache local si connecté).
syncSkinFromAccount();
