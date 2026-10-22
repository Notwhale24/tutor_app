-- Run once in Supabase SQL Editor to sync the garden across devices.
-- Keeps the existing settings table's permissions and all current data.
alter table public.settings add column if not exists garden_state jsonb;
