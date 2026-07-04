import { useEffect, useState } from "react";
import { DeckPage } from "./deck/deck-page";
import { DecksPage } from "./deck/decks-page";
import "./App.css";
import { routeFromLocation, type Route } from "./shared/navigation";

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return route.name === "deck" ? (
    <DeckPage deckId={route.deckId} />
  ) : (
    <DecksPage />
  );
}
