-- Mora: extend film metadata and allow half-point ratings from 0 to 10.
alter table public.films add column if not exists cast text[] not null default '{}';
alter table public.films add column if not exists source_url text;

alter table public.films drop constraint if exists films_rating_check;
alter table public.films add constraint films_rating_check
  check (rating is null or (rating >= 0 and rating <= 10));

alter table public.films drop constraint if exists films_review_length_check;
alter table public.films add constraint films_review_length_check
  check (review is null or char_length(review) <= 1000);
