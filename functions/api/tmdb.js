const TMDB_HOSTS = new Set(['themoviedb.org', 'www.themoviedb.org']);
const IMDB_HOSTS = new Set(['imdb.com', 'www.imdb.com']);

function parseSourceUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error('Некорректная ссылка.');
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Используй HTTPS-ссылку TMDB или IMDb без логина, пароля и нестандартного порта.');
  }

  const host = url.hostname.toLowerCase();
  if (TMDB_HOSTS.has(host)) {
    // TMDB URLs may include a human-readable slug after the numeric ID.
    const match = url.pathname.match(/^\/(movie|tv)\/(\d+)(?:-[^/]+)?\/?$/);
    if (match) return { type: match[1], id: match[2] };
    throw new Error('Нужна ссылка на страницу фильма или сериала TMDB.');
  }

  if (IMDB_HOSTS.has(host)) {
    const match = url.pathname.match(/^\/title\/(tt\d+)\/?$/i);
    if (match) return { type: 'imdb', id: match[1].toLowerCase() };
    throw new Error('Нужна ссылка на страницу фильма или сериала IMDb.');
  }

  throw new Error('Поддерживаются только ссылки TMDB и IMDb.');
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return Response.json({ error: 'Метод не поддерживается.' }, { status: 405 });
  }
  const token = context.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    return Response.json(
      { error: 'Импорт фильмов пока не настроен. Добавь TMDB_READ_ACCESS_TOKEN в Cloudflare Pages → Settings → Variables and Secrets и пересобери сайт.' },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Некорректный запрос.' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseSourceUrl(body?.url);
  } catch (error) {
    return Response.json({ error: error.message || 'Некорректная ссылка.' }, { status: 400 });
  }

  const headers = { Authorization: 'Bearer ' + token, accept: 'application/json' };
  try {
    let { type, id } = parsed;

    if (type === 'imdb') {
      const findResponse = await fetch(
        'https://api.themoviedb.org/3/find/' + encodeURIComponent(id) + '?external_source=imdb_id&language=ru-RU',
        { headers }
      );
      if (!findResponse.ok) {
        return Response.json({ error: 'TMDB не смог найти фильм по этой IMDb-ссылке.' }, { status: 502 });
      }
      const found = await findResponse.json();
      const item = found.movie_results?.[0] || found.tv_results?.[0];
      if (!item) return Response.json({ error: 'Фильм по этой IMDb-ссылке не найден в TMDB.' }, { status: 404 });
      type = found.movie_results?.length ? 'movie' : 'tv';
      id = item.id;
    }

    const response = await fetch(
      'https://api.themoviedb.org/3/' + type + '/' + encodeURIComponent(id) + '?append_to_response=credits&language=ru-RU',
      { headers }
    );
    if (!response.ok) {
      return Response.json({ error: 'Не удалось получить данные из TMDB. Проверь доступность фильма.' }, { status: 502 });
    }

    return Response.json(await response.json(), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch {
    return Response.json({ error: 'Не удалось связаться с TMDB. Попробуй ещё раз.' }, { status: 502 });
  }
}
