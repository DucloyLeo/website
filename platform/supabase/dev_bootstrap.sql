-- ═══════════════════════════════════════════════════════════
--  BOOTSTRAP — Base de données dev, miroir fidèle de la prod
--  Généré le 2026-09-09 à partir d'une introspection réelle du
--  projet Supabase de production (colonnes, contraintes, policies
--  RLS, trigger, fonctions ET données des tables de config —
--  voir la conversation Claude Code du même jour pour la méthode).
--
--  À exécuter UNE SEULE FOIS, en entier, dans le SQL Editor d'un
--  projet Supabase fraîchement créé. Remplace l'enchaînement de
--  schema.sql + tous les migration_*.sql : ceux-ci restent la
--  trace historique de l'évolution du schéma, mais ce fichier-ci
--  est la seule source à utiliser pour un NOUVEAU projet, car il
--  inclut aussi les ajustements faits à la main dans le dashboard
--  (ex : suppression de shop_items_type_check, policies en doublon
--  sur profiles/player_stats) qui n'étaient reflétés dans aucun
--  fichier du repo.
-- ═══════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Si "Automatically expose new tables" a été décoché à la création du
-- projet (recommandé pour ne pas exposer par erreur une future table
-- sans y penser), PostgreSQL refuse l'accès à anon/authenticated avant
-- même que les policies RLS ci-dessous soient évaluées. Les policies
-- restent la seule barrière fine (par ligne) ; ceci ne fait qu'ouvrir
-- la porte pour qu'elles puissent s'appliquer.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on routines to anon, authenticated;

-- ─── 1. Tables (ordre de dépendances FK) ─────────────────────

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  username           text not null unique,
  avatar_url         text,
  role               text default 'user' check (role in ('user','vip','admin')),
  created_at         timestamptz default now(),
  preferences        jsonb default '{}'::jsonb,
  xp                 integer default 0 check (xp >= 0),
  level              integer default 1 check (level >= 1),
  coins              integer default 0 check (coins >= 0),
  is_public          boolean default true,
  streak_current     integer default 0,
  streak_max         integer default 0,
  last_daily_date    date,
  active_title       text,
  active_frame       text,
  active_effect      text,
  active_background  text,
  lb_excluded        boolean default false
);

create table difficulty_params (
  id               text primary key check (id in ('easy','medium','hard','extreme')),
  label            text not null,
  clues_min        integer not null check (clues_min between 1 and 36),
  clues_max        integer not null check (clues_max between 1 and 36),
  constraints_min  integer not null check (constraints_min between 0 and 60),
  constraints_max  integer not null check (constraints_max between 0 and 60),
  eq_ratio_min     numeric not null check (eq_ratio_min between 0 and 1),
  eq_ratio_max     numeric not null check (eq_ratio_max between 0 and 1),
  tech_min         integer not null check (tech_min between 1 and 8),
  tech_max         integer not null check (tech_max between 1 and 8),
  updated_at       timestamptz default now()
);

create table xp_params (
  id            text primary key check (id in ('easy','medium','hard','extreme')),
  label         text not null,
  base_xp       integer not null default 50 check (base_xp >= 0),
  hint_penalty  integer not null default 15 check (hint_penalty >= 0),
  speed_tiers   jsonb not null default '[]'::jsonb,
  updated_at    timestamptz default now()
);

create table app_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz default now()
);

create table badges (
  id               text primary key,
  name             text not null,
  description      text not null,
  icon             text not null,
  condition_type   text not null check (condition_type in (
                     'games_played','best_time','total_time','games_in_day',
                     'streak_days','distinct_days','fast_solve','night_owl',
                     'early_bird','account_age','all_difficulties','level')),
  condition_value  integer not null,
  condition_diff   text check (condition_diff in ('easy','medium','hard') or condition_diff is null),
  sort_order       integer default 0
);

create table player_stats (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  difficulty    text not null check (difficulty in ('easy','medium','hard','extreme')),
  games_played  integer default 0,
  best_time     integer default 0,
  total_time    integer default 0,
  updated_at    timestamptz default now(),
  unique (user_id, difficulty)
);

