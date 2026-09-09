-- ═══════════════════════════════════════════════════════════
--  vX.Y.sql
--  Migration associée à la version vX.Y du site (voir CHANGELOG.md).
--
--  Contenu : l'état COMPLET voulu pour tout ce qui a changé depuis la
--  dernière version, déclaré de façon idempotente (jamais de diff
--  calculé — juste "voici comment ça doit être", rejouable sans risque
--  sur une base qui a déjà une partie de ce contenu) :
--    alter table ... add column if not exists ...;
--    alter table ... drop constraint if exists ...; alter table ... add constraint ...;
--    drop policy if exists "..." on ...; create policy "..." on ...;
--    create or replace function ...;
--    insert into ... (...) values (...) on conflict (...) do update set ...;
--
--  Générée par Claude à partir d'une introspection réelle de dev au
--  moment de la publication (voir MIGRATIONS.md, section "Publier une
--  nouvelle version").
-- ═══════════════════════════════════════════════════════════

do $$
begin
  if exists (select 1 from schema_migrations where id = 'vX.Y') then
    raise notice 'Migration vX.Y déjà appliquée, rien à faire.';
    return;
  end if;

  -- ─── État déclaré (généré à partir de dev) ─────────────────


  insert into schema_migrations (id) values ('vX.Y');
end $$;
