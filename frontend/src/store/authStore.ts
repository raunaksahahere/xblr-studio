import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try loading from localStorage on startup
  const savedUser = localStorage.getItem('xbrl_user');
  const savedAccess = localStorage.getItem('xbrl_access');
  const savedRefresh = localStorage.getItem('xbrl_refresh');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    accessToken: savedAccess || null,
    refreshToken: savedRefresh || null,
    isAuthenticated: !!savedAccess,
    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem('xbrl_user', JSON.stringify(user));
      localStorage.setItem('xbrl_access', accessToken);
      localStorage.setItem('xbrl_refresh', refreshToken);
      set({ user, accessToken, refreshToken, isAuthenticated: true });
    },
    updateAccessToken: (accessToken) => {
      localStorage.setItem('xbrl_access', accessToken);
      set({ accessToken });
    },
    logout: () => {
      localStorage.removeItem('xbrl_user');
      localStorage.removeItem('xbrl_access');
      localStorage.removeItem('xbrl_refresh');
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    },
  };
});
