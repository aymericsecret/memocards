import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { queryClient } from "../shared/query-client";
import {
  clearAuthSession,
  getAuthToken,
  getStoredAuthUser,
  storeAuthSession
} from "./auth-storage";
import type { AuthResponse, AuthUser } from "./types";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (session: AuthResponse) => void;
  logout: () => void;
  token: string | null;
  updateUser: (user: AuthUser) => void;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token),
      login: (session) => {
        storeAuthSession(session.token, session.user);
        setToken(session.token);
        setUser(session.user);
      },
      logout: () => {
        clearAuthSession();
        queryClient.clear();
        setToken(null);
        setUser(null);
        window.history.pushState(null, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
      token,
      updateUser: (nextUser) => {
        if (!token) return;
        storeAuthSession(token, nextUser);
        setUser(nextUser);
      },
      user
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
