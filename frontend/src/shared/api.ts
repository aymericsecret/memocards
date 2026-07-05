function resolveApiUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://127.0.0.1:8000/api";
  }

  throw new Error("Missing frontend environment variable: VITE_API_URL");
}

const API_URL = resolveApiUrl();

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}
