import { BookOpen } from "lucide-react";
import { useState, type FormEvent } from "react";
import styled from "styled-components";
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
    <Page>
      <Card onSubmit={submit}>
        <Brand>
          <BrandIcon>
            <BookOpen size={16} />
          </BrandIcon>
          <div>
            <h1>Memora</h1>
            <p>{mode === "login" ? "Connexion" : "Creer un compte"}</p>
          </div>
        </Brand>

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

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting
            ? "Chargement..."
            : mode === "login"
              ? "Se connecter"
              : "Creer le compte"}
        </Button>

        <SwitchButton
          onClick={() => {
            setError(null);
            setMode((currentMode) => (currentMode === "login" ? "register" : "login"));
          }}
          type="button"
        >
          {mode === "login"
            ? "Pas encore de compte ? Creer un compte"
            : "Deja un compte ? Se connecter"}
        </SwitchButton>
      </Card>
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.background};
`;

const Card = styled.form`
  width: min(100%, 420px);
  display: grid;
  gap: 18px;
  padding: 28px;
  border: 1px solid hsl(220 13% 91% / 0.7);
  border-radius: 1.25rem;
  background: ${({ theme }) => theme.colors.card};
  box-shadow: 0 24px 70px -32px hsl(220 15% 22% / 0.22);
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;

  h1 {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.mutedForeground};
    font-size: 0.85rem;
  }
`;

const BrandIcon = styled.div`
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.accentForeground};
  background: ${({ theme }) => theme.colors.accent};
  box-shadow: 0 4px 14px hsl(150 55% 40% / 0.16);
`;

const ErrorMessage = styled.p`
  margin: -2px 0 0;
  border-radius: calc(${({ theme }) => theme.radii.md} - 4px);
  padding: 10px 12px;
  color: ${({ theme }) => theme.colors.destructive};
  background: hsl(0 75% 55% / 0.08);
  font-size: 0.82rem;
`;

const SwitchButton = styled.button`
  border: 0;
  padding: 0;
  color: ${({ theme }) => theme.colors.mutedForeground};
  background: transparent;
  font-size: 0.85rem;

  &:hover {
    color: ${({ theme }) => theme.colors.foreground};
  }
`;
