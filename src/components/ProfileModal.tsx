import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Check,
  AlertCircle,
  Sparkles,
  Crown,
  Eye,
  EyeOff,
  ShieldCheck,
  Calendar,
  Zap,
} from 'lucide-react';
import { User } from '../types/auth';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  authToken: string;
  onUserUpdated: (updatedUser: User) => void;
  onOpenSubscription?: () => void;
}

type Tab = 'profile' | 'password';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authToken,
  onUserUpdated,
  onOpenSubscription,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Update inputs if currentUser changes
  useEffect(() => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
  }, [currentUser]);

  // Clear notifications on tab switch or close
  useEffect(() => {
    setSuccess('');
    setError('');
  }, [activeTab, isOpen]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (!isOpen) return null;

  const clearMessages = () => {
    setSuccess('');
    setError('');
  };

  const formatExpiryDate = (isoDate: string | null | undefined): string => {
    if (!isoDate) return 'бессрочно';
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return 'бессрочно';
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch {
      return 'бессрочно';
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Имя не может быть пустым.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Введите корректный адрес электронной почты.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка при сохранении данных профиля.');
        return;
      }

      const updatedUser = data.user
        ? { ...currentUser, ...data.user }
        : { ...currentUser, name: trimmedName, email: trimmedEmail };
      onUserUpdated(updatedUser);
      setSuccess('Данные профиля успешно сохранены!');
    } catch {
      setError('Ошибка подключения к серверу. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    if (!currentPassword) {
      setError('Введите текущий пароль.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Новый пароль должен быть не менее 6 символов.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка при смене пароля.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Пароль успешно обновлён!');
    } catch {
      setError('Ошибка подключения к серверу. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (tab: Tab) =>
    `flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
      activeTab === tab
        ? 'bg-emerald-800 text-white shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden bg-white border-slate-200 text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <UserIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 id="profile-modal-title" className="font-bold text-base text-slate-900">
                Настройки профиля
              </h3>
              <p className="text-xs text-slate-500">Управление учетной записью DOSKA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tariff Status Card */}
        <div className="px-6 pt-5 pb-2">
          <div
            className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
              currentUser.is_pro
                ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-200/80 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl shadow-xs ${
                  currentUser.is_pro
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentUser.is_pro ? (
                  <Crown className="w-5 h-5 fill-white" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ваш статус
                  </span>
                  {currentUser.role === 'admin' && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700">
                      Администратор
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  {currentUser.is_pro ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>
                        Тариф: PRO {currentUser.pro_expires_at ? `активен до ${formatExpiryDate(currentUser.pro_expires_at)}` : 'активен бессрочно'}
                      </span>
                    </>
                  ) : (
                    <span>Тариф: FREE</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action button for tariff */}
            {!currentUser.is_pro && onOpenSubscription && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubscription();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-xs hover:brightness-105 active:scale-95 transition"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                Купить PRO — 99 ₽
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-3 pb-2 border-b border-slate-100">
          <button
            type="button"
            className={tabClass('profile')}
            onClick={() => {
              setActiveTab('profile');
              clearMessages();
            }}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Личные данные
          </button>
          <button
            type="button"
            className={tabClass('password')}
            onClick={() => {
              setActiveTab('password');
              clearMessages();
            }}
          >
            <Lock className="w-3.5 h-3.5" />
            Смена пароля
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 flex flex-col gap-4">
          {/* Notifications */}
          {success && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Введите ваше имя"
                  required
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none text-sm bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={120}
                  placeholder="your@email.com"
                  required
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none text-sm bg-slate-50 focus:bg-white transition"
                />
                <span className="text-[11px] text-slate-400">
                  Email используется для входа в аккаунт и синхронизации созданных досок.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white rounded-xl shadow-xs transition active:scale-95"
                >
                  {loading ? 'Сохранение...' : 'Сохранить профиль'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  Текущий пароль
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Введите текущий пароль"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none text-sm bg-slate-50 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showCurrentPass ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    minLength={6}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none text-sm bg-slate-50 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showNewPass ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Повторите новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    minLength={6}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 outline-none text-sm bg-slate-50 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showConfirmPass ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-150 p-3 text-[11px] text-slate-500 leading-relaxed">
                Пароль надёжно защищен криптографическим хешированием bcrypt (10 раундов соли).
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white rounded-xl shadow-xs transition active:scale-95"
                >
                  {loading ? 'Обновление...' : 'Изменить пароль'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Aliases for compatibility
export const AccountSettingsModal = ProfileModal;
export default ProfileModal;
