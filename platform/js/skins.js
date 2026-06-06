// ═══════════════════════════════════════════════════
//  skins.js — Rendu des symboles du jeu (soleil / lune)
//
//  Principe : le moteur de jeu n'écrit jamais un glyphe.
//  Il marque chaque cellule comme sun / moon / empty via
//  setCellSymbol(), et c'est le CSS (piloté par l'attribut
//  data-skin sur <html>) qui décide de l'apparence.
//
//  Skins disponibles : 'emoji' (défaut), 'circles', 'bw'.
// ═══════════════════════════════════════════════════

const SKINS = {
  emoji:   { label: 'Emoji',          desc: '☀ / 🌙 classiques' },
  circles: { label: 'Ronds colorés',  desc: 'Rouge / Bleu' },
  bw:      { label: 'Cases N&B',      desc: 'Cellule blanche / noire' }
};

// Marque une cellule selon sa valeur (0 = vide, 1 = soleil, 2 = lune).
// Le glyphe éventuel est rendu par le CSS (::after) — pas en texte.
function setCellSymbol(el, val) {
  el.classList.remove('sym-sun', 'sym-moon', 'sym-empty');
  el.classList.add(val === 1 ? 'sym-sun' : val === 2 ? 'sym-moon' : 'sym-empty');
  // La classe du skin est posée sur la cellule elle-même (pas via un
  // ancêtre data-skin) pour éviter toute « fuite » entre contextes.
  el.classList.remove('skin-emoji', 'skin-circles', 'skin-bw');
  el.classList.add('skin-' + getSkin());
  el.textContent = '';
}

// Applique un skin et le mémorise (localStorage).
function applySkin(name) {
  if (!SKINS[name]) name = 'emoji';
  document.documentElement.setAttribute('data-skin', name);
  try { localStorage.setItem('tango_skin', name); } catch (e) {}
}

// Lit le skin mémorisé (défaut : emoji).
function getSkin() {
  let s = null;
  try { s = localStorage.getItem('tango_skin'); } catch (e) {}
  return SKINS[s] ? s : 'emoji';
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