create table completed_levels (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  seed          text,
  difficulty    text check (difficulty in ('easy','medium','hard','extreme','custom')),
  time_seconds  integer not null,
  completed_at  timestamptz default now(),
  hints_used    integer default 0 check (hints_used >= 0),
  ctrl_h_used   boolean default false
);

create table player_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  badge_id   text not null references badges(id) on delete cascade,
  earned_at  timestamptz default now(),
  unique (user_id, badge_id)
);

create table login_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  logged_at  timestamptz default now(),
  ua_hash    text
);

create table admin_logs (
  id              uuid primary key default uuid_generate_v4(),
  admin_id        uuid not null references profiles(id),
  action          text not null,
  target_user_id  uuid references profiles(id),
  details         jsonb,
  created_at      timestamptz default now()
);

create table custom_levels (
  id          uuid primary key default uuid_generate_v4(),
  seed        text not null unique,
  name        text not null,
  difficulty  text check (difficulty in ('easy','medium','hard','custom')),
  created_by  uuid references profiles(id),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table daily_levels (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  seed        text not null,
  name        text,
  difficulty  text not null check (difficulty in ('easy','medium','hard')),
  is_manual   boolean default false,
  created_at  timestamptz default now()
);

create table daily_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  daily_level_id uuid not null references daily_levels(id) on delete cascade,
  time_seconds   integer not null,
  completed_at   timestamptz default now(),
  unique (user_id, daily_level_id)
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create table streak_params (
  day_count      integer primary key check (day_count between 1 and 30),
  xp_multiplier  numeric(5,2) default 1.00,
  label          text
);

create table daily_bonus_params (
  id               text primary key default 'default',
  bonus_xp         integer default 50,
  bonus_coins      integer default 20,
  max_streak_days  integer default 7
);

create table shop_items (
  id            text primary key,
  name          text not null,
  description   text not null,
  icon          text not null default '🎁',
  type          text not null,
  item_key      text not null,
  cost          integer not null default 0 check (cost >= 0),
  unlock_level  integer,
  is_active     boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

create table shop_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete set null,
  item_id      text references shop_items(id) on delete set null,
  cost         integer not null default 0,
  acquired_at  timestamptz default now()
);

create table player_inventory (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  item_id       text not null references shop_items(id) on delete restrict,
  acquired_at   timestamptz default now(),
  acquired_via  text not null check (acquired_via in ('shop','level_unlock')),
  unique (user_id, item_id)
);

-- ─── 2. Helper admin ──────────────────────────────────────────

create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── 3. Row Level Security ────────────────────────────────────

alter table profiles            enable row level security;
alter table difficulty_params   enable row level security;
alter table xp_params           enable row level security;
alter table app_config          enable row level security;
alter table badges              enable row level security;
alter table player_stats        enable row level security;
alter table completed_levels    enable row level security;
alter table player_badges       enable row level security;
alter table login_logs          enable row level security;
alter table admin_logs          enable row level security;
alter table custom_levels       enable row level security;
alter table daily_levels        enable row level security;
alter table daily_completions   enable row level security;
alter table notifications       enable row level security;
alter table streak_params       enable row level security;
alter table daily_bonus_params  enable row level security;
alter table shop_items          enable row level security;
alter table shop_transactions   enable row level security;
alter table player_inventory    enable row level security;

-- profiles
create policy "Profiles lisibles par tous"     on profiles for select using (true);
create policy "Utilisateur modifie son profil" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));
create policy "Admin modifie tout profil"      on profiles for update using (is_admin());
create policy "Admin modifie profils"          on profiles for update
  using ((select profiles_1.role from profiles profiles_1 where profiles_1.id = auth.uid()) = 'admin');

-- player_stats (historique : deux vagues de policies équivalentes, conservées telles quelles)
create policy "Stats lisibles par tous"        on player_stats for select using (true);
create policy "Stats insert"                   on player_stats for insert with check (auth.uid() = user_id);
create policy "Stats update"                   on player_stats for update using (auth.uid() = user_id);
create policy "Stats delete"                   on player_stats for delete using (auth.uid() = user_id);
create policy "Utilisateur insère ses stats"   on player_stats for insert with check (auth.uid() = user_id);
create policy "Utilisateur lit ses stats"      on player_stats for select using (auth.uid() = user_id);
create policy "Utilisateur modifie ses stats"  on player_stats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Utilisateur supprime ses stats" on player_stats for delete using (auth.uid() = user_id);

