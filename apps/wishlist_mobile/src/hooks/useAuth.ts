import {useState, useEffect, useCallback} from 'react';
import {getStoredToken, getMe, logout as apiLogout} from '../api/auth';
import type {User} from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await getMe();
      setUser(me);
    } catch (e) {
      console.error('useAuth: failed to load user', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return {user, loading, setUser, logout, reload: loadUser};
}
