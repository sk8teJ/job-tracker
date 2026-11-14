import { useEffect, useState } from 'react';
import supabase from './lib/supabase.js';
import { ArrowRight, LockKeyhole, Mail, LoaderCircle } from 'lucide-react';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    supabase.auth.getSession().then(({ data }) => { setSession(data?.session || null); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (authError) throw authError;
        setMessage(data.session ? 'Аккаунт создан.' : 'Проверь почту и подтверди адрес, затем войди.');
        if (!data.session) setMode('login');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (authError) { setError(authError?.message || 'Не удалось выполнить запрос.'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="welcome-loading"><LoaderCircle className="spin" size={22}/></div>;
  if (session) return <>{children}<button className="frame-logout" onClick={() => supabase.auth.signOut()}>ВЫЙТИ</button></>;
  if (!supabase) return <div className="welcome-loading">Проверь настройки подключения Supabase в .env</div>;

  return <main className="welcome-screen">
    <video className="welcome-video" autoPlay muted loop playsInline poster="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2200&q=85">
      <source src="https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_25fps.mp4" type="video/mp4"/>
    </video>
    <div className="welcome-shade"/>
    <a className="welcome-logo" href="#" aria-label="Mora">mora</a>
    {!showAuth ? <button className="welcome-cta" onClick={() => setShowAuth(true)}>СОЗДАТЬ КОЛЛЕКЦИЮ <ArrowRight size={15}/></button> :
      <section className="welcome-auth">
        <button className="auth-back" onClick={() => {setShowAuth(false);setError('');setMessage('')}}>← НАЗАД</button>
        <div className="auth-form-title">{mode === 'signup' ? 'Создать коллекцию' : 'Войти'}</div>
        <form onSubmit={submit}>
          <label><span>ПОЧТА</span><div><Mail size={15}/><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div></label>
          <label><span>ПАРОЛЬ</span><div><LockKeyhole size={15}/><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов"/></div></label>
          {error && <p className="auth-error">{error}</p>}{message && <p className="auth-message">{message}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? 'ПОДОЖДИ...' : mode === 'signup' ? 'СОЗДАТЬ' : 'ВОЙТИ'} <ArrowRight size={15}/></button>
        </form>
        <button className="auth-mode" onClick={() => {setMode(mode === 'signup' ? 'login' : 'signup');setError('');setMessage('')}}>{mode === 'signup' ? 'УЖЕ ЕСТЬ КОЛЛЕКЦИЯ? ВОЙТИ' : 'НЕТ АККАУНТА? СОЗДАТЬ'}</button>
      </section>}
  </main>;
}
