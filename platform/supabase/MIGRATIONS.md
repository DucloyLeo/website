# Procédure de migration de base de données (dev → prod)

## Principe

Chaque changement de schéma (nouvelle table, colonne, contrainte, policy,
donnée de config...) devient un fichier SQL numéroté dans
`platform/supabase/migrations/`, testé sur **dev**, puis rejoué **tel
quel** sur **prod**. Chaque base (prod et dev) a sa propre table
`schema_migrations` qui retient ce qui a déjà été appliqué — rejouer un
fichier par erreur ne fait jamais rien (idempotent).

Ça évite le problème qu'on a eu en créant le projet dev : des ajustements
faits à la main dans le dashboard (contrainte supprimée, policy ajoutée)
sans qu'aucun fichier du repo ne le reflète, découverts seulement des
mois plus tard.

## Pour chaque nouveau changement

1. **Copier le template** : `migrations/_template.sql` →
   `migrations/NNNN_description.sql` (NNNN = numéro suivant à 4 chiffres
   — voir le nom du dernier fichier du dossier).
2. **Écrire le SQL** du changement à l'intérieur du bloc `do $$ ... end
   $$`, en formes idempotentes autant que possible (`if not exists`,
   `on conflict`, `drop ... if exists` avant un `create`).
3. **Exécuter sur dev d'abord** : coller le fichier dans le SQL Editor
   du projet Supabase **dev**, lancer.
4. **Tester** la fonctionnalité correspondante contre dev (en local ou
   sur un déploiement de la branche `dev`).
5. **Rejouer sur prod** : coller le **même fichier, sans aucune
   modification**, dans le SQL Editor du projet **prod**, lancer.
6. **Committer** le fichier dans `platform/supabase/migrations/` (sur
   `dev`, fusionné vers `main` avec le reste du code au moment de la
   publication).

## Règle d'or

Ne jamais modifier un fichier de migration déjà exécuté quelque part
(dev ou prod). Besoin de corriger quelque chose ? Nouveau fichier
numéroté qui corrige le précédent — jamais une réécriture du fichier
existant.

## Vérifier ce qui a été appliqué où

```sql
select id, applied_at from schema_migrations order by id;
```

Si dev et prod affichent des listes différentes, c'est qu'une migration
a été oubliée quelque part — il suffit de rejouer le(s) fichier(s)
manquant(s) sur la base en retard pour les remettre d'accord.

## Fichiers historiques (ne plus toucher)

- `schema.sql` + les 12 `migration_*.sql` : trace de l'évolution du
  schéma jusqu'au 2026-09-09, appliqués sur **prod**. Ne plus modifier
  ni rejouer.
- `dev_bootstrap.sql` : reconstruction fidèle de ce même état, à partir
  d'une introspection réelle de la prod, pour amorcer **dev** (et tout
  futur nouveau projet) en un seul fichier. Reste un instantané figé.
- `migrations/0000_migration_tracking.sql` : marque cet historique comme
  "déjà appliqué" sur les deux bases et met en place le suivi. À exécuter
  une fois sur chaque base existante (fait le 2026-09-09).

Pour amorcer un **nouveau** projet Supabase à l'avenir (un 3ᵉ
environnement, ou un dev repartant de zéro) : `dev_bootstrap.sql`, puis
`migrations/0000_migration_tracking.sql`, puis tous les fichiers
`migrations/NNNN_*.sql` suivants dans l'ordre.
