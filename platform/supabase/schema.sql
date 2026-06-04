-- ═══════════════════════════════════════════════════
--  SCHEMA — Puzzle Platform
--  À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Tables ─────────────────────────────────────────

-- Profils publics (liés à auth.users)
create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  username    text unique not null,
  avatar_url  text,
  role        text default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz default now()
);

-- Statistiques par difficulté
create table player_stats (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  difficulty   text not null check (difficulty in ('easy', 'medium', 'hard')),
  games_played integer default 0,
  best_time    integer default 0,  -- secondes (0 = aucune)
  total_time   integer default 0,
  updated_at   timestamptz default now(),
  unique (user_id, difficulty)
);

-- Historique des parties complétées
create table completed_levels (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  seed         text,
  difficulty   text check (difficulty in ('easy', 'medium', 'hard', 'custom')),
  time_seconds integer not null,
  completed_at timestamptz default now()
);

-- Définitions des badges (gérées par admin)
create table badges (
  id               text primary key,
  name             text not null,
  description      text not null,
  icon             text not null,
  condition_type   text not null check (condition_type in ('games_played', 'best_time')),
  condition_value  integer not null,
  condition_diff   text check (condition_diff in ('easy', 'medium', 'hard') or condition_diff is null),
  sort_order       integer default 0
);

-- Badges obtenus par les joueurs
create table player_badges (
  id        uuid default uuid_generate_v4() primary key,
  user_id   uuid references profiles(id) on delete cascade not null,
  badge_id  text references badges(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique (user_id, badge_id)
);

-- Logs de connexion (user_agent hashé — conformité RGPD)
create table login_logs (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references profiles(id) on delete cascade not null,
  logged_at       timestamptz default now(),
  ua_hash         text  -- SHA-256 tronqué du user-agent
);

-- Logs des actions admin
create table admin_logs (
  id             uuid default uuid_generate_v4() primary key,
  admin_id       uuid references profiles(id) not null,
  action         text not null,
  target_user_id uuid references profiles(id),
  details        jsonb,
  created_at     timestamptz default now()
);

-- Niveaux personnalisés (seeds gérés par admin)
create table custom_levels (
  id          uuid default uuid_generate_v4() primary key,
  seed        text unique not null,
  name        text not null,
  difficulty  text check (difficulty in ('easy', 'medium', 'hard', 'custom')),
  created_by  uuid references profiles(id),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ─── Row Level Security ──────────────────────────────

alter table profiles        enable row level security;
alter table player_stats    enable row level security;
alter table completed_levels enable row level security;
alter table badges          enable row level security;
alter table player_badges   enable row level security;
alter table login_logs      enable row level security;
alter table admin_logs      enable row level security;
alter table custom_levels   enable row level security;

-- Helper : est-ce que l'utilisateur connecté est admin ?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles
create policy "Profiles lisibles par tous"        on profiles for select using (true);
create policy "Utilisateur modifie son profil"    on profiles for update using (auth.uid() = id);
create policy "Admin modifie tout profil"         on profiles for update using (is_admin());

-- Player stats
create policy "Stats lisibles par tous"           on player_stats for select using (true);
create policy "Utilisateur gère ses stats"        on player_stats for all using (auth.uid() = user_id);

-- Completed levels
create policy "Utilisateur voit ses parties"      on completed_levels for select using (auth.uid() = user_id);
create policy "Utilisateur insère ses parties"    on completed_levels for insert with check (auth.uid() = user_id);
create policy "Admin voit toutes les parties"     on completed_levels for select using (is_admin());

-- Badges
create policy "Badges lisibles par tous"          on badges for select using (true);
create policy "Admin gère les badges"             on badges for all using (is_admin());

-- Player badges
create policy "Badges joueurs lisibles par tous"  on player_badges for select using (true);
create policy "Attribution automatique"           on player_badges for insert with check (auth.uid() = user_id);
create policy "Admin attribue des badges"         on player_badges for insert with check (is_admin());
create policy "Admin révoque des badges"          on player_badges for delete using (is_admin());

-- Login logs
create policy "Utilisateur voit ses logs"         on login_logs for select using (auth.uid() = user_id);
create policy "Utilisateur insère ses logs"       on login_logs for insert with check (auth.uid() = user_id);
create policy "Admin voit tous les logs"          on login_logs for select using (is_admin());

-- Admin logs
create policy "Admin lit les logs admin"          on admin_logs for select using (is_admin());
create policy "Admin insère des logs"             on admin_logs for insert with check (is_admin());

-- Custom levels
create policy "Niveaux actifs lisibles par tous"  on custom_levels for select using (is_active = true or is_admin());
create policy "Admin gère les niveaux"            on custom_levels for all using (is_admin());

-- ─── Trigger : créer profil à l'inscription ─────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'joueur_' || substring(new.id::text, 1, 6)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Badges initiaux ────────────────────────────────

insert into badges (id, name, description, icon, condition_type, condition_value, condition_diff, sort_order) values
  ('first-game',    'Première Partie',     'Terminez votre première partie',                    '🌱', 'games_played', 1,   null,   1),
  ('games-10',      'Habitué',             'Terminez 10 parties',                               '🔥', 'games_played', 10,  null,   2),
  ('games-50',      'Vétéran',             'Terminez 50 parties',                               '⭐', 'games_played', 50,  null,   3),
  ('games-100',     'Centurion',           'Terminez 100 parties',                              '💎', 'games_played', 100, null,   4),
  ('hard-first',    'Intrépide',           'Terminez une partie difficile',                     '💀', 'games_played', 1,   'hard', 5),
  ('hard-10',       'Maître du Puzzle',    'Terminez 10 parties difficiles',                    '🏆', 'games_played', 10,  'hard', 6),
  ('speed-easy',    'Éclair',              'Terminez une partie facile en moins de 60 secondes','⚡', 'best_time',    60,  'easy', 7),
  ('speed-medium',  'Foudre',              'Terminez une partie moyenne en moins de 90 secondes','🌩', 'best_time',   90,  'medium',8),
  ('speed-hard',    'Supersonique',        'Terminez une partie difficile en moins de 3 minutes','🚀', 'best_time',  180,  'hard', 9);
