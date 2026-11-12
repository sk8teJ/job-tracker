import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Download, FileText,
  Filter, LayoutDashboard, Menu, MessageCircle, MoreHorizontal, Plus, Search,
  Settings, Sparkles, Target, TrendingUp, Users, X, ChartNoAxesCombined,
  KanbanSquare, Building2, MapPin, Wallet, ExternalLink, Trash2, SlidersHorizontal
} from 'lucide-react';

const seed = [
  { id: 1, company: 'Сбер', role: 'Junior AI Analyst', salary: 'от 80 000 ₽', place: 'Москва · Гибрид', date: '2026-11-12', status: 'Интервью', source: 'hh.ru', url: '', note: 'Подготовиться к разговору о проектах и RAG.' },
  { id: 2, company: 'Яндекс', role: 'Младший аналитик данных', salary: 'от 90 000 ₽', place: 'Удалённо', date: '2026-11-11', status: 'Отклик отправлен', source: 'Карьерный сайт', url: '', note: '' },
  { id: 3, company: 'Т-Банк', role: 'Стажёр бизнес-аналитик', salary: 'Не указана', place: 'Москва · Гибрид', date: '2026-11-10', status: 'Тестовое', source: 'hh.ru', url: '', note: '' },
  { id: 4, company: 'Контур', role: 'Junior Prompt Engineer', salary: 'от 70 000 ₽', place: 'Удалённо', date: '2026-11-08', status: 'Отказ', source: 'Telegram', url: '', note: '' },
  { id: 5, company: 'МТС', role: 'Младший системный аналитик', salary: 'от 85 000 ₽', place: 'Удалённо', date: '2026-11-07', status: 'Отклик отправлен', source: 'hh.ru', url: '', note: '' },
  { id: 6, company: 'Ozon', role: 'Junior Data Analyst', salary: 'от 75 000 ₽', place: 'Удалённо', date: '2026-11-05', status: 'Сохранена', source: 'hh.ru', url: '', note: '' },
];
const stages = ['Сохранена', 'Отклик отправлен', 'Тестовое', 'Интервью', 'Оффер', 'Отказ'];
const nav = [
  { id: 'Обзор', icon: LayoutDashboard },
  { id: 'Вакансии', icon: BriefcaseBusiness },
  { id: 'Воронка', icon: KanbanSquare },
  { id: 'Контакты', icon: Users },
  { id: 'Документы', icon: FileText },
  { id: 'Аналитика', icon: ChartNoAxesCombined },
];
const demoContacts = [
  { name: 'Анна Смирнова', company: 'Сбер', role: 'HR-специалист', channel: 'Telegram', last: '12 ноября' },
  { name: 'Илья Петров', company: 'Яндекс', role: 'Рекрутер', channel: 'Почта', last: '11 ноября' },
];

