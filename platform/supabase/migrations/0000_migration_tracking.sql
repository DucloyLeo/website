-- ═══════════════════════════════════════════════════════════
--  0000_migration_tracking.sql
--  Met en place le suivi des migrations. À exécuter UNE FOIS sur
--  CHAQUE base (prod ET dev) — sans risque de le rejouer par erreur,
--  tout est idempotent.
--
--  On y "backfille" l'historique déjà appliqué sur les deux bases
--  (schema.sql + les 12 migration_*.sql côté prod, dev_bootstrap.sql
--  côté dev — les deux aboutissent au même schéma, donc on marque le
--  même historique logique comme déjà fait sur les deux, et seules les
--  migrations numérotées à partir d'ici seront réellement nouvelles).
-- ═══════════════════════════════════════════════════════════

create table if not exists schema_migrations (
  id          text primary key,
  applied_at  timestamptz default now()
);

insert into schema_migrations (id) values
  ('0001_schema'),
  ('0002_badges_conditions'),
  ('0003_difficulty_params'),
  ('0004_extreme_params'),
  ('0005_extreme_difficulty'),
  ('0006_xbalance_level'),
  ('0007_cosmetics_streak'),
  ('0008_economy'),
  ('0009_profile_privacy'),
  ('0010_app_config'),
  ('0011_preferences'),
  ('0012_skins_shop')
on conflict (id) do nothing;