-- completed_levels
create policy "Utilisateur voit ses parties"   on completed_levels for select using (auth.uid() = user_id);
create policy "Utilisateur insère ses parties" on completed_levels for insert with check (auth.uid() = user_id);
create policy "Admin voit toutes les parties"  on completed_levels for select using (is_admin());

-- badges
create policy "Badges lisibles par tous"       on badges for select using (true);
create policy "Admin gère les badges"          on badges for all using (is_admin());

-- player_badges
create policy "Badges joueurs lisibles par tous" on player_badges for select using (true);
create policy "Attribution automatique"          on player_badges for insert with check (auth.uid() = user_id);
create policy "Admin attribue des badges"        on player_badges for insert with check (is_admin());
create policy "Admin révoque des badges"         on player_badges for delete using (is_admin());

-- login_logs
create policy "Utilisateur voit ses logs"      on login_logs for select using (auth.uid() = user_id);
create policy "Utilisateur insère ses logs"    on login_logs for insert with check (auth.uid() = user_id);
create policy "Admin voit tous les logs"       on login_logs for select using (is_admin());

-- admin_logs
create policy "Admin lit les logs admin"       on admin_logs for select using (is_admin());
create policy "Admin insère des logs"          on admin_logs for insert with check (is_admin());

-- custom_levels
create policy "Niveaux actifs lisibles par tous" on custom_levels for select using (is_active = true or is_admin());
create policy "Admin gère les niveaux"           on custom_levels for all using (is_admin());

-- difficulty_params
create policy "Lecture publique difficulty_params" on difficulty_params for select using (true);
create policy "Admin modifie difficulty_params"    on difficulty_params for all using (is_admin());

-- xp_params
create policy "Lecture publique xp_params"     on xp_params for select using (true);
create policy "Admin modifie xp_params"        on xp_params for all using (is_admin());

-- app_config
create policy "Public read app_config"  on app_config for select using (true);
create policy "Admin write app_config"  on app_config for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- daily_levels
create policy "daily_levels_read"  on daily_levels for select using (true);
create policy "daily_levels_admin" on daily_levels for all
  using ((select profiles.role from profiles where profiles.id = auth.uid()) = 'admin')
  with check ((select profiles.role from profiles where profiles.id = auth.uid()) = 'admin');

-- daily_completions
create policy "daily_completions_read"   on daily_completions for select using (true);
create policy "daily_completions_insert" on daily_completions for insert with check (auth.uid() = user_id);

-- notifications
create policy "Lecture propre ou globale" on notifications for select using (user_id = auth.uid() or user_id is null);
create policy "Insertion propre ou admin" on notifications for insert
  with check (user_id = auth.uid() or (select profiles.role from profiles where profiles.id = auth.uid()) = 'admin');

-- streak_params
create policy "Lecture publique streak_params" on streak_params for select using (true);
create policy "Admin gère streak_params"       on streak_params for all using (is_admin());

-- daily_bonus_params
create policy "Lecture publique daily_bonus"   on daily_bonus_params for select using (true);
create policy "Admin gère daily_bonus"         on daily_bonus_params for all using (is_admin());

-- shop_items
create policy "Lecture publique shop_items"    on shop_items for select using (is_active = true or is_admin());
create policy "Admin gère shop_items"          on shop_items for all using (is_admin());

-- shop_transactions
create policy "Lecture admin transactions"     on shop_transactions for select using (is_admin());
create policy "Insert propre transaction"      on shop_transactions for insert with check (auth.uid() = user_id);

-- player_inventory
create policy "Joueur voit son inventaire"     on player_inventory for select using (auth.uid() = user_id);
create policy "Joueur acquiert un item"        on player_inventory for insert with check (auth.uid() = user_id);
create policy "Admin voit tout inventaire"     on player_inventory for select using (is_admin());
create policy "Admin modifie inventaire"       on player_inventory for all using (is_admin());

