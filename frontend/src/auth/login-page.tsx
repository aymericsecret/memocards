import { BookOpen } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Field } from "../design-system";
import { api } from "../shared/api";
import type { AuthResponse } from "./types";

export function LoginPage({ onAuthenticated }: { onAuthenticated: (session: AuthResponse) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await api<AuthResponse>(
        mode === "login" ? "/auth/login" : "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            ...(mode === "register" ? { displayName } : {})
          })
        }
      );
      onAuthenticated(session);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible de se connecter");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="brand-icon">
            <BookOpen size={16} />
          </div>
          <div>
            <h1>Memora</h1>
            <p>{mode === "login" ? "Connexion" : "Creer un compte"}</p>
          </div>
        </div>

        {mode === "register" && (
          <Field label="Nom">
            <input
              autoComplete="name"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Aymeric"
              value={displayName}
            />
          </Field>
        )}

        <Field label="Email">
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </Field>

        <Field label="Mot de passe">
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8 caracteres minimum"
            required
            type="password"
            value={password}
          />
        </Field>

        {error && <p className="auth-error">{error}</p>}

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting
            ? "Chargement..."
            : mode === "login"
              ? "Se connecter"
              : "Creer le compte"}
        </Button>

        <button
          className="auth-switch"
          onClick={() => {
            setError(null);
            setMode((currentMode) => (currentMode === "login" ? "register" : "login"));
          }}
          type="button"
        >
          {mode === "login"
            ? "Pas encore de compte ? Creer un compte"
            : "Deja un compte ? Se connecter"}
        </button>
      </form>
    </div>
  );
}
