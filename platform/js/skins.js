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

// Init au chargement du script.
document.documentElement.setAttribute('data-skin', getSkin());
