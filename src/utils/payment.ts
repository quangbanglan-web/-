import { authFetch } from './auth';
import { CreateSubscriptionResponse, SubscriptionInfo } from '../types/payment';

export async function createSubscriptionPayment(): Promise<CreateSubscriptionResponse> {
  const response = await authFetch('/api/payments/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось создать платеж');
  }

  return data;
}

export async function fetchMySubscription(): Promise<SubscriptionInfo | null> {
  try {
    const response = await authFetch('/api/subscriptions/my');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.subscription || null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

export async function cancelSubscription(): Promise<{ ok: boolean; canceledCount?: number }> {
  const response = await authFetch('/api/subscriptions/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось отменить подписку');
  }

  return data;
}

export async function confirmSandboxPayment(paymentId: string, userId?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'payment.succeeded',
        object: {
          id: paymentId,
          status: 'succeeded',
          amount: { value: '99.00', currency: 'RUB' },
          metadata: { user_id: userId },
          payment_method: {
            id: 'mock_pm_' + Math.random().toString(36).substring(2, 9),
            saved: true,
          },
        },
      }),
    });

    const data = await response.json();
    return response.ok && data.ok === true;
  } catch (error) {
    console.error('Error confirming sandbox payment:', error);
    return false;
  }
}
