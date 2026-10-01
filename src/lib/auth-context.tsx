import { startTransition, useEffect, type ReactNode } from "react";
import { useRecoilState } from "recoil";
import {
  clearAuthTokens,
  getCurrentUser,
  hasAuthTokens,
  loginUser,
  logoutUser,
  registerUser,
} from "./api";
import { AuthContext, authStateAtom } from "./auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, status }, setAuthState] = useRecoilState(authStateAtom);

  useEffect(() => {
    if (!hasAuthTokens()) {
      startTransition(() => {
        setAuthState({ user: null, status: "anonymous" });
      });
      return;
    }
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setAuthState({ user: currentUser, status: "authenticated" });
      })
      .catch(() => {
        if (!active) return;
        clearAuthTokens();
        setAuthState({ user: null, status: "anonymous" });
      });

    return () => {
      active = false;
    };
  }, [setAuthState]);

  async function login(email: string, password: string) {
    const currentUser = await loginUser(email, password);
    setAuthState({ user: currentUser, status: "authenticated" });
  }

  async function register(data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) {
    const currentUser = await registerUser(data);
    setAuthState({ user: currentUser, status: "authenticated" });
  }

  async function logout() {
    try {
      await logoutUser();
    } catch {
      clearAuthTokens();
    } finally {
      setAuthState({ user: null, status: "anonymous" });
    }
  }

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