-- ─── 4. Trigger : créer un profil à l'inscription ─────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  uname text;
begin
  uname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'joueur_' || substring(new.id::text, 1, 8)
  );
  while exists (select 1 from profiles where username = uname) loop
    uname := uname || '_' || substring(new.id::text, 1, 4);
  end loop;

  insert into profiles (id, username)
  values (new.id, uname);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── 5. Données de configuration (réglages admin réels de prod) ─

insert into badges (id, name, description, icon, condition_type, condition_value, condition_diff, sort_order) values
  ('first-game',   'Première Partie',  'Terminez votre première partie',                      '🌱', 'games_played', 1,   null,   1),
  ('games-10',     'Habitué',          'Terminez 10 parties',                                 '🔥', 'games_played', 10,  null,   2),
  ('games-50',     'Vétéran',          'Terminez 50 parties',                                 '⭐', 'games_played', 50,  null,   3),
  ('games-100',    'Centurion',        'Terminez 100 parties',                                '💎', 'games_played', 100, null,   4),
  ('hard-first',   'Intrépide',        'Terminez une partie difficile',                       '💀', 'games_played', 1,   'hard', 5),
  ('hard-10',      'Maître du Puzzle', 'Terminez 10 parties difficiles',                       '🏆', 'games_played', 10,  'hard', 6),
  ('speed-easy',   'Éclair',           'Terminez une partie facile en moins de 60 secondes',   '⚡', 'best_time',    60,  'easy', 7),
  ('speed-medium', 'Foudre',           'Terminez une partie moyenne en moins de 90 secondes',  '🌩', 'best_time',    90,  'medium',8),
  ('speed-hard',   'Supersonique',     'Terminez une partie difficile en moins de 3 minutes',  '🚀', 'best_time',    180, 'hard', 9)
on conflict (id) do nothing;

insert into difficulty_params (id, label, clues_min, clues_max, constraints_min, constraints_max, eq_ratio_min, eq_ratio_max, tech_min, tech_max) values
  ('easy',    'Facile',   10, 14, 18, 26, 0.60, 0.80, 1, 3),
  ('medium',  'Moyen',    8,  10, 10, 15, 0.40, 0.65, 3, 5),
  ('hard',    'Difficile',4,  9,  3,  10, 0.30, 0.55, 5, 8),
  ('extreme', 'Extrême',  2,  6,  5,  12, 0.00, 0.20, 5, 8)
on conflict (id) do nothing;

insert into xp_params (id, label, base_xp, hint_penalty, speed_tiers) values
  ('easy',    'Facile',   50,  50,  '[{"multiplier":2.5,"max_seconds":20},{"multiplier":2,"max_seconds":30},{"multiplier":1.5,"max_seconds":60},{"multiplier":1.25,"max_seconds":120},{"multiplier":1.1,"max_seconds":180}]'::jsonb),
  ('medium',  'Moyen',    100, 100, '[{"multiplier":2.5,"max_seconds":20},{"multiplier":2,"max_seconds":30},{"multiplier":1.5,"max_seconds":60},{"multiplier":1.25,"max_seconds":120},{"multiplier":1.1,"max_seconds":180}]'::jsonb),
  ('hard',    'Difficile',200, 150, '[{"multiplier":2.5,"max_seconds":20},{"multiplier":2,"max_seconds":30},{"multiplier":1.5,"max_seconds":60},{"multiplier":1.25,"max_seconds":120},{"multiplier":1.1,"max_seconds":180}]'::jsonb),
  ('extreme', 'Extrême',  350, 350, '[{"multiplier":2.5,"max_seconds":20},{"multiplier":2,"max_seconds":30},{"multiplier":1.5,"max_seconds":60},{"multiplier":1.25,"max_seconds":120},{"multiplier":1.1,"max_seconds":180}]'::jsonb)
on conflict (id) do nothing;

