-- ═══════════════════════════════════════════════════
--  Migration : Ajouter colonne preferences à profiles
-- ═══════════════════════════════════════════════════

alter table profiles
add column preferences jsonb default '{}'::jsonb;

-- Index pour les requêtes sur les prefs (optionnel, pour perf)
create index idx_profiles_preferences on profiles using gin(preferences);

-- Note : preferences stocke :
--   sound_volume (0-100) — 0 = muted, >0 = active
--   theme ('light' ou 'dark')
--   remember_diff (true/false)
--   diff (la difficulté à mémoriser)
--   skin (le skin actif)
--   Et autres prefs utilisateur futures
