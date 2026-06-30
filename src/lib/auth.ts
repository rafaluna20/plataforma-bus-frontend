"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const ACCESS_TOKEN_KEY = "transporte_access_token";
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

// ─── Token Management ─────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── User Management ──────────────────────────────────────────────────────────

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

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Iniciar sesión con email y contraseña.
 * Almacena el access token en localStorage y el refresh token en cookie HttpOnly (automático).
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Necesario para recibir la cookie HttpOnly del refresh token
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error al iniciar sesión");
  }

  setAccessToken(data.accessToken);
  setCurrentUser(data.user);

  // ─── Establecer cookie session_role para que el middleware Next.js pueda
  // leer el rol del usuario y proteger rutas server-side.
  // La cookie NO es HttpOnly para que el middleware pueda leerla.
  // El token JWT real (seguro) sigue en localStorage.
  if (typeof document !== "undefined") {
    document.cookie = `session_role=${data.user.role}; path=/; SameSite=Lax; max-age=86400`;
  }

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

  setAccessToken(data.accessToken);
  setCurrentUser(data.user);

  // Establecer cookie session_role al registrarse (igual que en login)
  if (typeof document !== "undefined") {
    document.cookie = `session_role=${data.user.role}; path=/; SameSite=Lax; max-age=86400`;
  }

  return data.user;
}

/**
 * Cerrar sesión. Revoca el refresh token en el servidor.
 */
export async function logout(): Promise<void> {
  const token = getAccessToken();
  if (token) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
    } catch {
      // Ignorar errores de red al hacer logout
    }
  }
  clearTokens();
  // Limpiar la cookie session_role al cerrar sesión
  if (typeof document !== "undefined") {
    document.cookie = "session_role=; path=/; max-age=0";
  }
}

/**
 * Renovar el access token usando el refresh token (cookie HttpOnly).
 * Llamar automáticamente cuando el access token expire (401).
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include", // Envía la cookie HttpOnly automáticamente
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    setCurrentUser(data.user);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Obtener el perfil actualizado del usuario desde el servidor.
 */
export async function fetchProfile(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) return null;

  const user = await res.json();
  setCurrentUser(user);
  return user;
}

/**
 * Función helper para hacer fetch autenticado con renovación automática de token.
 * Usar en lugar de fetch() directo para endpoints protegidos.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getAccessToken();

  const makeRequest = (t: string | null) =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });

  let res = await makeRequest(token);

  // Si el token expiró (401), intentar renovarlo una vez
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
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
