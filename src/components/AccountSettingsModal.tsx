import React, { useState } from 'react';
import { X, User as UserIcon, Mail, Lock, Check, AlertCircle } from 'lucide-react';
import { User } from '../types/auth';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  authToken: string;
  onUserUpdated: (updatedUser: User) => void;
}

type Tab = 'profile' | 'password';

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authToken,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const clearMessages = () => { setSuccess(''); setError(''); };

  const handleSaveProfile = async () => {
    clearMessages();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) { setError('Имя не может быть пустым.'); return; }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Введите корректный email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка сохранения.'); return; }
      onUserUpdated({ ...currentUser, name: trimmedName, email: trimmedEmail });
      setSuccess('Профиль успешно обновлён!');
    } catch {
      setError('Ошибка соединения с сервером.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    clearMessages();
    if (!oldPassword) { setError('Введите текущий пароль.'); return; }
    if (newPassword.length < 6) { setError('Новый пароль должен быть не менее 6 символов.'); return; }
    if (newPassword !== confirmPassword) { setError('Пароли не совпадают.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка смены пароля.'); return; }
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Пароль успешно изменён!');
    } catch {
      setError('Ошибка соединения с сервером.');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition whitespace-nowrap ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600 bg-blue-50/40'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden bg-white border-slate-200 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base">Настройки аккаунта</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-slate-100">
          <button className={tabClass('profile')} onClick={() => { setActiveTab('profile'); clearMessages(); }}>
            Профиль
          </button>
          <button className={tabClass('password')} onClick={() => { setActiveTab('password'); clearMessages(); }}>
            Смена пароля
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <Check className="w-4 h-4 shrink-0" />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {activeTab === 'profile' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Имя
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Ваше имя"
                  className="px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-slate-50 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={120}
                  placeholder="your@email.com"
                  className="px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-slate-50 transition"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl shadow-md transition"
              >
                {loading ? 'Сохраняем...' : 'Сохранить изменения'}
              </button>
            </>
          )}

          {activeTab === 'password' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Текущий пароль
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  className="px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-slate-50 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Новый пароль
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-slate-50 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Повторите новый пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className="px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm bg-slate-50 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Для смены пароля необходимо ввести текущий пароль. Новый пароль будет надёжно сохранён с шифрованием bcrypt.
              </p>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl shadow-md transition"
              >
                {loading ? 'Меняем пароль...' : 'Изменить пароль'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
