export interface AdminStats {
  totalUsers: number;
  proUsers: number;
  totalBoards: number;
  totalRevenue: number;
  activeSubscriptions: number;
  ads: {
    total: number;
    bannerBottom: number;
    interstitial: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_pro: number | boolean;
  pro_expires_at: string | null;
  created_at: string;
  boards_count: number;
  ad_impressions_count: number;
  subscription_status: 'active' | 'canceled' | 'past_due' | null;
}

export type ProDuration = '1_month' | '1_year' | 'forever';
