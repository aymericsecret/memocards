export type Route =
  | { name: "dashboard" }
  | { name: "deck"; deckId: string };

export function routeFromLocation(): Route {
  const deckMatch = window.location.pathname.match(/^\/deck\/([^/]+)$/);
  if (deckMatch) return { name: "deck", deckId: deckMatch[1] };
  return { name: "dashboard" };
}

export function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
