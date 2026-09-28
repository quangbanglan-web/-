import { authFetch } from './auth';

export type AdType = 'banner_bottom' | 'interstitial_board_open';

export async function logAdImpression(adType: AdType): Promise<boolean> {
  try {
    const response = await authFetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_type: adType }),
    });
    return response.ok;
  } catch (error) {
    console.warn('Failed to log ad impression:', error);
    return false;
  }
}

export async function requestUpgradeToPro(): Promise<any> {
  const response = await authFetch('/api/auth/upgrade-pro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Ошибка при оформлении подписки');
  }

  return response.json();
}
