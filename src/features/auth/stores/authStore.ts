import type { AuthState } from "@/models/auth";
import { create } from "zustand";

export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "anonymous",
    }),
}));
