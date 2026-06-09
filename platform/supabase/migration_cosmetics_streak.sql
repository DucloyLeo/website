-- ═══════════════════════════════════════════════════════════
--  MIGRATION — Cosmétiques, Streak, Daily bonus, Transactions
--  À exécuter UNE FOIS dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. Colonnes streak + cosmétiques actifs sur profiles ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_current  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_max      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_date date,
  ADD COLUMN IF NOT EXISTS active_title    text,
  ADD COLUMN IF NOT EXISTS active_frame    text,
  ADD COLUMN IF NOT EXISTS active_effect   text,
  ADD COLUMN IF NOT EXISTS active_background text,
  ADD COLUMN IF NOT EXISTS lb_excluded     boolean DEFAULT false;

-- ── 2. Table streak_params ────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_params (
  day_count      integer PRIMARY KEY CHECK (day_count BETWEEN 1 AND 30),
  xp_multiplier  numeric(5,2) DEFAULT 1.00,
  label          text
);

ALTER TABLE streak_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique streak_params"  ON streak_params FOR SELECT USING (true);
CREATE POLICY "Admin gère streak_params"        ON streak_params FOR ALL    USING (is_admin());

INSERT INTO streak_params (day_count, xp_multiplier, label) VALUES
  (1, 1.00, '1er jour'),
  (2, 1.10, '2 jours'),
  (3, 1.20, '3 jours'),
  (4, 1.30, '4 jours'),
  (5, 1.40, '5 jours'),
  (6, 1.50, '6 jours'),
  (7, 2.00, '7 jours — MAX')
ON CONFLICT (day_count) DO NOTHING;

-- ── 3. Table daily_bonus_params ───────────────────────────
CREATE TABLE IF NOT EXISTS daily_bonus_params (
  id          text PRIMARY KEY DEFAULT 'default',
  bonus_xp    integer DEFAULT 50,
  bonus_coins integer DEFAULT 20,
  max_streak_days integer DEFAULT 7
);

ALTER TABLE daily_bonus_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique daily_bonus"  ON daily_bonus_params FOR SELECT USING (true);
CREATE POLICY "Admin gère daily_bonus"        ON daily_bonus_params FOR ALL    USING (is_admin());

INSERT INTO daily_bonus_params (id, bonus_xp, bonus_coins, max_streak_days)
  VALUES ('default', 50, 20, 7)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Table shop_transactions ────────────────────────────
CREATE TABLE IF NOT EXISTS shop_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  item_id     text REFERENCES shop_items(id) ON DELETE SET NULL,
  cost        integer NOT NULL DEFAULT 0,
  acquired_at timestamptz DEFAULT now()
);

ALTER TABLE shop_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture admin transactions"  ON shop_transactions FOR SELECT USING (is_admin());
CREATE POLICY "Insert propre transaction"   ON shop_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 5. Nouveaux types d'items boutique ───────────────────
-- Les types disponibles : skin, grid_skin, frame, effect, background, title
-- Pas de contrainte CHECK sur type → scalable

-- Items de démonstration (cadres, effets, fonds, titres)
INSERT INTO shop_items (id, name, description, icon, type, item_key, cost, unlock_level, sort_order) VALUES
  ('frame-gold',    'Cadre Doré',         'Un cadre lumineux aux reflets dorés.',        '🟡', 'frame',      'frame-gold',    500,  null,  10),
  ('frame-moon',    'Cadre Lune',         'Un cadre aux teintes lunaires apaisantes.',   '🌙', 'frame',      'frame-moon',    300,  null,  11),
  ('frame-vip',     'Cadre VIP',          'Réservé aux meilleurs joueurs.',              '💎', 'frame',      'frame-vip',       0,  10,    12),
  ('effect-sparkle','Éclat Étincelant',   'Des particules scintillantes autour de toi.', '✨', 'effect',     'effect-sparkle', 400,  null,  20),
  ('effect-glow',   'Lueur Douce',        'Un halo lumineux subtil.',                    '🌟', 'effect',     'effect-glow',   200,  null,  21),
  ('bg-stars',      'Fond Étoilé',        'Un ciel étoilé animé en arrière-plan.',       '🌌', 'background', 'bg-stars',      600,  null,  30),
  ('bg-aurora',     'Aurore Boréale',     'Des teintes d'aurore boréale animées.',       '🎆', 'background', 'bg-aurora',     800,  null,  31),
  ('title-speedster','Éclair',            'Pour ceux qui ne perdent pas de temps.',      '⚡', 'title',      'Éclair',        300,  null,  40),
  ('title-master',  'Maître du Tango',    'Le titre des légendes.',                      '👑', 'title',      'Maître du Tango',  0, 20,   41),
  ('title-daily',   'Fidèle au Poste',    'Débloqué après 7 jours de streak.',           '🔥', 'title',      'Fidèle au Poste',  0, null,  42),
  ('grid-contrast', 'Grille Contraste',   'Symboles en noir & blanc à fort contraste.',  '⬛', 'grid_skin',  'bw',              0,  5,    50),
  ('grid-pastel',   'Grille Pastel',      'Des symboles aux teintes pastel douces.',     '🌸', 'grid_skin',  'pastel',        350,  null,  51)
ON CONFLICT (id) DO NOTHING;
