/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bsx_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // First try real backend
      let result;
      try {
        const { data } = await authAPI.login({ email, password });
        result = data;
      } catch (backendErr) {
        // If network error (backend down), switch to demo mode automatically
        if (!backendErr.response) {
          localStorage.setItem('bsx_demo', 'true');
          const { data } = await authAPI.login({ email, password });
          result = data;
        } else {
          throw backendErr;
        }
      }
      localStorage.setItem('bsx_token', result.token);
      localStorage.setItem('bsx_user', JSON.stringify(result.user));
      setUser(result.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid email or password.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {
      // Ignore logout API failures
    }
    localStorage.removeItem('bsx_token');
    localStorage.removeItem('bsx_user');
    localStorage.removeItem('bsx_demo');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback((...roles) => roles.includes(user?.role), [user]);
  const canEdit = useCallback(() => user?.role !== 'staff', [user]);
  const isAdmin = useCallback(() => user?.role === 'admin', [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasRole, canEdit, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
