# CareerDesk

Личная CRM для управления поиском работы. React + Vite, адаптивный интерфейс и серверная функция импорта вакансий.

## Уже реализовано

- Обзор, база вакансий, поиск и фильтр по статусам.
- Kanban-воронка и изменение статусов.
- Импорт вакансии по ссылке через серверную функцию `/api/import-vacancy`.
- Извлечение доступных полей из HTML и Schema.org JobPosting: название, компания, зарплата, локация, описание, требования и навыки.
- Проверка дубликатов по URL и ручная проверка полей перед сохранением.
- Локальное хранение в браузере через localStorage и экспорт CSV.
- Адаптивный интерфейс.

## Поддерживаемые источники импорта

На первом этапе: hh.ru, rabota.ru, superjob.ru, career.habr.com, geekjob.ru, getmatch.ru, career.sber.ru, career.yandex.ru, career.tbank.ru, career.ozon.ru и career.mts.ru (включая поддомены).

Сайт может ограничивать автоматический доступ, требовать авторизацию или загружать содержимое динамически. В таком случае импорт покажет понятную ошибку, а вакансию можно заполнить вручную.

## Локальный запуск

Требуется Node.js 20.19+ или 22.12+.

```bash
npm install
npm run dev
```

Vite dev server включает локальный обработчик API для импорта.

## Production build

```bash
npm run build
npm run preview
```

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: Vite
- Каталог `functions/` содержит Pages Functions и автоматически публикуется вместе с проектом при подключении репозитория к Cloudflare Pages.

## Важно: текущие ограничения

- Извлечение информации — это парсинг страницы и структурированных данных, а не AI-анализ. Оценка соответствия профилю и AI-сопроводительные письма запланированы отдельным этапом.
- Supabase Auth и облачное хранение вакансий подключены. Для новых проектов выполните SQL-миграцию из `supabase/migrations/` перед запуском актуального приложения.
- При первом входе приложение переносит пользовательские локальные вакансии в облако; шесть встроенных демонстрационных записей не переносятся. Локальная копия сохраняется в браузере.
- Поля, которые сайт не отдаёт, не придумываются: они остаются пустыми и требуют проверки.
- Не добавляйте секреты, API-ключи или реальные персональные документы в публичный репозиторий.


## Supabase Auth setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL` — project URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable key from Supabase API Keys.
3. Restart Vite after changing environment variables.
4. Create an account in CareerDesk or sign in with an existing Supabase Auth user.

Only the publishable key belongs in the browser. Never expose the Supabase `service_role` key or database password.

Authentication and vacancy cloud storage are connected. Before using the latest code, run the SQL migration in `supabase/migrations/202611120001_cloud_vacancy_fields.sql` in the Supabase SQL Editor. On first load, saved local vacancies are migrated if the cloud table is empty; the six built-in demo fixtures are excluded. The app keeps a local browser copy as an additional fallback.


<!-- temporary GitHub write-access check -->
