import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { api, setAccessToken } from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const stored = localStorage.getItem('refreshToken');
    if (!stored) {
      setIsLoading(false);
      return;
    }
    try {
      // Use bare axios to avoid the interceptor triggering another refresh
      const { data: refreshData } = await axios.post('/api/auth/refresh', {
        refreshToken: stored,
      });
      setAccessToken(refreshData.data.accessToken);
      localStorage.setItem('refreshToken', refreshData.data.refreshToken);

      const { data: meData } = await api.get<{ data: { user: User } }>('/auth/me');
      setUser(meData.data.user);
    } catch {
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  async function login(email: string, password: string) {
    const { data } = await api.post<{
      data: { user: User; accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password });

    setAccessToken(data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await api.post<{
      data: { user: User; accessToken: string; refreshToken: string };
    }>('/auth/register', { name, email, password });

    setAccessToken(data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
