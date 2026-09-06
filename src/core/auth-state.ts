import { events } from './event-bus';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt?: string;
  stats?: {
    totalImages: number;
    totalBytes: number;
  };
}

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '') + '/api/auth';
const TOKEN_KEY = 'clearbg_auth_token';
const USER_KEY = 'clearbg_user_profile';

class AuthManager {
  private user: UserProfile | null = null;
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch {
        this.user = null;
      }
    }

    if (this.token) {
      this.refreshUserProfile();
    }
  }

  public isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  public getUser(): UserProfile | null {
    return this.user;
  }

  public getToken(): string | null {
    return this.token;
  }

  public async refreshUserProfile(): Promise<void> {
    if (!this.token) return;
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.user = data.user;
          localStorage.setItem(USER_KEY, JSON.stringify(this.user));
          events.emit('auth:updated', this.user);
        }
      } else if (res.status === 401) {
        this.logout();
      }
    } catch {
      // Offline fallback: keep cached profile
    }
  }

  public async sendOtp(email: string, type: 'signup' | 'login' | 'reset_password'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to send verification code');
    }
    return data;
  }

  public async verifyOtp(email: string, otpCode: string, type: 'signup' | 'login' | 'reset_password'): Promise<boolean> {
    const res = await fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode, type }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Invalid verification code');
    }
    return true;
  }

  public async signup(email: string, name: string, password: string, otpCode?: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password, otpCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Signup failed');
    }

    this.setSession(data.token, data.user);
    return data.user;
  }

  public async login(email: string, password?: string, otpCode?: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otpCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    this.setSession(data.token, data.user);
    return data.user;
  }

  public async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Could not send reset code');
    }
    return data;
  }

  public async resetPassword(email: string, otpCode: string, newPassword: string): Promise<string> {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Password reset failed');
    }
    return data.message;
  }

  public logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    events.emit('auth:logout', null);
  }

  private setSession(token: string, user: UserProfile): void {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    events.emit('auth:login', user);
  }
}

export const authState = new AuthManager();