insert into streak_params (day_count, xp_multiplier, label) values
  (1, 1.00, '1er jour'),
  (2, 1.10, '2 jours'),
  (3, 1.20, '3 jours'),
  (4, 1.30, '4 jours'),
  (5, 1.40, '5 jours'),
  (6, 1.50, '6 jours'),
  (7, 2.00, '7 jours — MAX')
on conflict (day_count) do nothing;

insert into daily_bonus_params (id, bonus_xp, bonus_coins, max_streak_days)
  values ('default', 50, 20, 7)
on conflict (id) do nothing;

insert into app_config (key, value) values
  ('xp_curve',  '{"cap":3000,"base":300,"mult":1.13}'::jsonb),
  ('coin_rate', '{"xp_per_coin":20}'::jsonb)
on conflict (key) do nothing;

insert into shop_items (id, name, description, icon, type, item_key, cost, unlock_level, is_active, sort_order) values
  ('frame-gold',     'Cadre Doré',        'Un cadre lumineux aux reflets dorés.',        '🟡', 'frame',      'frame-gold',    1500, null, true,  10),
  ('frame-moon',     'Cadre Lune',        'Un cadre aux teintes lunaires apaisantes.',   '🌙', 'frame',      'frame-moon',    600,  null, true,  11),
  ('frame-vip',      'Cadre VIP',         'Réservé aux meilleurs joueurs.',              '💎', 'frame',      'frame-vip',     0,    10,   true,  12),
  ('effect-sparkle', 'Éclat Étincelant',  'Des particules scintillantes autour de toi.', '✨', 'effect',     'effect-sparkle',1500, null, true,  20),
  ('effect-glow',    'Lueur Douce',       'Un halo lumineux subtil.',                    '🌟', 'effect',     'effect-glow',   1200, null, true,  21),
  ('bg-stars',       'Fond Étoilé',       'Un ciel étoilé animé en arrière-plan.',       '🌌', 'background', 'bg-stars',      1000, 5,    true,  30),
  ('bg-aurora',      'Aurore Boréale',    'Des teintes d''aurore boréale animées.',      '🎆', 'background', 'bg-aurora',     500,  null, true,  31),
  ('title-speedster','Éclair',            'Pour ceux qui ne perdent pas de temps.',      '⚡', 'title',      'Éclair',        500,  10,   true,  40),
  ('title-master',   'Maître du Tango',   'Le titre des légendes.',                      '👑', 'title',      'Maître du Tango',3000, 50,   true,  41),
  ('title-daily',    'Fidèle au Poste',   'Débloqué après 7 jours de streak.',           '🔥', 'title',      'Fidèle au Poste',2000, 20,   false, 42),
  ('grid-contrast',  'Grille Contraste',  'Symboles en noir & blanc à fort contraste.',  '⬛', 'grid_skin',  'bw',            0,    5,    false, 50),
  ('grid-pastel',    'Grille Pastel',     'Des symboles aux teintes pastel douces.',     '🌸', 'grid_skin',  'pastel',        350,  null, false, 51),
  ('skin-bw',        'Cases Noir & Blanc','Skin minimaliste : cases noires et blanches.','⬛', 'skin',       'bw',            0,    5,    true,  10),
  ('skin-circles',   'Ronds colorés',     'Symboles circulaires colorés : rouge et bleu.','🔴','skin',       'circles',       500,  5,    true,  20),
  ('skin-cards1',    'Cartes #1',         'Cartes à jouer : Cœur et Pique.',             '❤', 'skin',       'cards1',        750,  5,    true,  21),
  ('skin-cards2',    'Cartes #2',         'Cartes à jouer : Carreau et Trèfle.',         '♦', 'skin',       'cards2',        750,  5,    true,  22),
  ('skin-skull',     'Amour & Mort',      'Thème contraste : Cœur et Tête de mort.',     '❤', 'skin',       'skull',         1000, 5,    true,  23),
  ('skin-tictactoe', 'TicTacToe',         'Symboles de jeu : Cercle et Croix.',          '🔵', 'skin',       'tictactoe',     1000, 5,    true,  24),
  ('skin-fruits',    'Fruits',            'Fruits amusants : Pomme et Banane.',          '🍎', 'skin',       'fruits',        1250, 5,    true,  25)
on conflict (id) do nothing;
