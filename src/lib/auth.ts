import { createContext, useContext } from "react";
import { atom } from "recoil";
import type { AuthUser } from "./api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
}

export const authStateAtom = atom<AuthState>({
  key: "authState",
  default: { user: null, status: "loading" },
});

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
