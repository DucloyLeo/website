-- ═══════════════════════════════════════════════════
--  MIGRATION — Ajouter la difficulté Extrême
--  À exécuter UNE FOIS dans Supabase > SQL Editor
--  (après migration_difficulty_params.sql)
-- ═══════════════════════════════════════════════════

-- Étendre la contrainte CHECK pour inclure 'extreme'
alter table difficulty_params
  drop constraint if exists difficulty_params_id_check;

alter table difficulty_params
  add constraint difficulty_params_id_check
  check (id in ('easy','medium','hard','extreme'));

-- Insérer les paramètres du mode extrême
insert into difficulty_params
  (id, label, clues_min, clues_max, constraints_min, constraints_max,
   eq_ratio_min, eq_ratio_max, tech_min, tech_max)
values
  ('extreme', 'Extrême', 4, 6, 2, 5, 0.000, 0.300, 5, 7)
on conflict (id) do nothing;
