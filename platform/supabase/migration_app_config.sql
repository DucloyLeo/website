-- Table de configuration globale de l'application
create table if not exists app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);

-- Valeurs initiales de la courbe XP (correspondant à auth.js actuel)
insert into app_config (key, value)
values ('xp_curve', '{"base": 300, "mult": 1.13, "cap": 3000}')
on conflict (key) do nothing;

-- RLS : lecture publique, écriture admin uniquement
alter table app_config enable row level security;

create policy "Public read app_config"
  on app_config for select using (true);

create policy "Admin write app_config"
  on app_config for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
