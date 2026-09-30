import React, { useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  LoaderCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { loginUser, registerUser } from '../utils/auth';
import { User } from '../types/auth';
import { Footer } from './Footer';

interface AuthModalProps {
  onSuccess: (user: User) => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenContacts?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  onOpenTerms,
  onOpenPrivacy,
  onOpenContacts,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setOauthNotice(null);

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Пожалуйста, введите ваше имя');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Пожалуйста, введите email');
      return;
    }
    if (!password) {
      setErrorMessage('Пожалуйста, введите пароль');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Пароль должен быть не короче 6 символов');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const response = await loginUser(email.trim(), password);
        onSuccess(response.user);
      } else {
        const response = await registerUser(name.trim(), email.trim(), password);
        onSuccess(response.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Произошла ошибка при авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthClick = (providerName: string) => {
    if (providerName === 'Яндекс') {
      window.location.href = '/api/auth/yandex';
      return;
    }
    if (providerName === 'VK') {
      window.location.href = '/api/auth/vk';
      return;
    }
    setOauthNotice(`Вход через ${providerName} будет доступен после добавления ключей в настройках сервера.`);
    setTimeout(() => {
      setOauthNotice(null);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start overflow-y-auto bg-slate-950/60 p-4 py-8 backdrop-blur-md">
      {/* Background patterned grid */}
      <div className="pointer-events-none fixed inset-0 opacity-20 [background-image:linear-gradient(rgba(16,94,76,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(16,94,76,0.3)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-emerald-900/15 bg-white p-7 shadow-2xl transition-all sm:p-9">
        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-800 text-white shadow-md shadow-emerald-900/20">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">ДОСКА</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Интерактивная панель преподавателя
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'login'
              ? 'Войдите в свой аккаунт для доступа к доскам'
              : 'Создайте личный кабинет для сохранения уроков'}
          </p>
        </div>

        {/* Tab switcher: Login / Register */}
        <div className="mt-6 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setOauthNotice(null);
            }}
            className={`flex-1 rounded-lg py-2.5 transition ${
              mode === 'login'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setOauthNotice(null);
            }}
            className={`flex-1 rounded-lg py-2.5 transition ${
              mode === 'register'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Зарегистрироваться
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-snug">{errorMessage}</p>
          </div>
        )}

        {/* OAuth notification toast */}
        {oauthNotice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 animate-in fade-in">
            <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <p className="leading-snug">{oauthNotice}</p>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Имя и фамилия</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Анна Сергеевна"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Электронная почта</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder="teacher@school.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Пароль</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition hover:text-slate-700"
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/15 transition hover:bg-emerald-900 disabled:opacity-60"
          >
            {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            <span>{mode === 'login' ? 'Войти в личный кабинет' : 'Зарегистрироваться'}</span>
          </button>
        </form>

        {/* Quick OAuth options */}
        <div className="mt-6">
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Быстрый вход
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {/* Yandex Button */}
            <button
              type="button"
              onClick={() => handleOAuthClick('Яндекс')}
              title="Войти через Яндекс"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-red-300 hover:bg-red-50/40 hover:text-red-700 active:scale-[0.98]"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
                <path
                  d="M13.8 6.5h-1.9c-1.8 0-2.8 1-2.8 2.5 0 1.2.6 2 1.8 2.9l-2.2 5.6h1.9l2.2-5.4h.6v5.4h1.8V6.5h-1.4zm-.4 3.7h-.8c-.8 0-1.2-.4-1.2-1.1 0-.8.5-1.2 1.3-1.2h.7v2.3z"
                  fill="#FFF"
                />
              </svg>
              <span>Яндекс</span>
            </button>

            {/* VK Button */}
            <button
              type="button"
              onClick={() => handleOAuthClick('VK')}
              title="Войти через VK"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-700 active:scale-[0.98]"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="12" fill="#0077FF" />
                <path
                  d="M13.162 16.5c-4.437 0-6.966-3.04-7.072-8.1h2.24c.074 3.71 1.71 5.28 3.01 5.6V8.4h2.11v3.2c1.29-.14 2.62-1.6 3.08-3.2h2.11c-.36 2.05-1.87 3.51-2.93 4.13 1.06.49 2.76 1.77 3.39 3.97h-2.33c-.5-1.55-1.74-2.75-3.38-2.91v2.91h-.228z"
                  fill="#FFF"
                />
              </svg>
              <span>VK</span>
            </button>

            {/* Google Button */}
            <button
              type="button"
              onClick={() => handleOAuthClick('Google')}
              title="Войти через Google"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-4 border-t border-slate-100 pt-3 text-center text-[10px] leading-relaxed text-slate-400">
          <span>Регистрируясь или входя, вы соглашаетесь с </span>
          {onOpenTerms ? (
            <button
              type="button"
              onClick={onOpenTerms}
              className="font-semibold text-slate-600 underline hover:text-emerald-800"
            >
              Публичной офертой
            </button>
          ) : (
            <span className="font-semibold text-slate-600">Публичной офертой</span>
          )}
          <span> и </span>
          {onOpenPrivacy ? (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="font-semibold text-slate-600 underline hover:text-emerald-800"
            >
              Политикой конфиденциальности
            </button>
          ) : (
            <span className="font-semibold text-slate-600">Политикой конфиденциальности</span>
          )}
        </div>
      </div>

      {/* Footer for unauthenticated screen (moderation compliance) */}
      {onOpenTerms && onOpenPrivacy && onOpenContacts && (
        <div className="relative z-10 mt-6 w-full max-w-4xl">
          <Footer
            onOpenTerms={onOpenTerms}
            onOpenPrivacy={onOpenPrivacy}
            onOpenContacts={onOpenContacts}
            className="rounded-2xl border border-emerald-950/10 shadow-lg bg-white/90"
          />
        </div>
      )}
    </div>
  );
};
