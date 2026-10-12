import { create } from "zustand";

/**
 * Optional embedder bearer. Held in memory only: never written to storage.
 */
type SessionState = {
  token: string | undefined;
  setToken: (token: string | undefined) => void;
};

export const useSession = create<SessionState>()((set) => ({
  token: undefined,
  setToken: (token) => set({ token: token || undefined }),
}));
