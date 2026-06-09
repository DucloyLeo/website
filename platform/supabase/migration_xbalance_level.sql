-- ═══════════════════════════════════════════════════
--  MIGRATION — Niveau 8 : tElim, tXBalance au niveau 7
--  À exécuter UNE FOIS dans Supabase > SQL Editor
--  (après migration_extreme_params.sql)
-- ═══════════════════════════════════════════════════
--
--  La nouvelle technique "Balance + contrainte ×" est insérée
--  au niveau 7 du solveur. tElim passe au niveau 8.
--  Les difficultés hard et extreme qui requièrent l'élimination
--  voient leur tech_max passer de 7 à 8.
-- ═══════════════════════════════════════════════════

-- Étendre les contraintes CHECK pour autoriser tech_max = 8
alter table difficulty_params drop constraint if exists difficulty_params_tech_max_check;
alter table difficulty_params drop constraint if exists difficulty_params_tech_min_check;

alter table difficulty_params
  add constraint difficulty_params_tech_max_check
  check (tech_max >= 1 and tech_max <= 8);

alter table difficulty_params
  add constraint difficulty_params_tech_min_check
  check (tech_min >= 1 and tech_min <= 8);

-- Mettre à jour hard et extreme pour que l'élimination (L8) reste accessible
update difficulty_params
  set tech_max = 8
  where id in ('hard', 'extreme') and tech_max = 7;
