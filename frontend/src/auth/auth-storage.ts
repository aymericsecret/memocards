import type { AuthUser } from "./types";

const tokenKey = "memocards.authToken";
const userKey = "memocards.authUser";

export function getAuthToken() {
  return window.localStorage.getItem(tokenKey);
}

export function getStoredAuthUser() {
  const rawUser = window.localStorage.getItem(userKey);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuthSession(token: string, user: AuthUser) {
  window.localStorage.setItem(tokenKey, token);
  window.localStorage.setItem(userKey, JSON.stringify(user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(userKey);
}
