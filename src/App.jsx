import { useEffect, useState } from 'react';
import supabase from './lib/supabase.js';
import { Plus, X, Star, Trash2, Pencil, LoaderCircle, ArrowUpRight, Film, Check, ChevronLeft, ExternalLink } from 'lucide-react';

const EMPTY_FORM = { title: '', year: '', director: '', genres: [], overview: '', poster_url: '', cast: [], rating: '', review: '', source_url: '', status: 'watched', watched_at: '' };

function normalizeFilm(row) {
  return { ...row, year: row.year || '', genres: Array.isArray(row.genres) ? row.genres : [], cast: Array.isArray(row.cast) ? row.cast : [], rating: row.rating ?? '', review: row.review || '' };
}

function tmdbImage(path, size = 'w780') {
  return path ? 'https://image.tmdb.org/t/p/' + size + path : '';
}

function parseMovieUrl(value) {
  const url = new URL(value);
  const tmdb = url.pathname.match(/\/(movie|tv)\/(\d+)/);
  const imdb = url.pathname.match(/\/title\/(tt\d+)/);
  if (tmdb) return { type: tmdb[1], id: tmdb[2] };
  if (imdb) return { type: 'imdb', id: imdb[1] };
  throw new Error('Пока поддерживаются ссылки на TMDB и IMDb.');
}

