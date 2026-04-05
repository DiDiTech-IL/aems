import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JwtPayload } from '@aems/shared-types';

interface AuthState {
  token: string | null;
  user: JwtPayload | null;
  setAuth: (token: string, user: JwtPayload) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: 'aems-auth' },
  ),
);
