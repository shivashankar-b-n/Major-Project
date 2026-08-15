import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, setToken, getToken } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) { setLoading(false); return; }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (body) => {
    const { token, user: u } = await authApi.login(body);
    setToken(token);
    setUser(u);
    return u;
  };

  const register = async (body) => {
    const { token, user: u } = await authApi.register(body);
    setToken(token);
    setUser(u);
    return u;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const homePathForRole = (role) =>
  role === 'admin' ? '/admin' : role === 'officer' ? '/officer' : '/app';
