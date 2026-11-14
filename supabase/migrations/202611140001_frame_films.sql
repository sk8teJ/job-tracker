-- FRAME: personal cinema journal
-- Run once in Supabase SQL Editor. This adds a separate films table and leaves existing data untouched.

create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  year integer,
  director text,
  genres text[] not null default '{}',
  overview text,
  poster_url text,
  status text not null default 'watched' check (status in ('watched', 'planned', 'watching')),
  rating numeric(3,1) check (rating is null or (rating >= 1 and rating <= 10)),
  review text,
  watched_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists films_user_created_idx on public.films(user_id, created_at desc);
create index if not exists films_user_status_idx on public.films(user_id, status);

alter table public.films enable row level security;

drop policy if exists "Users can view own films" on public.films;
create policy "Users can view own films" on public.films for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can add own films" on public.films;
create policy "Users can add own films" on public.films for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own films" on public.films;
create policy "Users can update own films" on public.films for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own films" on public.films;
create policy "Users can delete own films" on public.films for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_films_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists films_updated_at on public.films;
create trigger films_updated_at before update on public.films
for each row execute function public.set_films_updated_at();
