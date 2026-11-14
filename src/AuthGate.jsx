import { useEffect, useState } from 'react';
import supabase from './lib/supabase.js';
import { ArrowRight, Film, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      setSession(data?.session || null); setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (authError) throw authError;
        setMessage(data.session ? 'Аккаунт создан. Добро пожаловать в FRAME!' : 'Аккаунт создан. Проверь почту и подтверди адрес, затем войди.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (authError) { setError(authError?.message || 'Не удалось выполнить запрос. Попробуй ещё раз.'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="auth-screen"><div className="auth-loading"><span className="auth-mark">F</span><p>Открываем FRAME...</p></div></div>;
  if (!supabase) return <div className="auth-screen"><section className="auth-card auth-config-card"><div className="auth-brand"><span className="auth-mark">F</span><span>FRAME</span></div><h1>Сначала подключим твою кинотеку</h1><p>Добавь локальные переменные Supabase в файл .env.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY</code></section></div>;
  if (session) return <>{children}<button className="frame-logout" onClick={() => supabase.auth.signOut()}>Выйти</button></>;

  return <div className="auth-screen"><div className="auth-backdrop-orbit"/><section className="auth-card">
    <div className="auth-brand"><span className="auth-mark">F</span><span>FRAME<span>.</span></span></div>
    <div className="auth-kicker"><Sparkles size={13}/> YOUR PERSONAL CINEMA JOURNAL</div>
    <h1>{mode === 'login' ? <>Твоя история.<br/><em>Твоё кино.</em></> : <>Создай свою<br/><em>киноисторию.</em></>}</h1>
    <p className="auth-description">Место, где каждый просмотр становится воспоминанием.</p>
    <form onSubmit={submit}>
      <label><span>ЭЛЕКТРОННАЯ ПОЧТА</span><div><Mail size={16}/><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div></label>
      <label><span>ПАРОЛЬ</span><div><LockKeyhole size={16}/><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов"/></div></label>
      {error && <p className="auth-error">{error}</p>}{message && <p className="auth-message">{message}</p>}
      <button className="auth-submit" disabled={busy}>{busy ? 'Подожди...' : mode === 'login' ? 'Войти в FRAME' : 'Создать аккаунт'} <ArrowRight size={16}/></button>
    </form>
    <div className="auth-switch">{mode === 'login' ? 'Впервые здесь?' : 'Уже есть аккаунт?'} <button onClick={() => {setMode(mode === 'login' ? 'signup' : 'login');setError('');setMessage('')}}>{mode === 'login' ? 'Создать аккаунт' : 'Войти'}</button></div>
    <div className="auth-foot"><ShieldCheck size={13}/> ТВОЯ КОЛЛЕКЦИЯ ДОСТУПНА ТОЛЬКО ТЕБЕ</div>
  </section></div>;
}
