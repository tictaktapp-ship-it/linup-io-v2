const API = import.meta.env.VITE_API_URL as string;

export function getToken(): string | null {
  return localStorage.getItem('linup_token');
}

export function clearAuth() {
  localStorage.removeItem('linup_token');
  localStorage.removeItem('linup_authed');
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    // Only set Content-Type if there is a body — DELETE/GET requests must not send it
    ...(options.body !== undefined && options.body !== null ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(API + path, { ...options, headers, credentials: 'include' });
}