import { create } from "zustand";
import type { AuthState } from "@/models/auth";

export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "anonymous",
    }),
}));
