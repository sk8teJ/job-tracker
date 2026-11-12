import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, BriefcaseBusiness, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

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
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      setSession(data?.session || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage('Аккаунт создан. Проверь почту и подтверди адрес, затем вернись сюда для входа.');
        } else {
          setMessage('Аккаунт создан. Добро пожаловать в CareerDesk!');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
      }
    } catch (authError) {
      setError(authError?.message || 'Не удалось выполнить запрос. Попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="auth-screen"><div className="auth-loading"><span className="auth-mark">c</span><p>Подключаем CareerDesk...</p></div></div>;
  }

  if (!supabase) {
    return <div className="auth-screen"><section className="auth-card auth-config-card">
      <div className="auth-brand"><span className="auth-mark">c</span><span>career<span>desk</span></span></div>
      <div className="auth-icon"><LockKeyhole size={22}/></div>
      <h1>Нужно настроить подключение</h1>
      <p>Не найдены переменные окружения Supabase. Добавь VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в локальный файл .env, затем перезапусти Vite.</p>
      <div className="auth-config-list"><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></div>
    </section></div>;
  }

  if (!session) {
    return <div className="auth-screen">
      <div className="auth-decoration"><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/><div className="auth-decoration-core"><BriefcaseBusiness size={34}/></div></div>
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-mark">c</span><span>career<span>desk</span></span></div>
        <div className="auth-eyebrow"><Sparkles size={13}/> PERSONAL CAREER WORKSPACE</div>
        <h1>{mode === 'login' ? 'С возвращением.' : 'Создай своё пространство.'}</h1>
        <p className="auth-description">{mode === 'login' ? 'Войди, чтобы продолжить управлять поиском работы.' : 'Зарегистрируйся, чтобы хранить вакансии и прогресс в облаке.'}</p>
        <form className="auth-form" onSubmit={submit}>
          <label><span><Mail size={14}/> Электронная почта</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
          <label><span><LockKeyhole size={14}/> Пароль</span><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Не менее 8 символов" required/></label>
          {error && <div className="auth-alert error">{error}</div>}
          {message && <div className="auth-alert success"><ShieldCheck size={15}/>{message}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Подожди...' : mode === 'login' ? 'Войти в CareerDesk' : 'Создать аккаунт'} <ArrowRight size={16}/></button>
        </form>
        <div className="auth-switch">{mode === 'login' ? 'Впервые здесь?' : 'Уже есть аккаунт?'} <button type="button" onClick={()=>{setMode(mode === 'login' ? 'signup' : 'login');setError('');setMessage('');}}>{mode === 'login' ? 'Создать аккаунт' : 'Войти'}</button></div>
        <div className="auth-security"><ShieldCheck size={14}/> Защищённое подключение Supabase Auth</div>
      </section>
      <div className="auth-footer">CAREERDESK <span>·</span> YOUR NEXT CHAPTER STARTS HERE</div>
    </div>;
  }

  return <>{children}<button className="auth-logout" onClick={() => supabase.auth.signOut()} title={session.user.email}>Выйти</button></>;
}
