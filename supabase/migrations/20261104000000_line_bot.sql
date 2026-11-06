-- LINE 災情回報機器人
-- line_sessions：每位使用者目前的對話進度（24 小時沒動作就重來）
-- line_reports：從 LINE 收到的回報，審核通過前不會出現在地圖上
-- line_media：LINE 傳來的照片與語音，私有 bucket，只有 Edge Function（service role）能讀寫
--
-- 兩張表都開 RLS 且不建任何 policy：前端用的 anon key 讀不到也寫不進去，
-- 只有 Edge Function 的 service role 可以存取。

create table if not exists public.line_sessions (
  user_hash text primary key,              -- LINE userId 加鹽雜湊，不存原始 ID
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.line_sessions enable row level security;

create table if not exists public.line_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_hash text not null,

  lat double precision,
  lng double precision,
  address_text text,                       -- 長輩打字或說出的地址
  location_source text not null            -- line_location / address_db / village / unresolved
    check (location_source in ('line_location', 'address_db', 'village', 'unresolved')),

  photos text[] not null default '{}',     -- line_media bucket 內的路徑
  damage_type text,                        -- 房子 / 土地 / 道路 / 其他
  height_level text,                       -- 到腳踝 … 超過人 / 沒有淹水 / 不清楚
  note_text text,

  voice_path text,                         -- line_media bucket 內的語音路徑
  voice_transcript text,
  voice_extracted jsonb,                   -- 從逐字稿整理出的欄位
  voice_confirmed boolean,                 -- 長輩是否按了「對」

  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewer_note text
);

create index if not exists line_reports_review_status_idx
  on public.line_reports (review_status, created_at desc);

alter table public.line_reports enable row level security;

insert into storage.buckets (id, name, public)
values ('line_media', 'line_media', false)
on conflict (id) do nothing;
