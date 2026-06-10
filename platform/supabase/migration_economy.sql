-- ═══════════════════════════════════════════════════
--  MIGRATION — Système Économie (XP, Niveaux, Boutique)
--  À exécuter UNE FOIS dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════

-- ─── 1. Colonnes sur les tables existantes ───────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp     integer DEFAULT 0   CHECK (xp >= 0),
  ADD COLUMN IF NOT EXISTS level  integer DEFAULT 1   CHECK (level >= 1),
  ADD COLUMN IF NOT EXISTS coins  integer DEFAULT 0   CHECK (coins >= 0);

ALTER TABLE completed_levels
  ADD COLUMN IF NOT EXISTS hints_used  integer DEFAULT 0 CHECK (hints_used >= 0),
  ADD COLUMN IF NOT EXISTS ctrl_h_used boolean DEFAULT false;

-- ─── 2. Étendre condition_type des badges ────────────

ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_condition_type_check;
ALTER TABLE badges ADD CONSTRAINT badges_condition_type_check
  CHECK (condition_type IN (
    'games_played', 'best_time', 'total_time', 'games_in_day',
    'streak_days', 'distinct_days', 'fast_solve', 'night_owl',
    'early_bird', 'account_age', 'all_difficulties', 'level'
  ));

-- ─── 3. Paramètres XP par difficulté ─────────────────

CREATE TABLE IF NOT EXISTS xp_params (
  id           text PRIMARY KEY CHECK (id IN ('easy','medium','hard','extreme')),
  label        text NOT NULL,
  base_xp      integer NOT NULL DEFAULT 50  CHECK (base_xp >= 0),
  hint_penalty integer NOT NULL DEFAULT 15  CHECK (hint_penalty >= 0),
  -- speed_tiers : tableau JSON trié par max_seconds croissant
  -- Format : [{"max_seconds": 20, "multiplier": 2.5}, ...]
  speed_tiers  jsonb NOT NULL DEFAULT '[]',
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE xp_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique xp_params"  ON xp_params FOR SELECT USING (true);
CREATE POLICY "Admin modifie xp_params"     ON xp_params FOR ALL    USING (is_admin());

INSERT INTO xp_params (id, label, base_xp, hint_penalty, speed_tiers) VALUES
  ('easy', 'Facile', 40, 15,
   '[{"max_seconds":20,"multiplier":2.5},{"max_seconds":30,"multiplier":2.0},{"max_seconds":60,"multiplier":1.5},{"max_seconds":120,"multiplier":1.25},{"max_seconds":180,"multiplier":1.1}]'),
  ('medium', 'Moyen', 100, 15,
   '[{"max_seconds":30,"multiplier":2.5},{"max_seconds":60,"multiplier":2.0},{"max_seconds":120,"multiplier":1.5},{"max_seconds":180,"multiplier":1.25},{"max_seconds":300,"multiplier":1.1}]'),
  ('hard', 'Difficile', 200, 15,
   '[{"max_seconds":60,"multiplier":2.5},{"max_seconds":120,"multiplier":2.0},{"max_seconds":180,"multiplier":1.5},{"max_seconds":300,"multiplier":1.25},{"max_seconds":420,"multiplier":1.1}]'),
  ('extreme', 'Extrême', 350, 15,
   '[{"max_seconds":120,"multiplier":2.5},{"max_seconds":180,"multiplier":2.0},{"max_seconds":300,"multiplier":1.5},{"max_seconds":480,"multiplier":1.25},{"max_seconds":600,"multiplier":1.1}]')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Articles de la boutique ──────────────────────

CREATE TABLE IF NOT EXISTS shop_items (
  id           text PRIMARY KEY,
  name         text    NOT NULL,
  description  text    NOT NULL,
  icon         text    NOT NULL DEFAULT '🎁',
  type         text    NOT NULL CHECK (type IN ('skin', 'cosmetic', 'badge')),
  item_key     text    NOT NULL,
  cost         integer NOT NULL DEFAULT 0 CHECK (cost >= 0),
  -- unlock_level : NULL = achat uniquement ; N = débloqué automatiquement au niveau N (cost doit être 0)
  unlock_level integer,
  is_active    boolean DEFAULT true,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique shop_items" ON shop_items FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admin gère shop_items"       ON shop_items FOR ALL    USING (is_admin());

INSERT INTO shop_items (id, name, description, icon, type, item_key, cost, unlock_level, sort_order) VALUES
  ('skin-bw', 'Cases Noir & Blanc',
   'Skin minimaliste : cases noires et blanches.',
   '⬛', 'skin', 'bw', 0, 5, 10)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Inventaire des joueurs ────────────────────────

CREATE TABLE IF NOT EXISTS player_inventory (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      uuid REFERENCES profiles(id)   ON DELETE CASCADE NOT NULL,
  item_id      text REFERENCES shop_items(id) ON DELETE RESTRICT NOT NULL,
  acquired_at  timestamptz DEFAULT now(),
  acquired_via text NOT NULL CHECK (acquired_via IN ('shop', 'level_unlock')),
  UNIQUE (user_id, item_id)
);

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Joueur voit son inventaire"    ON player_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Joueur acquiert un item"       ON player_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin voit tout inventaire"    ON player_inventory FOR SELECT USING (is_admin());
CREATE POLICY "Admin modifie inventaire"      ON player_inventory FOR ALL    USING (is_admin());