function readApplications() {
  try {
    const saved = localStorage.getItem('careerdesk-applications');
    return saved ? JSON.parse(saved) : seed;
  } catch { return seed; }
}
function dateLabel(value) {
  if (!value) return '—';
  const d = new Date(value + 'T12:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}
function initials(value = '') { return value.trim().slice(0, 1).toUpperCase() || '?'; }

export default function App() {
  const [page, setPage] = useState('Обзор');
  const [items, setItems] = useState(readApplications);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Все статусы');
  const [modal, setModal] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ company: '', role: '', salary: '', place: 'Удалённо', date: new Date().toISOString().slice(0, 10), status: 'Сохранена', source: '', url: '', note: '' });

  useEffect(() => { localStorage.setItem('careerdesk-applications', JSON.stringify(items)); }, [items]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => items.filter((v) => {
    const q = query.toLowerCase();
    const match = !q || [v.company, v.role, v.place, v.source].join(' ').toLowerCase().includes(q);
    return match && (statusFilter === 'Все статусы' || v.status === statusFilter);
  }), [items, query, statusFilter]);

  const count = (status) => items.filter((v) => v.status === status).length;
  const active = items.filter((v) => !['Отказ', 'Оффер'].includes(v.status)).length;
  const responseRate = items.length ? Math.round(items.filter((v) => ['Интервью', 'Тестовое', 'Оффер'].includes(v.status)).length / items.length * 100) : 0;

  function addApplication(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    setItems((old) => [{ ...form, id: Date.now() }, ...old]);
    setForm({ company: '', role: '', salary: '', place: 'Удалённо', date: new Date().toISOString().slice(0, 10), status: 'Сохранена', source: '', url: '', note: '' });
    setModal(false);
    setPage('Вакансии');
    setToast('Вакансия добавлена');
  }
  function updateStatus(id, status) {
    setItems((old) => old.map((v) => v.id === id ? { ...v, status } : v));
    setToast('Статус обновлён');
  }
  function removeItem(id) {
    setItems((old) => old.filter((v) => v.id !== id));
    setToast('Запись удалена');
  }
  function exportCsv() {
    const cols = ['company', 'role', 'salary', 'place', 'date', 'status', 'source', 'url', 'note'];
    const rows = [cols.join(';'), ...items.map((v) => cols.map((k) => '"' + String(v[k] || '').replaceAll('"', '""') + '"').join(';'))];
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'careerdesk-vacancies.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const pageTitle = page === 'Обзор' ? 'Обзор' : page;
  const subtitle = {
    Обзор: 'Всё о поиске работы — в одном рабочем пространстве.',
    Вакансии: 'Собирай возможности и контролируй каждый отклик.',
    Воронка: 'От первого интереса до предложения о работе.',
    Контакты: 'Люди, с которыми строится твой следующий карьерный шаг.',
    Документы: 'Материалы, которые помогают двигаться быстрее.',
    Аналитика: 'Смотри на поиск работы как на понятный процесс.',
    Настройки: 'Управление рабочим пространством.',
  }[page];

  return <div className="app-shell">
    <aside className={'sidebar ' + (mobileNav ? 'sidebar--open' : '')}>
      <div className="brand"><div className="brand-symbol">c</div><span>career<span className="brand-muted">desk</span></span><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">Я</div><div><b>Мой workspace</b><small>Личное пространство</small></div><ChevronDown size={15}/></div>
      <div className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav className="navigation">{nav.map(({ id, icon: Icon }) => <button key={id} className={'nav-link ' + (page === id ? 'is-active' : '')} onClick={() => { setPage(id); setMobileNav(false); }}><Icon size={18}/><span>{id}</span>{id === 'Вакансии' && <small>{items.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="ai-promo"><div className="ai-promo-icon"><Sparkles size={17}/></div><b>AI-помощник</b><p>Разбор вакансий и подготовка к откликам.</p><span>СКОРО</span></div>
        <button className={'nav-link ' + (page === 'Настройки' ? 'is-active' : '')} onClick={() => setPage('Настройки')}><Settings size={18}/><span>Настройки</span></button>
        <div className="user-profile"><div className="user-avatar">ЯП</div><div><b>Мой профиль</b><small>Junior · AI & Analytics</small></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Закрыть меню" onClick={() => setMobileNav(false)}/>}
    <main className="main">
      <header className="topbar"><button className="mobile-trigger" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs">Workspace <span>/</span> <b>{pageTitle}</b></div><div className="topbar-right"><div className="today-pill"><CalendarDays size={15}/> {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div><button className="bell-button" aria-label="Уведомления"><Bell size={18}/><i/></button></div></header>
      <div className="content">
        <div className="page-intro"><div><div className="overline">CAREER MANAGEMENT / 2026</div><h1>{page === 'Обзор' ? 'Привет! Продолжим поиск.' : pageTitle + '.'}</h1><p>{subtitle}</p></div>{['Обзор', 'Вакансии'].includes(page) && <button className="button-primary" onClick={() => setModal(true)}><Plus size={17}/> Добавить вакансию</button>}</div>

        {page === 'Обзор' && <>
          <section className="metric-grid">
            <Metric icon={BriefcaseBusiness} label="Всего вакансий" value={items.length} foot="В твоей базе" tone="violet"/>
            <Metric icon={Activity} label="В активной работе" value={active} foot="Без отказов и офферов" tone="blue"/>
            <Metric icon={CalendarDays} label="Собеседования" value={count('Интервью')} foot="Следи за подготовкой" tone="green"/>
            <Metric icon={Target} label="Продвижение по этапам" value={responseRate + '%'} foot="Тестовые и интервью" tone="amber"/>
          </section>
          <section className="overview-grid">
            <div className="panel funnel-panel"><div className="panel-head"><div><h2>Воронка поиска</h2><p>Текущее распределение откликов</p></div><button className="round-icon" onClick={() => setPage('Воронка')}><ArrowUpRight size={17}/></button></div><div className="funnel-total"><strong>{items.length}</strong><span>вакансий в системе</span><div className="funnel-progress"><span style={{width: responseRate + '%'}}/></div><small>{responseRate}% дошли до следующих этапов</small></div><div className="stage-list">{[{s:'Сохранена',c:'lilac'},{s:'Отклик отправлен',c:'blue'},{s:'Тестовое',c:'orange'},{s:'Интервью',c:'green'},{s:'Оффер',c:'gold'}].map(x=><div className="stage-line" key={x.s}><span><i className={'dot '+x.c}/>{x.s}</span><b>{count(x.s)}</b></div>)}</div></div>
            <div className="focus-card"><div className="focus-top"><span className="focus-icon"><CalendarDays size={18}/></span><span className="focus-label">ФОКУС НА СЕГОДНЯ</span><span className="focus-spark"><Sparkles size={17}/></span></div><div className="focus-date">12 <span>НОЯБРЯ</span></div><h2>Подготовка к следующему этапу</h2><p>Проверь заметки по собеседованию и подготовь примеры своих проектов.</p><div className="focus-divider"/><div className="focus-company"><div className="company-mark green">С</div><div><b>Сбер · Junior AI Analyst</b><small>Собеседование</small></div></div><button className="focus-link" onClick={() => setPage('Вакансии')}>Открыть вакансию <ArrowRight size={15}/></button></div>
          </section>
          <section className="panel recent-panel"><div className="panel-head"><div><h2>Недавние вакансии</h2><p>Последние изменения в твоей базе</p></div><button className="button-quiet" onClick={() => setPage('Вакансии')}>Все вакансии <ArrowUpRight size={15}/></button></div><VacancyTable items={items.slice(0, 5)} onStatus={updateStatus} onRemove={removeItem}/></section>
          <section className="bottom-note"><div className="note-icon"><Sparkles size={18}/></div><div><b>Маленькие шаги — большой результат.</b><p>Добавляй вакансии сразу после отклика, фиксируй разговоры и не теряй договорённости.</p></div><span>CAREERDESK</span></section>
        </>}

        {page === 'Вакансии' && <section className="panel vacancy-panel"><div className="panel-head vacancy-head"><div><h2>База вакансий</h2><p>{items.length} записей · данные сохраняются в этом браузере</p></div><button className="button-quiet" onClick={exportCsv}><Download size={15}/> Экспорт CSV</button></div><div className="table-tools"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Компания, должность или формат..."/></div><div className="filter-field"><SlidersHorizontal size={15}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Все статусы</option>{stages.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={14}/></div></div><VacancyTable items={filtered} onStatus={updateStatus} onRemove={removeItem}/><div className="table-foot">Показано {filtered.length} из {items.length} вакансий</div></section>}

        {page === 'Воронка' && <section className="kanban-wrap"><div className="kanban-info"><div><b>Доска откликов</b><span>Меняй статус прямо в карточке вакансии.</span></div><span className="kanban-total">{items.length} всего</span></div><div className="kanban-board">{stages.filter(s=>s!=='Отказ').map((stage, index)=><div className="kanban-column" key={stage}><div className="kanban-column-head"><span className={'column-dot c'+index}/><b>{stage}</b><small>{count(stage)}</small></div><div className="kanban-cards">{items.filter(v=>v.status===stage).map(v=><article className="kanban-card" key={v.id}><div className="kanban-card-top"><div className="company-mark">{initials(v.company)}</div><button className="mini-more" onClick={()=>removeItem(v.id)} title="Удалить"><Trash2 size={14}/></button></div><h3>{v.role}</h3><p>{v.company}</p><div className="kanban-card-meta"><span><Wallet size={13}/>{v.salary}</span><span><CalendarDays size={13}/>{dateLabel(v.date)}</span></div><select value={v.status} onChange={e=>updateStatus(v.id,e.target.value)} aria-label="Изменить статус">{stages.map(s=><option key={s}>{s}</option>)}</select></article>)}</div></div>)}</div><div className="rejected-strip"><span><ArrowDownRight size={16}/> Отказы</span><b>{count('Отказ')}</b><button onClick={()=>{setPage('Вакансии');setStatusFilter('Отказ')}}>Посмотреть</button></div></section>}

        {page === 'Контакты' && <section className="panel content-panel"><div className="panel-head"><div><h2>Контакты</h2><p>Рекрутеры и люди из компаний, с которыми ты общаешься.</p></div><button className="button-primary" onClick={()=>setToast('Добавление контактов появится в следующем обновлении')}><Plus size={16}/> Добавить контакт</button></div><div className="contact-grid">{demoContacts.map(c=><article className="contact-card" key={c.name}><div className="contact-avatar">{initials(c.name)}</div><div className="contact-main"><h3>{c.name}</h3><p>{c.role} · {c.company}</p><div className="contact-meta"><MessageCircle size={14}/>{c.channel}<span>·</span>{c.last}</div></div><button className="round-icon" aria-label="Действия"><MoreHorizontal size={17}/></button></article>)}</div><div className="empty-hint"><Users size={20}/><span>Контакты здесь пока демонстрационные. Добавление и привязка к откликам — следующий этап.</span></div></section>}

        {page === 'Документы' && <section className="panel content-panel"><div className="panel-head"><div><h2>Документы</h2><p>Резюме, сопроводительные письма и материалы для интервью.</p></div><button className="button-primary" onClick={()=>setToast('Загрузка документов подключим вместе с Supabase Storage')}><Plus size={16}/> Добавить документ</button></div><div className="document-grid"><DocumentTile icon={FileText} title="Основное резюме" type="PDF · основная версия" tag="БАЗОВАЯ" tone="violet"/><DocumentTile icon={FileText} title="Резюме · AI / Prompt" type="PDF · версия под AI-вакансии" tag="AI" tone="blue"/><DocumentTile icon={MessageCircle} title="Сопроводительные письма" type="Шаблоны и варианты" tag="ТЕКСТ" tone="orange"/></div><div className="empty-hint"><Download size={20}/><span>Файлы пока не загружаются на сервер. Подключим защищённое хранилище после настройки Supabase.</span></div></section>}

        {page === 'Аналитика' && <><section className="metric-grid analytics-metrics"><Metric icon={BriefcaseBusiness} label="Всего добавлено" value={items.length} foot="За всё время" tone="violet"/><Metric icon={MessageCircle} label="Ответы и этапы" value={items.filter(v=>['Тестовое','Интервью','Оффер'].includes(v.status)).length} foot="После отклика" tone="green"/><Metric icon={TrendingUp} label="Конверсия в этап" value={responseRate+'%'} foot="Тестовые и интервью" tone="blue"/><Metric icon={Target} label="Активные" value={active} foot="Текущая работа" tone="amber"/></section><section className="panel analytics-panel"><div className="panel-head"><div><h2>Распределение по этапам</h2><p>Сколько вакансий находится на каждом этапе</p></div><span className="period-label">ВСЁ ВРЕМЯ</span></div><div className="analytics-bars">{stages.map((s,i)=><div className="analytics-row" key={s}><span>{s}</span><div className="analytics-track"><i style={{width:(items.length?Math.max(count(s)>0?7:0,count(s)/items.length*100):0)+'%'}} className={'analytics-fill fill-'+i}/></div><b>{count(s)}</b></div>)}</div></section><section className="insight-panel"><Sparkles size={19}/><div><b>Что можно улучшить</b><p>{count('Отклик отправлен')>0?'Есть отклики без ответа. Запланируй follow-up через 5–7 рабочих дней.':'Добавь новые вакансии, чтобы статистика стала информативнее.'} Аналитика рассчитывается по данным, сохранённым в этом браузере.</p></div></section></>}

        {page === 'Настройки' && <section className="panel content-panel settings-panel"><div className="panel-head"><div><h2>Настройки</h2><p>Параметры твоего рабочего пространства.</p></div></div><div className="setting-row"><div><b>Локальное хранение</b><p>Данные сейчас сохраняются в браузере на этом устройстве.</p></div><span className="setting-state"><Check size={14}/> Активно</span></div><div className="setting-row"><div><b>Экспорт данных</b><p>Скачай резервную копию списка вакансий в формате CSV.</p></div><button className="button-quiet" onClick={exportCsv}><Download size={15}/> Экспортировать</button></div><div className="setting-row"><div><b>Облачная синхронизация</b><p>Подключение аккаунта и Supabase будет добавлено отдельно.</p></div><span className="coming-soon">СКОРО</span></div><div className="setting-row"><div><b>Сброс демонстрационных данных</b><p>Вернуть исходный пример вакансий. Текущие записи будут заменены.</p></div><button className="button-danger" onClick={()=>{setItems(seed);setToast('Демо-данные восстановлены')}}>Сбросить</button></div></section>}
      </div>
      <footer className="footer"><span>CAREERDESK <i>·</i> PERSONAL JOB CRM</span><span>Сделано, чтобы поиск работы был понятнее.</span></footer>
    </main>

    {modal && <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={addApplication}><div className="modal-head"><div><span className="overline">НОВАЯ ЗАПИСЬ</span><h2>Добавить вакансию</h2></div><button type="button" className="round-icon" onClick={()=>setModal(false)}><X size={18}/></button></div><div className="form-grid"><label>Компания *<input autoFocus value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Например, Яндекс" required/></label><label>Название позиции *<input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="Junior Data Analyst" required/></label><label>Зарплата<input value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} placeholder="от 80 000 ₽"/></label><label>Формат / город<input value={form.place} onChange={e=>setForm({...form,place:e.target.value})} placeholder="Удалённо"/></label><label>Дата добавления<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Статус<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><label>Источник<input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="hh.ru, Telegram..."/></label><label>Ссылка на вакансию<input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://..."/></label><label className="full-field">Заметки<textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Контакт, договорённости, что подготовить..."/></label></div><div className="modal-actions"><button type="button" className="button-quiet" onClick={()=>setModal(false)}>Отмена</button><button type="submit" className="button-primary"><Plus size={16}/> Сохранить вакансию</button></div></form></div>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Metric({icon:Icon,label,value,foot,tone}) { return <article className="metric-card"><div className="metric-top"><span>{label}</span><i className={'metric-icon '+tone}><Icon size={18}/></i></div><strong>{value}</strong><small>{foot}</small></article>; }
function VacancyTable({items,onStatus,onRemove}) {
  if (!items.length) return <div className="empty-table"><Search size={22}/><b>Ничего не найдено</b><span>Измени запрос или добавь новую вакансию.</span></div>;
  return <div className="table-scroll"><table className="vacancy-table"><thead><tr><th>КОМПАНИЯ / ПОЗИЦИЯ</th><th>ЗАРПЛАТА</th><th>ФОРМАТ</th><th>ДАТА</th><th>СТАТУС</th><th/></tr></thead><tbody>{items.map(v=><tr key={v.id}><td><div className="company-cell"><div className="company-mark">{initials(v.company)}</div><div><b>{v.role}</b><small>{v.company}</small></div></div></td><td className="salary">{v.salary || '—'}</td><td className="place-cell"><MapPin size={13}/>{v.place || '—'}</td><td className="date-cell">{dateLabel(v.date)}</td><td><select className={'status-select status-'+stages.indexOf(v.status)} value={v.status} onChange={e=>onStatus(v.id,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></td><td><button className="row-more" title="Удалить запись" onClick={()=>onRemove(v.id)}><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div>;
}
function DocumentTile({icon:Icon,title,type,tag,tone}) { return <article className="document-tile"><div className={'document-icon '+tone}><Icon size={21}/></div><span className="document-tag">{tag}</span><h3>{title}</h3><p>{type}</p><span className="document-soon">УПРАВЛЕНИЕ ФАЙЛАМИ · СКОРО</span></article>; }
