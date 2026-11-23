-- Add an optional Yandex Board link to each student.
alter table public.students
add column if not exists yandex_board_link text;

notify pgrst, 'reload schema';
