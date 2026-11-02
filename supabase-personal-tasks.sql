-- Run once in Supabase SQL Editor. Existing lessons, garden and payments are unchanged.
begin;

create table if not exists public.personal_tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  task_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  notes text not null default '' check (char_length(notes) <= 4000),
  completed boolean not null default false,
  series_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists personal_tasks_user_date_idx on public.personal_tasks(user_id, task_date);
alter table public.personal_tasks enable row level security;
drop policy if exists "Own personal tasks" on public.personal_tasks;
create policy "Own personal tasks" on public.personal_tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.personal_tasks from anon;
grant select, insert, update, delete on public.personal_tasks to authenticated;
notify pgrst, 'reload schema';
commit;
