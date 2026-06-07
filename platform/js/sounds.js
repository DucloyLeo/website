// ═══════════════════════════════════════════════════════
//  sounds.js — Effets sonores Tangoléo (Web Audio API)
//
//  Sons générés par code (oscillateurs) : aucun fichier à
//  charger, légers, et entièrement réglables.
//
//  POUR AJUSTER UN SON : modifier SOUND_CONFIG ci-dessous
//  (fréquences en Hz, durées en secondes, volumes 0→1,
//  formes d'onde : 'sine' | 'triangle' | 'square' | 'sawtooth').
//
//  Chaque événement a sa propre méthode dans l'objet SOUND.
//  Coupure globale : SOUND.toggle() / persistée en localStorage.
// ═══════════════════════════════════════════════════════

const SOUND_CONFIG = {
  masterVolume: 0.35,                 // volume global (0 → 1)

  // Placement d'un symbole — tonalité plus chaude pour le soleil,
  // plus grave pour la lune.
  place: {
    sun:  { freq: 528, type: 'triangle' },
    moon: { freq: 352, type: 'triangle' },
    dur: 0.10, vol: 0.55, attack: 0.004,
  },

  // Effacement — petit blip descendant, plus feutré.
  erase: { freq: 300, slideTo: 170, type: 'sine', dur: 0.09, vol: 0.40 },

  // Erreur — son grave et sourd, discret.
  error: { freq: 150, slideTo: 104, type: 'sine', dur: 0.20, vol: 0.55, throttle: 0.15 },

  // Indice — petit « ding » cristallin (deux notes superposées).
  hint:  { freqs: [784, 1175], type: 'sine', dur: 0.22, vol: 0.35 },

  // Ligne/colonne complétée — courte montée arpégée.
  lineComplete: { freqs: [523, 659, 784], type: 'triangle', step: 0.045, dur: 0.13, vol: 0.30 },

  // Victoire — petite mélodie ascendante.
  win:   { freqs: [523, 659, 784, 1047], type: 'triangle', step: 0.10, dur: 0.20, vol: 0.42 },

  // Notification (toast) — petit carillon doux à deux notes.
  notify: { freqs: [659, 988], type: 'sine', step: 0.09, dur: 0.30, vol: 0.40 },
};

const SOUND = {

  ctx: null,
  master: null,
  muted: false,
  _lastError: 0,

  // Lit la préférence (par défaut : activé).
  _loadPref() {
    try { this.muted = localStorage.getItem('tango_sound') === '0'; } catch (e) {}
  },

  // Prépare le contexte audio (paresseux, au premier geste utilisateur)
  // et le réveille s'il est suspendu. Retourne false si muet/indispo.
  _ready() {
    if (this.muted) return false;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = SOUND_CONFIG.masterVolume;
        this.master.connect(this.ctx.destination);
      } catch (e) { return false; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },

  // Joue une note avec enveloppe (attaque rapide + extinction douce).
  // opts : { freq, type, dur, vol, attack, slideTo, at } (at = délai en s)
  _tone(opts) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.at || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + opts.dur);
    const vol = (opts.vol == null ? 0.5 : opts.vol);
    const atk = opts.attack || 0.005;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.03);
  },

  // ── Événements ────────────────────────────────────────
  place(val) {
    if (!this._ready()) return;
    const p = SOUND_CONFIG.place;
    const s = val === 2 ? p.moon : p.sun;
    this._tone({ freq: s.freq, type: s.type, dur: p.dur, vol: p.vol, attack: p.attack });
  },

  erase() {
    if (!this._ready()) return;
    const e = SOUND_CONFIG.erase;
    this._tone({ freq: e.freq, slideTo: e.slideTo, type: e.type, dur: e.dur, vol: e.vol });
  },

  error() {
    if (!this._ready()) return;
    const e = SOUND_CONFIG.error;
    const now = this.ctx.currentTime;
    if (now - this._lastError < (e.throttle || 0)) return; // évite les doublons (ligne+colonne)
    this._lastError = now;
    this._tone({ freq: e.freq, slideTo: e.slideTo, type: e.type, dur: e.dur, vol: e.vol });
  },

  hint() {
    if (!this._ready()) return;
    const h = SOUND_CONFIG.hint;
    h.freqs.forEach(f => this._tone({ freq: f, type: h.type, dur: h.dur, vol: h.vol }));
  },

  lineComplete() {
    if (!this._ready()) return;
    const l = SOUND_CONFIG.lineComplete;
    l.freqs.forEach((f, i) => this._tone({ freq: f, type: l.type, dur: l.dur, vol: l.vol, at: i * l.step }));
  },

  win() {
    if (!this._ready()) return;
    const w = SOUND_CONFIG.win;
    w.freqs.forEach((f, i) => this._tone({ freq: f, type: w.type, dur: w.dur, vol: w.vol, at: i * w.step }));
  },

  notify() {
    if (!this._ready()) return;
    const n = SOUND_CONFIG.notify;
    n.freqs.forEach((f, i) => this._tone({ freq: f, type: n.type, dur: n.dur, vol: n.vol, at: i * n.step }));
  },

  // ── Coupure (mute) ────────────────────────────────────
  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem('tango_sound', m ? '0' : '1'); } catch (e) {}
  },
  toggle() { this.setMuted(!this.muted); return !this.muted; },
};

SOUND._loadPref();
// Déverrouille le contexte audio au tout premier geste (politique navigateur).
window.addEventListener('pointerdown', () => SOUND._ready(), { once: true });
