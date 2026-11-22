-- Align the database constraint with the 0–10 rating input in the Mora UI.
-- The original migration allowed only 1–10, so a valid UI rating of 0 failed on save.

alter table public.films
  drop constraint if exists films_rating_check;

alter table public.films
  add constraint films_rating_range_check
  check (rating is null or (rating >= 0 and rating <= 10));
