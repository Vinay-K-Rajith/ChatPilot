export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  
  const auth = localStorage.getItem("auth") === "true";
  const token = localStorage.getItem("token");
  return auth && !!token;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function validateSession(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch('/api/auth/session', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return response.ok && data.valid;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

export function logout(): void {
  localStorage.removeItem("auth");
  localStorage.removeItem("token");
  window.location.href = "/login";
}