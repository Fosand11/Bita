import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, clearToken, getToken, setToken } from '../lib/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      console.log('[AUTH DEBUG] boot token present?', Boolean(token), token ? token.slice(0, 12) + '…' : null);
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.get<AuthUser>('/me');
        console.log('[AUTH DEBUG] /me succeeded', me);
        setUser(me);
      } catch (err) {
        console.log('[AUTH DEBUG] /me failed, clearing token', err);
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    await setToken(response.token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/register', { name, email, password });
    await setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Si el token ya expiró del lado del servidor, igual limpiamos localmente.
    }
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un <AuthProvider>');
  }
  return context;
}

export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
