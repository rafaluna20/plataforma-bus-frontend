"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const USER_KEY = "transporte_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "DRIVER" | "PASSENGER" | "AGENCY_SELLER";
  balance: number;
  companyId?: string;
  station?: { id: string; name: string; city: string } | null;
}

// ─── User Management ──────────────────────────────────────────────────────────
// El access token vive SOLO en una cookie httpOnly que pone el backend — nunca
// en localStorage ni en JS — para que un script inyectado (XSS) no pueda
// leerlo. Aquí solo cacheamos el perfil del usuario (no es secreto) para
// pintar la UI sin esperar una llamada de red en cada render.

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearCurrentUser(): void {
  localStorage.removeItem(USER_KEY);
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Iniciar sesión con email y contraseña.
 * El access token y el refresh token quedan en cookies httpOnly (el backend
 * las pone via Set-Cookie); acá solo guardamos el perfil para la UI.
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error al iniciar sesión");
  }

  setCurrentUser(data.user);
  return data.user;
}

/**
 * Registrar un nuevo usuario.
 */
export async function register(
  name: string,
  email: string,
  password: string,
  extras?: { docType?: string; docNum?: string; phone?: string }
): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password, ...extras }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error al registrar cuenta");
  }

  setCurrentUser(data.user);
  return data.user;
}

/**
 * Cerrar sesión. Revoca el refresh token y limpia las cookies en el servidor.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignorar errores de red al hacer logout
  }
  clearCurrentUser();
}

/**
 * Renovar el access token usando el refresh token (cookie httpOnly).
 * El backend responde con un nuevo Set-Cookie; no hay token que devolver al
 * llamador, solo si la renovación fue exitosa o no.
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      clearCurrentUser();
      return false;
    }

    const data = await res.json();
    setCurrentUser(data.user);
    return true;
  } catch {
    clearCurrentUser();
    return false;
  }
}

/**
 * Obtener el perfil actualizado del usuario desde el servidor.
 */
export async function fetchProfile(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) return null;

  const user = await res.json();
  setCurrentUser(user);
  return user;
}

/**
 * Función helper para hacer fetch autenticado con renovación automática de
 * sesión. Usar en lugar de fetch() directo para endpoints protegidos. La
 * cookie httpOnly access_token viaja sola con credentials:"include"; no hay
 * ningún token que adjuntar desde JS.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const makeRequest = () =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

  let res = await makeRequest();

  // Si la sesión expiró (401), intentar renovarla una vez
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await makeRequest();
    }
  }

  return res;
}

/**
 * Actualizar saldo local del usuario (para reflejar cambios sin llamar al servidor)
 */
export function updateLocalBalance(delta: number): void {
  const user = getCurrentUser();
  if (!user) return;
  user.balance = Math.max(0, user.balance + delta);
  setCurrentUser(user);
}
