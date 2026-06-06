// ═══════════════════════════════════════════════════════
//  animations.js — Contrôleur d'animations Tangoléo
//
//  Toutes les animations passent par cet objet ANIM.
//  Pour modifier une animation : changer sa fonction ici.
//  Pour ajuster les timings/couleurs : changer les
//  variables CSS dans animations.css.
//  Pour désactiver une animation : retourner early.
// ═══════════════════════════════════════════════════════

// Décalage entre chaque case lors de la propagation de la lueur (ms)
const ANIM_LINE_GLOW_STAGGER = 55;

const ANIM = {

  // Vérifie la préférence système (prefers-reduced-motion).
  // Les variables CSS sont déjà à 0ms dans ce cas,
  // mais ce flag permet de skip le JS aussi.
  get reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Utilitaire interne : applique une classe CSS d'animation
  // et la retire une fois terminée.
  _trigger(el, cls, removeDuration) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow pour relancer l'animation
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), removeDuration);
  },

  // ── Placement d'un symbole ───────────────────────────
  // Appelé après cycleCell quand la valeur devient SUN ou MOON.
  place(cellEl) {
    this._trigger(cellEl, 'anim-place', 250);
  },

  // ── Effacement d'un symbole ──────────────────────────
  // Appelé après cycleCell quand la valeur devient EMPTY.
  erase(cellEl) {
    this._trigger(cellEl, 'anim-erase', 180);
  },

  // ── Erreur (shake) ───────────────────────────────────
  // Appelé dans highlightCell(key, true) quand une erreur
  // est détectée (après le délai de 2s).
  error(cellEl) {
    this._trigger(cellEl, 'anim-error', 380);
  },

  // ── Chargement initial de la grille ──────────────────
  // Appelé une seule fois lors de l'affichage d'un nouveau
  // puzzle. Les cellules apparaissent en cascade depuis
  // haut-gauche vers bas-droite.
  gridLoad(cellEls) {
    if (this.reduced) return;
    cellEls.forEach((el, i) => {
      el.style.setProperty('--ci', i);
      el.classList.add('anim-cell-in');
    });
    // Nettoyer les classes après la fin de la dernière animation
    const last = cellEls.length - 1;
    const delay = last * 16 + 300; // stagger + durée
    setTimeout(() => {
      cellEls.forEach(el => {
        el.classList.remove('anim-cell-in');
        el.style.removeProperty('--ci');
      });
    }, delay);
  },

  // ── Lueur de ligne/colonne complétée ─────────────────
  // orderedCells : les cases dans l'ordre de propagation
  // (la première brille en premier, la dernière en dernier).
  lineGlow(orderedCells) {
    if (this.reduced) return;
    orderedCells.forEach((el, i) => {
      setTimeout(() => this._trigger(el, 'anim-line-glow', 700), i * ANIM_LINE_GLOW_STAGGER);
    });
  },

  // ── Cascade de victoire ──────────────────────────────
  // Appelé dès que la victoire est détectée.
  // Les cellules flashent en dorée ligne par ligne.
  winCascade(cellEls) {
    if (this.reduced) return;
    cellEls.forEach((el, i) => {
      setTimeout(() => this._trigger(el, 'anim-win-flash', 600), i * 28);
    });
  },

};
