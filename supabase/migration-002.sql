-- ============================================================
-- Update 2: product size controls + order-alert email
-- Run once in Supabase > SQL Editor (safe to run twice).
-- ============================================================
alter table public.stores add column if not exists card_size    int  not null default 260 check (card_size between 140 and 460);
alter table public.stores add column if not exists image_ratio  text not null default 'portrait' check (image_ratio in ('portrait','square','landscape'));
alter table public.stores add column if not exists notify_email text default '';
