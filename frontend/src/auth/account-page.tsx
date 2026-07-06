import { ArrowLeft, BookOpen, LogOut, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
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

      <main className="container account-main">
        <div className="account-heading">
          <h2>Compte</h2>
          <p>{auth.user?.email}</p>
        </div>

        <div className="account-grid">
          <form className="account-panel" onSubmit={saveProfile}>
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
            {profileError && <p className="auth-error">{profileError}</p>}
            {profileMessage && <p className="account-success">{profileMessage}</p>}
            <Button disabled={isSavingProfile} type="submit">
              <Save size={15} /> Enregistrer
            </Button>
          </form>

          <form className="account-panel" onSubmit={savePassword}>
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
            {passwordError && <p className="auth-error">{passwordError}</p>}
            {passwordMessage && <p className="account-success">{passwordMessage}</p>}
            <Button disabled={isSavingPassword} type="submit">
              <Save size={15} /> Mettre a jour
            </Button>
          </form>
        </div>

        <Button variant="outline" onClick={auth.logout}>
          <LogOut size={15} /> Se deconnecter
        </Button>
      </main>
    </div>
  );
}
