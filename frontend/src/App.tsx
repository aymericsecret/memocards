import { useEffect, useState } from "react";
import { LoginPage } from "./auth/login-page";
import { useAuth } from "./auth/auth-context";
import { DeckPage } from "./deck/deck-page";
import { DecksPage } from "./deck/decks-page";
import { ReviewPage } from "./review/review-page";
import "./App.css";
import { routeFromLocation, type Route } from "./shared/navigation";

export function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<Route>(() => routeFromLocation());

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    const onUnauthorized = () => auth.logout();
    window.addEventListener("popstate", onPopState);
    window.addEventListener("memocards:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("memocards:unauthorized", onUnauthorized);
    };
  }, [auth]);

  if (!auth.isAuthenticated) {
    return <LoginPage onAuthenticated={auth.login} />;
  }

  if (route.name === "deck") return <DeckPage deckId={route.deckId} />;
  if (route.name === "reviewType") {
    return <ReviewPage reviewTypeId={route.reviewTypeId} />;
  }

  return <DecksPage />;
}
