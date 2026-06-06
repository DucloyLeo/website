-- ═══════════════════════════════════════════════════
--  MIGRATION — Table difficulty_params
--  À exécuter UNE FOIS dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════
--
--  Stocke les paramètres de génération par difficulté.
--  Éditables par les admins via /admin/difficulty.html.
--  Le générateur lit ces valeurs au démarrage et utilise
--  les défauts codés dans le JS si la table est absente.
-- ═══════════════════════════════════════════════════

create table if not exists difficulty_params (
  id               text primary key check (id in ('easy','medium','hard')),
  label            text not null,
  -- Cases de départ (clues) sur 36 cases totales
  clues_min        integer not null check (clues_min >= 1 and clues_min <= 36),
  clues_max        integer not null check (clues_max >= 1 and clues_max <= 36),
  -- Contraintes =/ × sur 60 arêtes possibles (30h + 30v)
  constraints_min  integer not null check (constraints_min >= 0 and constraints_min <= 60),
  constraints_max  integer not null check (constraints_max >= 0 and constraints_max <= 60),
  -- Ratio = vs × (0.0 = tout ×, 1.0 = tout =)
  eq_ratio_min     numeric(4,3) not null check (eq_ratio_min >= 0 and eq_ratio_min <= 1),
  eq_ratio_max     numeric(4,3) not null check (eq_ratio_max >= 0 and eq_ratio_max <= 1),
  -- Niveaux de technique (1=Triplet … 7=Élimination)
  tech_min         integer not null check (tech_min >= 1 and tech_min <= 7),
  tech_max         integer not null check (tech_max >= 1 and tech_max <= 7),
  updated_at       timestamptz default now()
);

-- RLS
alter table difficulty_params enable row level security;
create policy "Lecture publique difficulty_params"
  on difficulty_params for select using (true);
create policy "Admin modifie difficulty_params"
  on difficulty_params for all using (is_admin());

-- Valeurs initiales (ajustables via l'admin)
insert into difficulty_params values
  ('easy',   'Facile', 14, 20, 18, 26, 0.600, 0.800, 1, 3),
  ('medium', 'Moyen',   8, 14, 10, 18, 0.400, 0.650, 3, 5),
  ('hard',   'Difficile', 4, 9, 3, 10, 0.300, 0.550, 5, 7)
on conflict (id) do nothing;
