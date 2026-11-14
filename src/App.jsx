import { useEffect, useMemo, useState } from 'react';
import supabase from './lib/supabase.js';
import {
  Search, Plus, Film, Clapperboard, Star, Clock3, Check, Bookmark,
  LayoutGrid, List, SlidersHorizontal, X, Trash2, Pencil, CalendarDays,
  Sparkles, ChevronDown, Play, Popcorn, ArrowUpRight, Heart, Eye,
  MessageSquareText, LoaderCircle, AlertCircle, CheckCircle2
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'Все фильмы', icon: LayoutGrid },
  { id: 'watched', label: 'Просмотрено', icon: Check },
  { id: 'planned', label: 'В планах', icon: Bookmark },
  { id: 'watching', label: 'Смотрю', icon: Play },
];
const EMPTY_FORM = { title: '', year: '', director: '', genres: '', overview: '', poster_url: '', status: 'watched', rating: '', review: '', watched_at: '' };
const demoFilms = [
  { id: 'demo-1', title: 'Интерстеллар', year: 2014, director: 'Кристофер Нолан', genres: ['Фантастика', 'Драма'], overview: 'Команда исследователей отправляется за пределы этой галактики, чтобы выяснить, есть ли у человечества будущее среди звёзд.', poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', status: 'watched', rating: 10, review: 'Фильм, после которого ещё долго сидишь в тишине. Музыка, масштаб и эмоции — невероятно.', watched_at: '2026-10-20' },
  { id: 'demo-2', title: 'Бегущий по лезвию 2049', year: 2017, director: 'Дени Вильнёв', genres: ['Фантастика', 'Триллер'], overview: 'Новый офицер полиции раскрывает тайну, способную погрузить остатки общества в хаос.', poster_url: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', status: 'watched', rating: 9, review: 'Визуальный восторг. Каждый кадр можно ставить на обои.', watched_at: '2026-10-12' },
  { id: 'demo-3', title: 'Остров проклятых', year: 2010, director: 'Мартин Скорсезе', genres: ['Детектив', 'Триллер'], overview: 'Два федеральных маршала расследуют исчезновение пациентки психиатрической клиники на острове.', poster_url: 'https://image.tmdb.org/t/p/w500/4GDy0PHYX3VRXUetcJ6e9jK9a7a.jpg', status: 'watched', rating: 9, review: 'Тот самый фильм, который хочется пересмотреть сразу после финала.', watched_at: '2026-09-28' },
  { id: 'demo-4', title: 'Дюна: Часть вторая', year: 2024, director: 'Дени Вильнёв', genres: ['Фантастика', 'Приключения'], overview: 'Пол Атрейдес объединяется с фременами и вступает на путь мести.', poster_url: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', status: 'planned', rating: null, review: '', watched_at: '' },
  { id: 'demo-5', title: 'Одержимость', year: 2014, director: 'Дэмьен Шазелл', genres: ['Драма', 'Музыка'], overview: 'Молодой барабанщик поступает в консерваторию, где его талант испытывает на прочность безжалостный преподаватель.', poster_url: 'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeS9WDC.jpg', status: 'watched', rating: 10, review: 'Напряжение на протяжении всего фильма. Финал — чистый адреналин.', watched_at: '2026-09-15' },
  { id: 'demo-6', title: 'Начало', year: 2010, director: 'Кристофер Нолан', genres: ['Фантастика', 'Боевик'], overview: 'Команда специалистов проникает в сны людей, чтобы украсть или внедрить идею.', poster_url: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', status: 'planned', rating: null, review: '', watched_at: '' },
];

function normalizeFilm(row) {
  return { ...row, year: row.year || '', genres: Array.isArray(row.genres) ? row.genres : [], rating: row.rating ?? '', review: row.review || '' };
}

export default function App() {
  const [films, setFilms] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('grid');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setFilms(demoFilms); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFilms([]); setLoading(false); return; }
      const { data, error } = await supabase.from('films').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!alive) return;
      if (error) {
        setNotice('Не удалось загрузить коллекцию. Проверь миграцию FRAME в Supabase.');
        setFilms([]);
      } else setFilms((data || []).map(normalizeFilm));
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  const watched = films.filter(f => f.status === 'watched');
  const rated = watched.filter(f => Number(f.rating) > 0);
  const average = rated.length ? (rated.reduce((sum, f) => sum + Number(f.rating), 0) / rated.length).toFixed(1) : '—';
  const filtered = useMemo(() => {
    let list = films.filter(f => filter === 'all' || f.status === filter);
    if (query.trim()) list = list.filter(f => [f.title, f.director, ...(f.genres || [])].join(' ').toLowerCase().includes(query.toLowerCase()));
    return [...list].sort((a, b) => sort === 'rating' ? Number(b.rating || 0) - Number(a.rating || 0) : sort === 'title' ? a.title.localeCompare(b.title, 'ru') : new Date(b.watched_at || b.created_at || 0) - new Date(a.watched_at || a.created_at || 0));
  }, [films, filter, query, sort]);

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModal(true); }
  function openEdit(film) {
    setEditing(film);
    setForm({ ...EMPTY_FORM, ...film, year: String(film.year || ''), genres: (film.genres || []).join(', '), rating: String(film.rating || '') });
    setSelected(null); setModal(true);
  }
  async function saveFilm(e) {
    e.preventDefault(); setBusy(true); setNotice('');
    const payload = { title: form.title.trim(), year: form.year ? Number(form.year) : null, director: form.director.trim(), genres: form.genres.split(',').map(s => s.trim()).filter(Boolean), overview: form.overview.trim(), poster_url: form.poster_url.trim(), status: form.status, rating: form.rating ? Number(form.rating) : null, review: form.review.trim(), watched_at: form.status === 'watched' ? (form.watched_at || new Date().toISOString().slice(0, 10)) : null };
    try {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Сессия не найдена. Войди в аккаунт ещё раз.');
        if (editing) {
          const { data, error } = await supabase.from('films').update(payload).eq('id', editing.id).eq('user_id', user.id).select().single();
          if (error) throw error;
          setFilms(prev => prev.map(f => f.id === editing.id ? normalizeFilm(data) : f));
        } else {
          const { data, error } = await supabase.from('films').insert({ ...payload, user_id: user.id }).select().single();
          if (error) throw error;
          setFilms(prev => [normalizeFilm(data), ...prev]);
        }
      } else if (editing) setFilms(prev => prev.map(f => f.id === editing.id ? { ...f, ...payload } : f));
      else setFilms(prev => [{ ...payload, id: crypto.randomUUID() }, ...prev]);
      setModal(false); setNotice(editing ? 'Изменения сохранены' : 'Фильм добавлен в коллекцию');
    } catch (error) { setNotice(error.message || 'Не удалось сохранить фильм'); }
    finally { setBusy(false); }
  }
  async function deleteFilm(film) {
    if (!window.confirm(`Удалить «${film.title}» из коллекции?`)) return;
    if (supabase && !String(film.id).startsWith('demo-')) {
      const { error } = await supabase.from('films').delete().eq('id', film.id);
      if (error) { setNotice(error.message); return; }
    }
    setFilms(prev => prev.filter(f => f.id !== film.id)); setSelected(null); setNotice('Фильм удалён');
  }

  return <div className="frame-app">
    <header className="site-header">
      <a className="frame-brand" href="#" aria-label="FRAME home">FRAME<span>.</span></a>
      <nav className="collection-nav" aria-label="Фильтры коллекции">
        {FILTERS.map(item => <button key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}<span>{item.id === 'all' ? films.length : films.filter(f => f.status === item.id).length}</span></button>)}
      </nav>
      <div className="header-actions">
        <label className="search-box"><Search size={16}/><input aria-label="Поиск фильмов" placeholder="Поиск" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <button className="add-button" onClick={openAdd}><Plus size={16}/><span>Добавить фильм</span></button>
      </div>
    </header>
    <main className="frame-main">
      <section className="intro-section">
        <div className="intro-overline">ЛИЧНЫЙ КИНОДНЕВНИК <span>—</span> {String(films.length).padStart(2, '0')} ЗАПИСЕЙ</div>
        <h1>Фильмы, к которым<br/>хочется <span>возвращаться.</span></h1>
        <p>Личная коллекция историй, впечатлений и моментов, которые остаются с тобой.</p>
      </section>
      <section className="collection-section">
        <div className="collection-heading">
          <div><span className="section-kicker">КОЛЛЕКЦИЯ</span><h2>{filter === 'all' ? 'Все фильмы' : FILTERS.find(x => x.id === filter)?.label}<span className="heading-count">{filtered.length}</span></h2></div>
          <div className="collection-tools">
            <label className="sort-select"><span>Сортировать</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">По дате добавления</option><option value="rating">По оценке</option><option value="title">По названию</option></select></label>
            <div className="view-toggle"><button className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')} aria-label="Сетка"><LayoutGrid size={16}/></button><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="Список"><List size={16}/></button></div>
          </div>
        </div>
        {notice && <div className="notice"><CheckCircle2 size={16}/>{notice}<button onClick={() => setNotice('')}><X size={14}/></button></div>}
        {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22}/> Загружаем коллекцию...</div> : filtered.length ? <div className={`film-grid ${view === 'list' ? 'list-view' : ''}`}>
          {filtered.map(film => <article className="film-card" key={film.id} onClick={() => setSelected(film)}>
            <div className="poster-wrap">{film.poster_url ? <img src={film.poster_url} alt={film.title} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }}/> : <div className="poster-placeholder"><Film size={28}/><span>FRAME</span></div>}<span className={`status-pill ${film.status}`}>{film.status === 'watched' ? 'Просмотрено' : film.status === 'planned' ? 'В планах' : 'Смотрю'}</span>{film.rating ? <span className="rating-badge"><Star size={12} fill="currentColor"/>{film.rating}</span> : null}<button className="quick-edit" onClick={e => {e.stopPropagation();openEdit(film)}} aria-label="Редактировать фильм"><Pencil size={14}/></button></div>
            <div className="film-info"><div className="film-meta">{film.year || 'Год не указан'}{film.director ? <span> · {film.director}</span> : null}</div><h3>{film.title}</h3><div className="genre-row">{(film.genres || []).slice(0, 2).map(g => <span key={g}>{g}</span>)}</div>{film.review && <p className="review-preview">{film.review}</p>}</div>
          </article>)}
        </div> : <div className="empty-state"><div className="empty-icon"><Clapperboard size={26}/></div><h3>{query ? 'Ничего не найдено' : 'Коллекция пока пуста'}</h3><p>{query ? 'Попробуй изменить поисковый запрос.' : 'Добавь первый фильм, который захочешь сохранить.'}</p>{!query && <button className="add-button" onClick={openAdd}><Plus size={16}/> Добавить фильм</button>}</div>}
      </section>
      <footer className="frame-footer"><span>FRAME®</span><span>ЛИЧНЫЙ КИНОДНЕВНИК</span><span>{new Date().getFullYear()}</span></footer>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><form className="film-modal" onSubmit={saveFilm}>
      <div className="modal-head"><div><div className="section-kicker">КОЛЛЕКЦИЯ FRAME</div><h2>{editing ? 'Изменить запись' : 'Новый фильм'}</h2></div><button type="button" className="icon-button" onClick={() => setModal(false)} aria-label="Закрыть"><X size={19}/></button></div>
      <div className="form-grid"><label className="full-field">Название фильма *<input required autoFocus value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Название"/></label><label>Год выпуска<input type="number" min="1888" max="2100" value={form.year} onChange={e => setForm({...form,year:e.target.value})} placeholder="2024"/></label><label>Режиссёр<input value={form.director} onChange={e => setForm({...form,director:e.target.value})} placeholder="Имя режиссёра"/></label><label className="full-field">Жанры через запятую<input value={form.genres} onChange={e => setForm({...form,genres:e.target.value})} placeholder="Драма, фантастика"/></label><label className="full-field">Ссылка на постер<input type="url" value={form.poster_url} onChange={e => setForm({...form,poster_url:e.target.value})} placeholder="https://..."/></label><label className="full-field">Описание<textarea rows="2" value={form.overview} onChange={e => setForm({...form,overview:e.target.value})} placeholder="Коротко о фильме"/></label><label>Статус<select value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="watched">Просмотрено</option><option value="planned">В планах</option><option value="watching">Смотрю</option></select></label><label>Оценка<select value={form.rating} onChange={e => setForm({...form,rating:e.target.value})}><option value="">Без оценки</option>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1} / 10</option>)}</select></label><label>Дата просмотра<input type="date" value={form.watched_at} onChange={e => setForm({...form,watched_at:e.target.value})}/></label><label className="full-field">Личные впечатления<textarea rows="3" value={form.review} onChange={e => setForm({...form,review:e.target.value})} placeholder="Что запомнилось?"/></label></div>
      <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModal(false)}>Отмена</button><button className="add-button" disabled={busy}>{busy && <LoaderCircle className="spin" size={16}/>}<Check size={16}/> {editing ? 'Сохранить' : 'Добавить в коллекцию'}</button></div>
    </form></div>}
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><section className="detail-modal"><button className="detail-close icon-button" onClick={() => setSelected(null)} aria-label="Закрыть"><X size={19}/></button><div className="detail-hero">{selected.poster_url && <img src={selected.poster_url} alt=""/>}<div className="detail-shade"/><div className="detail-title"><span className="section-kicker">ЗАПИСЬ В КОЛЛЕКЦИИ</span><h2>{selected.title}</h2><p>{selected.year} {selected.director && `· ${selected.director}`}</p>{selected.rating && <div className="detail-rating"><Star fill="currentColor" size={16}/>{selected.rating}<small>/ 10</small></div>}</div></div><div className="detail-body"><div className="genre-row">{(selected.genres || []).map(g=><span key={g}>{g}</span>)}</div>{selected.overview && <p className="detail-overview">{selected.overview}</p>}<div className="review-box"><div>ЗАМЕТКИ</div><p>{selected.review || 'Заметок к этому фильму пока нет.'}</p></div><div className="detail-actions"><button className="cancel-button" onClick={() => openEdit(selected)}><Pencil size={15}/> Изменить</button><button className="delete-button" onClick={() => deleteFilm(selected)}><Trash2 size={15}/> Удалить</button></div></div></section></div>}
  </div>;
}
