-- ═══════════════════════════════════════════════════
--  MIGRATION — Étendre les types de conditions de badges
--  À exécuter UNE FOIS dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════
--
--  Sans cette migration, la base rejette tout badge dont
--  condition_type n'est pas 'games_played' ou 'best_time'.
--  Cette migration autorise les 9 nouveaux types gérés
--  par platform/js/auth.js.
-- ═══════════════════════════════════════════════════

alter table badges drop constraint if exists badges_condition_type_check;

alter table badges add constraint badges_condition_type_check
  check (condition_type in (
    'games_played',     -- Parties jouées (total ou par difficulté) >= valeur
    'best_time',        -- Meilleur temps <= valeur (s), par difficulté
    'total_time',       -- Temps de jeu cumulé >= valeur (s), total ou par difficulté
    'games_in_day',     -- Parties dans une même journée >= valeur
    'streak_days',      -- Jours consécutifs joués >= valeur
    'distinct_days',    -- Nombre de jours différents joués >= valeur
    'fast_solve',       -- Résoudre une partie en <= valeur (s), instantané
    'night_owl',        -- Partie terminée entre 0h et 5h (valeur ignorée)
    'early_bird',       -- Partie terminée entre 5h et 8h (valeur ignorée)
    'account_age',      -- Ancienneté du compte >= valeur (jours)
    'all_difficulties'  -- Avoir gagné en easy, medium ET hard (valeur ignorée)
  ));
