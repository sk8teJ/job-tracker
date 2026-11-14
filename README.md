# FRAME — личный кинодневник

FRAME — приватная кинотека: сохраняй просмотренные фильмы, собирай список планов, ставь оценки и записывай впечатления.

## Возможности
- Личная коллекция фильмов с постерами, жанрами и информацией.
- Статусы: просмотрено, смотрю, в планах.
- Оценки от 1 до 10 и личные заметки/рецензии.
- Поиск, фильтры, сортировка и статистика.
- Авторизация Supabase; данные каждого пользователя защищены Row Level Security.

## Локальный запуск
1. Установи зависимости: `npm install`.
2. Создай `.env` на основе `.env.example`:
   `VITE_SUPABASE_URL=...`
   `VITE_SUPABASE_PUBLISHABLE_KEY=...`
3. Выполни SQL из `supabase/migrations/202611140001_frame_films.sql` в Supabase SQL Editor.
4. Запусти `npm run dev`.

## Стек
React, Vite, Supabase Auth, PostgreSQL, Cloudflare Pages.

В браузере используется только публичный Supabase publishable key. Секретный/service_role ключ никогда не помещается во frontend.
