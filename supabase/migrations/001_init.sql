-- ════════════════════════════════════════════════════════════════
-- 植物棚 初期スキーマ
-- 要件書 §4 + §9.1 に基づく
-- ════════════════════════════════════════════════════════════════

-- ── 拡張 ─────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ════════════════════════════════════════════════════════════════

create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null,
  latitude              numeric,
  longitude             numeric,
  location_name         text,
  notify_enabled        boolean default true,
  notify_hour           int default 7 check (notify_hour between 0 and 23),
  notify_dormancy_wake  boolean default true,
  is_admin              boolean default false,
  streak_count          int default 0,
  created_at            timestamptz default now()
);

create table species_master (
  id                      uuid primary key default gen_random_uuid(),
  name_ja                 text not null unique,
  name_scientific         text,
  aliases                 jsonb default '[]',
  category                text not null check (category in
                            ('agave','caudex_shrub','euphorbia','houseplant','succulent_other')),
  growth_type             text not null check (growth_type in ('summer','winter','evergreen')),
  watering_intervals      jsonb not null,
  dormancy_note           text,
  fertilizer_interval_days int,
  fertilizer_months       jsonb,
  min_temp_celsius        numeric,
  care_notes              text,
  source                  text not null default 'ai_generated'
                            check (source in ('curated','ai_generated')),
  confidence              text default 'high'
                            check (confidence in ('high','medium','low')),
  reference_note          text,
  created_at              timestamptz default now()
);

create table plants (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  species_id    uuid not null references species_master(id),
  nickname      text not null,
  size          text not null check (size in ('seedling','small','medium','large')),
  photo_url     text,
  registered_at date default current_date,
  placement     text not null check (placement in ('indoor','balcony','outdoor')),
  memo          text,
  archived      boolean default false,
  created_at    timestamptz default now()
);

create table care_logs (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid not null references plants(id) on delete cascade,
  action      text not null check (action in ('watering','fertilizer','light')),
  logged_at   timestamptz not null default now(),
  photo_url   text,
  memo        text,
  created_at  timestamptz default now()
);

create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,
  created_at  timestamptz default now()
);

-- §9.1 追加スキーマ: 通知送信ログ（二重送信防止）
create table notification_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('daily','dormancy_wake')),
  sent_on     date not null,
  created_at  timestamptz default now(),
  unique (user_id, kind, sent_on)
);

-- ── インデックス ──────────────────────────────────────────────────
create index on plants (owner_id) where not archived;
create index on care_logs (plant_id, action, logged_at desc);
create index on notification_logs (user_id, kind, sent_on);
create index on species_master using gin (aliases);

-- ════════════════════════════════════════════════════════════════
-- 2. auth.users 作成時に profiles を自動生成するトリガー
-- ════════════════════════════════════════════════════════════════
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- 3. RLS（Row Level Security）
-- ════════════════════════════════════════════════════════════════

-- profiles
alter table profiles enable row level security;
create policy "profiles: own" on profiles
  for all using (auth.uid() = id);

-- species_master: 全認証ユーザーが読める、insert は anon 不可（Edge Function / admin）
alter table species_master enable row level security;
create policy "species: read" on species_master
  for select using (auth.role() = 'authenticated');
create policy "species: insert by authenticated" on species_master
  for insert with check (auth.role() = 'authenticated');
create policy "species: update by admin" on species_master
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
create policy "species: delete by admin" on species_master
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- plants
alter table plants enable row level security;
create policy "plants: own" on plants
  for all using (auth.uid() = owner_id);

-- care_logs: plant の owner のみ
alter table care_logs enable row level security;
create policy "care_logs: own" on care_logs
  for all using (
    exists (select 1 from plants where plants.id = care_logs.plant_id and plants.owner_id = auth.uid())
  );

-- push_subscriptions
alter table push_subscriptions enable row level security;
create policy "push_subscriptions: own" on push_subscriptions
  for all using (auth.uid() = user_id);

-- notification_logs: 本人のみ閲覧、書き込みは service_role のみ
alter table notification_logs enable row level security;
create policy "notification_logs: read own" on notification_logs
  for select using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
-- 4. Storage バケット（plant-photos）
-- ════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict do nothing;

-- 本人のみアップロード可
create policy "plant-photos: own upload" on storage.objects
  for insert with check (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 本人のみ更新・削除可
create policy "plant-photos: own update" on storage.objects
  for update using (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "plant-photos: own delete" on storage.objects
  for delete using (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 全員が閲覧可能（public bucket）
create policy "plant-photos: public read" on storage.objects
  for select using (bucket_id = 'plant-photos');