export default function App() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sourceUrl, setSourceUrl] = useState('');
  const [metadataReady, setMetadataReady] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('mora_tmdb_token') || '');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase.from('films').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!alive) return;
      if (error) setNotice('Не удалось загрузить коллекцию. Проверь, что новая миграция применена в Supabase.');
      else setFilms((data || []).map(normalizeFilm));
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  const visibleFilms = films;

  function startAdd() {
    setEditing(null); setSelected(null); setForm(EMPTY_FORM); setSourceUrl(''); setMetadataReady(false); setNotice(''); setModal(true);
  }

  function startEdit(film) {
    setEditing(film);
    setForm({ ...EMPTY_FORM, ...film, year: String(film.year || ''), rating: film.rating === '' ? '' : String(film.rating), review: film.review || '' });
    setSourceUrl(film.source_url || ''); setMetadataReady(true);
    setSelected(null); setModal(true);
  }

  async function importMovie() {
    setImporting(true); setNotice('');
    try {
      if (!token.trim()) throw new Error('Добавь TMDB Read Access Token — он сохранится только в этом браузере.');
      localStorage.setItem('mora_tmdb_token', token.trim());
      const parsed = parseMovieUrl(sourceUrl.trim());
      let type = parsed.type;
      let id = parsed.id;
      const headers = { Authorization: 'Bearer ' + token.trim(), accept: 'application/json' };
      if (type === 'imdb') {
        const findResponse = await fetch('https://api.themoviedb.org/3/find/' + id + '?external_source=imdb_id&language=ru-RU', { headers });
        if (!findResponse.ok) throw new Error('TMDB не смог найти фильм по этой ссылке.');
        const found = await findResponse.json();
        const item = found.movie_results?.[0] || found.tv_results?.[0];
        if (!item) throw new Error('Фильм по этой IMDb-ссылке не найден в TMDB.');
        type = found.movie_results?.length ? 'movie' : 'tv';
        id = item.id;
      }
      const response = await fetch('https://api.themoviedb.org/3/' + type + '/' + id + '?append_to_response=credits&language=ru-RU', { headers });
      if (!response.ok) throw new Error('Не удалось получить данные. Проверь ссылку и TMDB-токен.');
      const data = await response.json();
      const crew = data.credits?.crew || [];
      const director = crew.find(person => person.job === 'Director')?.name || crew.find(person => person.department === 'Directing')?.name || '';
      const cast = (data.credits?.cast || []).slice(0, 10).map(person => person.name);
      setForm(prev => ({
        ...prev,
        title: data.title || data.name || '',
        year: (data.release_date || data.first_air_date || '').slice(0, 4),
        director,
        genres: (data.genres || []).map(g => g.name),
        overview: data.overview || '',
        poster_url: tmdbImage(data.poster_path),
        cast,
        source_url: sourceUrl.trim(),
        status: 'watched'
      }));
      setMetadataReady(true);
    } catch (error) { setNotice(error.message || 'Не удалось импортировать фильм.'); }
    finally { setImporting(false); }
  }

  async function saveFilm(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (form.review.length > 1000) { setNotice('Комментарий должен быть не длиннее 1000 символов.'); return; }
    setSaving(true); setNotice('');
    const payload = {
      title: form.title.trim(), year: form.year ? Number(form.year) : null, director: form.director.trim(),
      genres: form.genres, overview: form.overview.trim(), poster_url: form.poster_url.trim(),
      cast: form.cast, source_url: form.source_url || sourceUrl.trim() || null,
      status: 'watched', rating: form.rating === '' ? null : Number(form.rating),
      review: form.review.trim(), watched_at: form.watched_at || null
    };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Сессия завершилась. Войди снова.');
      if (editing) {
        const { data, error } = await supabase.from('films').update(payload).eq('id', editing.id).eq('user_id', user.id).select().single();
        if (error) throw error;
        setFilms(prev => prev.map(f => f.id === editing.id ? normalizeFilm(data) : f));
      } else {
        const { data, error } = await supabase.from('films').insert({ ...payload, user_id: user.id }).select().single();
        if (error) throw error;
        setFilms(prev => [normalizeFilm(data), ...prev]);
      }
      setModal(false); setNotice('');
    } catch (error) { setNotice(error.message || 'Не удалось сохранить фильм.'); }
    finally { setSaving(false); }
  }

  async function deleteFilm(film) {
    if (!window.confirm('Удалить «' + film.title + '» из коллекции?')) return;
    const { error } = await supabase.from('films').delete().eq('id', film.id);
    if (error) { setNotice(error.message); return; }
    setFilms(prev => prev.filter(f => f.id !== film.id)); setSelected(null);
  }

  return <div className="mora-app">
    <header className="mora-header">
      <a className="mora-wordmark" href="#" aria-label="Mora">mora</a>
      <div className="mora-header-actions">
        <button className="round-add" onClick={startAdd} aria-label="Добавить фильм"><Plus size={19}/></button>
      </div>
    </header>
    <main className="mora-collection">
      {notice && <div className="mora-notice">{notice}<button onClick={() => setNotice('')}><X size={14}/></button></div>}
      {loading ? <div className="collection-loading"><LoaderCircle className="spin" size={22}/></div> : visibleFilms.length === 0 ? (
        <section className="collection-empty">
          <button className="empty-plus" onClick={startAdd} aria-label="Добавить первый фильм"><Plus size={31} strokeWidth={1}/></button>
          <span className="empty-caption">'ТВОЯ КОЛЛЕКЦИЯ'</span>
        </section>
      ) : (
        <section className="collection-content">
          <div className="collection-topline"><span>{films.length} {films.length === 1 ? 'ФИЛЬМ' : 'ФИЛЬМОВ'}</span><span>ЛИЧНАЯ КОЛЛЕКЦИЯ</span></div>
          <div className="mora-film-grid">
            {visibleFilms.map(film => <button className="mora-film" key={film.id} onClick={() => setSelected(film)}>
              <span className="mora-poster">{film.poster_url ? <img src={film.poster_url} alt={film.title}/> : <span className="poster-fallback"><Film size={25}/></span>}{film.rating !== '' && film.rating !== null && <span className="poster-rating">{Number(film.rating).toFixed(1).replace('.0','')}</span>}</span>
              <span className="mora-film-title">{film.title}</span>
              <span className="mora-film-year">{film.year || ''}</span>
            </button>)}
            <button className="mora-film-add" onClick={startAdd}><span><Plus size={24} strokeWidth={1}/></span><small>ДОБАВИТЬ</small></button>
          </div>
        </section>
      )}
    </main>
    <footer className="mora-footer"><span>mora</span><span>ДАННЫЕ О ФИЛЬМАХ: TMDB</span><span>© {new Date().getFullYear()}</span></footer>

    {modal && <div className="mora-overlay" onMouseDown={e => {if(e.target===e.currentTarget)setModal(false)}}>
      <form className="mora-modal" onSubmit={saveFilm}>
        <div className="mora-modal-head"><span>{editing ? 'ИЗМЕНИТЬ ЗАПИСЬ' : 'НОВАЯ ЗАПИСЬ'}</span><button type="button" className="quiet-icon" onClick={() => setModal(false)} aria-label="Закрыть"><X size={19}/></button></div>
        <div className="import-area">
          <label htmlFor="movie-url">ССЫЛКА НА ФИЛЬМ</label>
          <div className="import-line"><input id="movie-url" type="url" placeholder="TMDB или IMDb URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}/><button type="button" onClick={importMovie} disabled={importing || !sourceUrl.trim()}>{importing ? <LoaderCircle className="spin" size={17}/> : <ArrowUpRight size={17}/>}</button></div>
          <details className="tmdb-token"><summary>Настроить импорт данных</summary><p>Для поиска названия, сюжета, постера, режиссёра и актёров нужен бесплатный TMDB Read Access Token. Получи его в настройках API TMDB и вставь сюда. Токен хранится только в этом браузере.</p><input type="password" autoComplete="off" placeholder="TMDB Read Access Token" value={token} onChange={e => setToken(e.target.value)}/><a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Открыть настройки TMDB <ExternalLink size={12}/></a></details>
        </div>
        {notice && <p className="form-notice">{notice}</p>}
        {metadataReady && <div className="movie-fields">
          <label className="wide">НАЗВАНИЕ<input required value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Название фильма"/></label>
          <label>ГОД<input type="number" min="1888" max="2100" value={form.year} onChange={e => setForm({...form,year:e.target.value})}/></label>
          <label>РЕЖИССЁР<input value={form.director} onChange={e => setForm({...form,director:e.target.value})}/></label>
          <label className="wide">ЖАНРЫ<input value={form.genres.join(', ')} onChange={e => setForm({...form,genres:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
          <label className="wide">СЮЖЕТ<textarea rows="3" value={form.overview} onChange={e => setForm({...form,overview:e.target.value})}/></label>
          <label className="wide">В ГЛАВНЫХ РОЛЯХ<input value={form.cast.join(', ')} onChange={e => setForm({...form,cast:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} placeholder="Имена актёров через запятую"/></label>
          <label className="wide">ПОСТЕР (URL)<input type="url" value={form.poster_url} onChange={e => setForm({...form,poster_url:e.target.value})} placeholder="Заполнится автоматически"/></label>
          <label className="wide">МОЯ ОЦЕНКА <div className="rating-control"><input type="number" min="0" max="10" step="0.5" value={form.rating} onChange={e => setForm({...form,rating:e.target.value})} placeholder="—"/><span>/ 10</span><small>Шаг 0,5</small></div></label>
          <label className="wide">КОММЕНТАРИЙ <textarea rows="4" maxLength="1000" value={form.review} onChange={e => setForm({...form,review:e.target.value})} placeholder="Что осталось после просмотра? До 1000 символов."/><small className="char-count">{form.review.length} / 1000</small></label>
        </div>}
        <div className="mora-modal-actions"><button type="button" className="text-button" onClick={() => setModal(false)}>ОТМЕНА</button>{metadataReady && <button className="save-button" disabled={saving || !form.title.trim()}>{saving ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>} СОХРАНИТЬ</button>}</div>
      </form>
    </div>}

    {selected && <div className="mora-overlay" onMouseDown={e => {if(e.target===e.currentTarget)setSelected(null)}}>
      <article className="movie-detail">
        <button className="detail-x quiet-icon" onClick={() => setSelected(null)} aria-label="Закрыть"><X size={19}/></button>
        <div className="movie-detail-art">{selected.poster_url && <img src={selected.poster_url} alt=""/>}<div className="movie-detail-title"><span>{selected.year} {selected.director && '· ' + selected.director}</span><h2>{selected.title}</h2></div></div>
        <div className="movie-detail-body">
          {selected.rating !== '' && selected.rating !== null && <div className="detail-score"><Star size={15} fill="currentColor"/>{Number(selected.rating).toFixed(1).replace('.0','')}<small>/ 10</small></div>}
          {selected.overview && <p className="detail-plot">{selected.overview}</p>}
          {selected.cast?.length > 0 && <div className="detail-cast"><span>В ГЛАВНЫХ РОЛЯХ</span><p>{selected.cast.join(' · ')}</p></div>}
          {selected.review && <div className="detail-comment"><span>МОЙ КОММЕНТАРИЙ</span><p>{selected.review}</p></div>}
          <div className="detail-actions"><button className="text-button" onClick={() => startEdit(selected)}><Pencil size={14}/> ИЗМЕНИТЬ</button>{selected.source_url && <a href={selected.source_url} target="_blank" rel="noreferrer">ИСТОЧНИК <ExternalLink size={12}/></a>}<button className="delete-entry" onClick={() => deleteFilm(selected)}><Trash2 size={14}/> УДАЛИТЬ</button></div>
        </div>
      </article>
    </div>}
  </div>;
}
