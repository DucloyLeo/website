-- ═══════════════════════════════════════════════════
--  MIGRATION — Autoriser 'extreme' dans les tables de jeu
--  À exécuter UNE FOIS dans Supabase > SQL Editor
--  (après migration_extreme_params.sql)
-- ═══════════════════════════════════════════════════

-- completed_levels : autoriser 'extreme' en plus de 'easy','medium','hard','custom'
alter table completed_levels
  drop constraint if exists completed_levels_difficulty_check;

alter table completed_levels
  add constraint completed_levels_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard', 'extreme', 'custom'));

-- player_stats : autoriser 'extreme' en plus de 'easy','medium','hard'
alter table player_stats
  drop constraint if exists player_stats_difficulty_check;

alter table player_stats
  add constraint player_stats_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard', 'extreme'));
