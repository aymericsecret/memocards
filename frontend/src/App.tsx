import { useEffect, useState } from "react";
import { DeckPage } from "./deck/deck-page";
import { DecksPage } from "./deck/decks-page";
import { ReviewPage } from "./review/review-page";
import "./App.css";
import { routeFromLocation, type Route } from "./shared/navigation";

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (route.name === "deck") return <DeckPage deckId={route.deckId} />;
  if (route.name === "reviewType") {
    return <ReviewPage reviewTypeId={route.reviewTypeId} />;
  }

  return <DecksPage />;
}
