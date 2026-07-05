export interface AuthUser {
  displayName: string | null;
  email: string;
  id: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
