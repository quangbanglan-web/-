import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Check,
  CreditCard,
  Crown,
  Eye,
  LoaderCircle,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AdminStats, AdminUser, ProDuration } from '../types/admin';
import { fetchAdminStats, fetchAdminUsers, grantUserPro, revokeUserPro } from '../utils/admin';
import { User } from '../types/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onCurrentUserUpdated?: (updatedUser: User) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCurrentUserUpdated,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal for granting PRO to a specific user
  const [selectedUserForPro, setSelectedUserForPro] = useState<AdminUser | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<ProDuration>('1_month');
  const [isSubmittingPro, setIsSubmittingPro] = useState(false);

  const loadData = useCallback(async (query: string = '') => {
    setIsLoadingStats(true);
    setIsLoadingUsers(true);
    setNotification(null);

    try {
      const [statsData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(query),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Ошибка загрузки данных панели администратора',
      });
    } finally {
      setIsLoadingStats(false);
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData(searchQuery);
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedUserForPro) {
          setSelectedUserForPro(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedUserForPro, onClose]);

  // Handle Search Input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadData('');
  };

  // Grant PRO action
  const handleConfirmGrantPro = async () => {
    if (!selectedUserForPro) return;
    setIsSubmittingPro(true);
    try {
      const res = await grantUserPro(selectedUserForPro.id, selectedDuration);
      setNotification({
        type: 'success',
        message: `PRO-статус успешно выдан пользователю «${selectedUserForPro.name}»!`,
      });

      // Update in local users state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserForPro.id
            ? { ...u, is_pro: 1, pro_expires_at: res.user?.pro_expires_at || null }
            : u
        )
      );

      // If granting to current user, update session
      if (currentUser && currentUser.id === selectedUserForPro.id && onCurrentUserUpdated) {
        onCurrentUserUpdated({
          ...currentUser,
          is_pro: true,
          pro_expires_at: res.user?.pro_expires_at || null,
        });
      }

      // Refresh stats
      fetchAdminStats().then(setStats).catch(() => {});
      setSelectedUserForPro(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Не удалось выдать PRO-статус',
      });
    } finally {
      setIsSubmittingPro(false);
    }
  };

  // Revoke PRO action
  const handleRevokePro = async (user: AdminUser) => {
    if (!window.confirm(`Вы уверены, что хотите отозвать PRO статус у пользователя «${user.name}»?`)) {
      return;
    }

    setActionUserId(user.id);
    try {
      await revokeUserPro(user.id);
      setNotification({
        type: 'success',
        message: `PRO-статус пользователя «${user.name}» успешно отозван.`,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_pro: 0, pro_expires_at: null, subscription_status: 'canceled' } : u))
      );

      if (currentUser && currentUser.id === user.id && onCurrentUserUpdated) {
        onCurrentUserUpdated({
          ...currentUser,
          is_pro: false,
          pro_expires_at: null,
        });
      }

      fetchAdminStats().then(setStats).catch(() => {});
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Не удалось отозвать PRO статус',
      });
    } finally {
      setActionUserId(null);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (date.getFullYear() >= 2090) return 'Бессрочно';
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  Панель владельца проекта
                </h2>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-purple-800">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Мониторинг выручки, просмотров рекламы и управление подписками преподавателей
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(searchQuery)}
              disabled={isLoadingStats || isLoadingUsers}
              title="Обновить данные"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingStats || isLoadingUsers ? 'animate-spin text-purple-600' : ''}`}
              />
              <span className="hidden sm:inline">Обновить</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Закрыть панель"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Notification Alert */}
          {notification && (
            <div
              className={`mb-5 flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-bold ${
                notification.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Section 1: Summary Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Users */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Пользователи
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {stats ? stats.totalUsers : '—'}
                </span>
                <span className="text-xs font-semibold text-amber-600">
                  {stats ? `(${stats.proUsers} PRO)` : ''}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Всего зарегистрировано учителей
              </p>
            </div>

            {/* Card 2: Subscriptions */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50/40 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  PRO-подписки
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700">
                  <Crown className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {stats ? stats.activeSubscriptions : '—'}
                </span>
                <span className="text-xs font-medium text-emerald-700">активных</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Рекуррентные автосписания (ЮKassa)
              </p>
            </div>

            {/* Card 3: Revenue */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Выручка проекта
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Wallet className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">
                  {stats ? stats.totalRevenue.toLocaleString('ru-RU') : '0'}
                </span>
                <span className="text-sm font-bold text-slate-700">₽</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Успешно оплаченные подписки (99 ₽/мес)
              </p>
            </div>

            {/* Card 4: Ad Impressions */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50/40 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  Показы рекламы
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-100 text-purple-700">
                  <Eye className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {stats ? stats.ads.total.toLocaleString('ru-RU') : '0'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {stats
                  ? `Баннеры: ${stats.ads.bannerBottom} | Паузы: ${stats.ads.interstitial}`
                  : 'Загрузка...'}
              </p>
            </div>
          </div>

          {/* Section 2: Users Management & Search */}
          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Пользователи платформы ({users.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Управление статусами, просмотр активности и выдача PRO блогерам
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по имени или почте..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/15"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      title="Очистить"
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoadingUsers}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Найти
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Преподаватель</th>
                      <th className="px-4 py-3.5">Тариф</th>
                      <th className="px-4 py-3.5">Срок PRO</th>
                      <th className="px-4 py-3.5">Досок</th>
                      <th className="px-4 py-3.5">Реклама</th>
                      <th className="px-4 py-3.5">Автоподписка</th>
                      <th className="px-4 py-3.5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingUsers && users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-600" />
                          <span>Загрузка списка пользователей...</span>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          Пользователи не найдены
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const isProActive = Boolean(user.is_pro);
                        const isActionLoading = actionUserId === user.id;

                        return (
                          <tr key={user.id} className="transition hover:bg-slate-50/70">
                            {/* User details */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                                  {user.name ? user.name[0].toUpperCase() : 'U'}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{user.name}</span>
                                    {user.role === 'admin' && (
                                      <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-black uppercase text-purple-800">
                                        ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400">{user.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              {isProActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow-xs">
                                  <Crown className="h-2.5 w-2.5" />
                                  PRO
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  FREE
                                </span>
                              )}
                            </td>

                            {/* Pro expiration */}
                            <td className="px-4 py-3 font-medium text-slate-600">
                              {formatDate(user.pro_expires_at)}
                            </td>

                            {/* Boards Count */}
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-700">
                                {user.boards_count}
                              </span>
                            </td>

                            {/* Ad impressions */}
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-700">
                                {user.ad_impressions_count}
                              </span>
                            </td>

                            {/* Subscription status */}
                            <td className="px-4 py-3">
                              {user.subscription_status === 'active' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                  <Check className="h-3 w-3 stroke-[2.5]" />
                                  <span>Активна</span>
                                </span>
                              ) : user.subscription_status === 'canceled' ? (
                                <span className="font-medium text-slate-400">Отменена</span>
                              ) : user.subscription_status === 'past_due' ? (
                                <span className="font-medium text-rose-600">Просрочена</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserForPro(user);
                                    setSelectedDuration('1_month');
                                  }}
                                  title="Выдать PRO (для блогеров и партнеров)"
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100 active:scale-95"
                                >
                                  <UserPlus className="h-3 w-3 text-amber-700" />
                                  <span>Выдать PRO</span>
                                </button>

                                {isProActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokePro(user)}
                                    disabled={isActionLoading}
                                    title="Отозвать PRO статус"
                                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                                  >
                                    {isActionLoading ? (
                                      <LoaderCircle className="h-3 w-3 animate-spin text-rose-700" />
                                    ) : (
                                      <UserMinus className="h-3 w-3 text-rose-700" />
                                    )}
                                    <span>Забрать</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
          <span>Синхронизировано с базой данных SQLite `data.db`</span>
          <span>DOSKA коммерческий релиз • ЮKassa Recurrent</span>
        </div>
      </div>

      {/* Modal: Grant PRO duration selection */}
      {selectedUserForPro && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && !isSubmittingPro) setSelectedUserForPro(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-900">
                  <Crown className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Выдать статус PRO</h3>
                  <p className="text-xs text-slate-500">{selectedUserForPro.name} ({selectedUserForPro.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForPro(null)}
                disabled={isSubmittingPro}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-600">
              Выберите длительность доступа для блогера или учителя:
            </p>

            <div className="mt-3 space-y-2">
              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                  selectedDuration === '1_month'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="duration"
                    value="1_month"
                    checked={selectedDuration === '1_month'}
                    onChange={() => setSelectedDuration('1_month')}
                    className="accent-amber-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">1 месяц</span>
                    <p className="text-[11px] text-slate-500">+30 дней без рекламы и пауз</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Тестовый</span>
              </label>

              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                  selectedDuration === '1_year'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="duration"
                    value="1_year"
                    checked={selectedDuration === '1_year'}
                    onChange={() => setSelectedDuration('1_year')}
                    className="accent-amber-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">1 год</span>
                    <p className="text-[11px] text-slate-500">+365 дней (для блогеров и партнеров)</p>
                  </div>
                </div>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900">
                  Популярно
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                  selectedDuration === 'forever'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="duration"
                    value="forever"
                    checked={selectedDuration === 'forever'}
                    onChange={() => setSelectedDuration('forever')}
                    className="accent-amber-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Навсегда</span>
                    <p className="text-[11px] text-slate-500">Бессрочный доступ к платформе</p>
                  </div>
                </div>
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-black text-purple-900">
                  VIP
                </span>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserForPro(null)}
                disabled={isSubmittingPro}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmGrantPro}
                disabled={isSubmittingPro}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
              >
                {isSubmittingPro ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span>Выдаем PRO...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Подтвердить выдачу</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

