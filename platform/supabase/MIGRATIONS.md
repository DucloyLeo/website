# Procédure de migration de base de données (dev → prod)

## Principe

Tu itères librement sur **dev** — autant de fois que tu veux, en lançant
du SQL directement dans le SQL Editor, sans rien noter. Aucune
discipline requise pendant le travail.

Quand tu es satisfait et prêt à publier une nouvelle version (ex.
`v1.1`, en cohérence avec `CHANGELOG.md`) : on capture **l'état complet
de dev** en **un seul fichier** `migrations/v1.1.sql`, qu'on rejoue sur
prod. Ce fichier ne calcule pas un "diff" — il **redéclare tout ce qui a
changé** de façon idempotente (`add column if not exists`, `drop
policy if exists` + `create policy`, `insert ... on conflict do
update`...). Rejoué sur prod, il ne modifie que ce qui diffère
réellement ; le reste ne fait rien.

Chaque base (prod et dev) a sa table `schema_migrations` qui liste les
versions déjà appliquées — `select id from schema_migrations order by
id;` donne d'un coup d'œil l'historique des publications.

## Publier une nouvelle version

1. **Demande-moi de générer le fichier.** Dis-moi simplement "je veux
   publier vX.Y", je te donne deux requêtes d'introspection à lancer
   sur **dev** (voir ci-dessous) — copie-colle leurs résultats ici.
2. **Je génère** `migrations/vX.Y.sql` à partir de ces résultats : un
   seul fichier auto-protégé (`do $$ ... end $$`, gabarit dans
   `_template_release.sql`) qui déclare l'état complet de dev pour tout
   ce qui a changé.
3. **Tu le lances sur prod** : coller le fichier dans le SQL Editor du
   projet **prod**, exécuter. Une seule fois suffit (et le relancer par
   erreur ne fait rien).
4. **Tu publies le code** :
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```
   C'est ce merge vers `main` qui déclenche le déploiement Cloudflare.
5. **On committe** `migrations/vX.Y.sql` (déjà fait par Claude au moment
   de l'étape 2, sur `dev`) — il suit donc le même merge que le code à
   l'étape 4.

**Ordre important : toujours la base avant le code** (étape 3 avant
étape 4). Si le code partait en premier, il y aurait un court instant où
le nouveau code cherche une colonne/table qui n'existe pas encore sur
prod. En migrant la base d'abord (l'ancien code tourne encore, il
ignore juste la nouveauté), rien ne casse au moment du switch.

## Les deux requêtes d'introspection à lancer sur dev

**Requête 1 — structure** (tables, colonnes, contraintes, policies,
triggers, fonctions) :

```sql
select json_build_object(
  'tables', (
    select json_agg(json_build_object('table_name', relname, 'rls_enabled', relrowsecurity) order by relname)
    from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
  ),
  'columns', (
    select json_agg(json_build_object(
      'table_name', table_name, 'column_name', column_name, 'data_type', data_type,
      'is_nullable', is_nullable, 'column_default', column_default
    ) order by table_name, ordinal_position)
    from information_schema.columns where table_schema = 'public'
  ),
  'constraints', (
    select json_agg(json_build_object(
      'table_name', conrelid::regclass::text, 'name', conname, 'type', contype,
      'definition', pg_get_constraintdef(oid)
    ) order by conrelid::regclass::text, conname)
    from pg_constraint where connamespace = 'public'::regnamespace
  ),
  'policies', (
    select json_agg(json_build_object(
      'table_name', tablename, 'policy_name', policyname, 'cmd', cmd,
      'roles', roles, 'using', qual, 'with_check', with_check
    ) order by tablename, policyname)
    from pg_policies where schemaname = 'public'
  ),
  'triggers', (
    select json_agg(json_build_object(
      'table_name', event_object_table, 'trigger_name', trigger_name,
      'timing', action_timing, 'event', event_manipulation, 'action', action_statement
    ) order by event_object_table, trigger_name)
    from information_schema.triggers where trigger_schema = 'public'
  ),
  'functions', (
    select json_agg(json_build_object('name', p.proname, 'definition', pg_get_functiondef(p.oid)) order by p.proname)
    from pg_proc p join pg_namespace n on p.pronamespace = n.oid where n.nspname = 'public'
  )
) as schema_dump;
```

**Requête 2 — données de configuration** (réglages admin, pas de
données de joueurs). Si tu as créé une nouvelle table de config depuis
la dernière version, ajoute-la à la liste :

```sql
select json_build_object(
  'badges', (select json_agg(t) from badges t),
  'difficulty_params', (select json_agg(t) from difficulty_params t),
  'xp_params', (select json_agg(t) from xp_params t),
  'shop_items', (select json_agg(t) from shop_items t),
  'streak_params', (select json_agg(t) from streak_params t),
  'daily_bonus_params', (select json_agg(t) from daily_bonus_params t),
  'app_config', (select json_agg(t) from app_config t)
) as reference_data;
```

Clique sur chaque cellule résultat pour l'agrandir, copie tout, colle-le
dans le chat.

## Cas particulier : une table/colonne supprimée

Le principe "redéclarer l'état" ne détecte pas tout seul ce qui a été
**retiré** sur dev (une colonne supprimée n'apparaît juste plus dans
l'introspection, mais ne sera pas automatiquement supprimée sur prod).
Dans ce cas, dis-le-moi explicitement au moment de la publication
("j'ai supprimé la colonne X de la table Y") et j'ajoute la ligne `drop
column if exists` correspondante au fichier de version.

## Règle d'or

Ne jamais modifier un fichier `migrations/vX.Y.sql` une fois publié sur
prod. Une correction après coup devient la version suivante (`vX.Y+1`),
jamais une réécriture du fichier existant.

## Fichiers historiques (ne plus toucher)

- `schema.sql` + les 12 `migration_*.sql` (racine de `platform/supabase/`) :
  trace de l'évolution du schéma jusqu'au 2026-09-09, appliqués sur
  **prod**. Figés.
- `dev_bootstrap.sql` : reconstruction fidèle de ce même état à partir
  d'une introspection réelle de la prod, pour amorcer **dev** (et tout
  futur nouveau projet) en un seul fichier. Figé.
- `migrations/0000_migration_tracking.sql` : crée `schema_migrations` et
  marque cet historique comme déjà appliqué sur les deux bases. Exécuté
  une fois sur chacune le 2026-09-09.
- `migrations/vX.Y.sql` : un fichier par version publiée, à partir de
  maintenant — c'est la vraie ligne du temps de la base de données,
  parallèle à celle du code dans `CHANGELOG.md`.

Pour amorcer un **nouveau** projet Supabase à l'avenir (un 3ᵉ
environnement, ou un dev repartant de zéro) : `dev_bootstrap.sql`, puis
`migrations/0000_migration_tracking.sql`, puis tous les `migrations/vX.Y.sql`
dans l'ordre des versions.
