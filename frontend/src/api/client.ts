import axios from 'axios';
import type { AxiosError } from 'axios';

/**
 * In production (Vercel): VITE_API_URL=https://your-app.up.railway.app
 * In development:         VITE_API_URL is unset → Vite proxy forwards /api to localhost:5000
 */
export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Access token lives only in memory — never written to localStorage
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach current access token to every outgoing request
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// Queue of requests that arrived while a token refresh was in flight
let isRefreshing = false;
let waitQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function flushQueue(error: unknown, token: string | null) {
  waitQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!),
  );
  waitQueue = [];
}

type RetryConfig = typeof api.defaults & { _retry?: boolean };

// Silently refresh the access token on 401, then replay the failed request
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    // Concurrent 401s: queue them and wait for the single refresh to finish
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers!['Authorization'] = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      // Use bare axios (no interceptor) to avoid circular refresh loops
      const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = data.data;

      setAccessToken(newAccess);
      localStorage.setItem('refreshToken', newRefresh);

      flushQueue(null, newAccess);
      original.headers!['Authorization'] = `Bearer ${newAccess}`;
      return api(original);
    } catch (err) {
      flushQueue(err, null);
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
