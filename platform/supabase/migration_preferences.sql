-- ═══════════════════════════════════════════════════
--  Migration : Ajouter colonne preferences à profiles
-- ═══════════════════════════════════════════════════

alter table profiles
add column preferences jsonb default '{}'::jsonb;

-- Index pour les requêtes sur les prefs (optionnel, pour perf)
create index idx_profiles_preferences on profiles using gin(preferences);
