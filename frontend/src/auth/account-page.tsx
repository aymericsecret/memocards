import { ArrowLeft, BookOpen, LogOut, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { Button, Field } from "../design-system";
import { api } from "../shared/api";
import { navigate } from "../shared/navigation";
import { useAuth } from "./auth-context";
import type { AuthUser } from "./types";

export function AccountPage() {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState(auth.user?.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      const result = await api<{ user: AuthUser }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim() || null
        })
      });
      auth.updateUser(result.user);
      setProfileMessage("Profil mis a jour");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Impossible de mettre a jour");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setIsSavingPassword(true);

    try {
      await api<{ ok: boolean }>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Mot de passe mis a jour");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Impossible de mettre a jour");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <BookOpen size={16} />
            </div>
            <h1>Memora</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Retour">
            <ArrowLeft size={18} />
          </Button>
        </div>
      </header>

      <Main className="container">
        <Heading>
          <h2>Compte</h2>
          <p>{auth.user?.email}</p>
        </Heading>

        <Grid>
          <Panel onSubmit={saveProfile}>
            <div>
              <h3>Profil</h3>
              <p>Nom affiche dans l'application.</p>
            </div>
            <Field label="Nom">
              <input
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </Field>
            {profileError && <ErrorMessage>{profileError}</ErrorMessage>}
            {profileMessage && <SuccessMessage>{profileMessage}</SuccessMessage>}
            <Button disabled={isSavingProfile} type="submit">
              <Save size={15} /> Enregistrer
            </Button>
          </Panel>

          <Panel onSubmit={savePassword}>
            <div>
              <h3>Mot de passe</h3>
              <p>Utilisez au moins 8 caracteres.</p>
            </div>
            <Field label="Mot de passe actuel">
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </Field>
            <Field label="Nouveau mot de passe">
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </Field>
            {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
            {passwordMessage && <SuccessMessage>{passwordMessage}</SuccessMessage>}
            <Button disabled={isSavingPassword} type="submit">
              <Save size={15} /> Mettre a jour
            </Button>
          </Panel>
        </Grid>

        <Button variant="outline" onClick={auth.logout}>
          <LogOut size={15} /> Se deconnecter
        </Button>
      </Main>
    </div>
  );
}

const Main = styled.main`
  display: grid;
  gap: 24px;
  padding: 40px 0;
`;

const Heading = styled.div`
  display: grid;
  gap: 6px;

  h2 {
    margin: 0;
    font-size: clamp(2.2rem, 7vw, 4rem);
    line-height: 0.95;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.mutedForeground};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.form`
  display: grid;
  align-content: start;
  gap: 16px;
  border: 1px solid hsl(220 13% 91% / 0.7);
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 20px;
  background: ${({ theme }) => theme.colors.card};

  h3 {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.mutedForeground};
    font-size: 0.86rem;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 16px;
  }
`;

const ErrorMessage = styled.p`
  margin: -2px 0 0;
  border-radius: calc(${({ theme }) => theme.radii.md} - 4px);
  padding: 10px 12px;
  color: ${({ theme }) => theme.colors.destructive};
  background: hsl(0 75% 55% / 0.08);
  font-size: 0.82rem;
`;

const SuccessMessage = styled.p`
  margin: -2px 0 0;
  border-radius: calc(${({ theme }) => theme.radii.md} - 4px);
  padding: 10px 12px;
  color: ${({ theme }) => theme.colors.accent};
  background: hsl(150 55% 40% / 0.08);
  font-size: 0.82rem;
`;
