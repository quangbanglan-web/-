import { authFetch } from './auth';
import { AdminStats, AdminUser, ProDuration } from '../types/admin';

export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await authFetch('/api/admin/stats');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось загрузить статистику администратора');
  }
  return data;
}

export async function fetchAdminUsers(search: string = ''): Promise<AdminUser[]> {
  const query = search ? `?search=${encodeURIComponent(search.trim())}` : '';
  const response = await authFetch(`/api/admin/users${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось загрузить список пользователей');
  }
  return data.users || [];
}

export async function grantUserPro(userId: string, duration: ProDuration = '1_month'): Promise<{ ok: boolean; user: any }> {
  const response = await authFetch(`/api/admin/users/${encodeURIComponent(userId)}/grant-pro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ duration }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось выдать PRO статус');
  }
  return data;
}

export async function revokeUserPro(userId: string): Promise<{ ok: boolean }> {
  const response = await authFetch(`/api/admin/users/${encodeURIComponent(userId)}/revoke-pro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось отозвать PRO статус');
  }
  return data;
}
