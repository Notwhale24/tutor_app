-- Tutor Manager v2.0.9
-- Add a per-student Yandex Telemost link.
alter table public.students
add column if not exists telemost_link text;
