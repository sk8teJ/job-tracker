-- CareerDesk cloud vacancy fields
-- Run once in Supabase SQL Editor after the initial schema.

alter table public.vacancies
  add column if not exists salary_text text,
  add column if not exists place text,
  add column if not exists application_date date;

create index if not exists idx_vacancies_user_created
  on public.vacancies(user_id, created_at desc);

-- Keep normalized vacancy URLs unique per user.
create unique index if not exists idx_vacancies_unique_url
  on public.vacancies(user_id, normalized_url)
  where normalized_url is not null and normalized_url <> '';
