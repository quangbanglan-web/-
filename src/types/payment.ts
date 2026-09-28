export interface SubscriptionInfo {
  id: string;
  status: 'active' | 'canceled' | 'past_due';
  next_billing_date: string | null;
  payment_method_id: string | null;
  created_at: string;
}

export interface CreateSubscriptionResponse {
  confirmation_url: string;
  payment_id: string;
  is_sandbox?: boolean;
}

