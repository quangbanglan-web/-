export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_pro: boolean;
  pro_expires_at: string | null;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthErrorResponse {
  error: string;
}
