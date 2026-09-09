-- ═══════════════════════════════════════════════════════════
--  NNNN_description.sql
--  Description : (une phrase sur ce que fait cette migration et pourquoi)
--
--  Copier ce fichier vers NNNN_description.sql (NNNN = numéro suivant,
--  4 chiffres, voir le dernier fichier du dossier migrations/).
--  Le bloc do $$ ... end $$ se protège lui-même : le rejouer sur une
--  base où il a déjà tourné ne fait rien (grâce à schema_migrations).
-- ═══════════════════════════════════════════════════════════

do $$
begin
  if exists (select 1 from schema_migrations where id = 'NNNN_description') then
    raise notice 'Migration NNNN_description déjà appliquée, rien à faire.';
    return;
  end if;

  -- ─── Changement réel ──────────────────────────────────────
  -- Toujours préférer les formes idempotentes :
  --   alter table ... add column if not exists ...;
  --   create table if not exists ...;
  --   drop policy if exists "..." on ...; create policy "..." on ...;
  --   insert into ... on conflict (...) do nothing / do update ...;
  --   alter table ... drop constraint if exists ...; alter table ... add constraint ...;
  --
  -- (écrire le SQL du changement ici)


  insert into schema_migrations (id) values ('NNNN_description');
end $$;
