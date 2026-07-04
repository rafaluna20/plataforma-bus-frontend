import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Error tipado que preserva el status HTTP y el body ya parseado, para que
 * los call sites puedan seguir haciendo `catch (e: any) { setError(e.message) }`
 * sin cambios, o inspeccionar `e.status`/`e.body` cuando lo necesiten.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseJsonSafely(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || fallbackMessage, res.status, data);
  }
  return data as T;
}

function resolveUrl(path: string): string {
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

/** GET público (sin token) — para endpoints que no requieren sesión (búsqueda, branding, detalle de viaje). */
export async function apiGetPublic<T>(path: string, fallbackMessage = "Error al obtener datos"): Promise<T> {
  const res = await fetch(resolveUrl(path));
  return handleResponse<T>(res, fallbackMessage);
}

/** GET autenticado — agrega el Bearer token y renueva la sesión automáticamente si expiró (ver authFetch). */
export async function apiGet<T>(path: string, fallbackMessage = "Error al obtener datos"): Promise<T> {
  const res = await authFetch(resolveUrl(path));
  return handleResponse<T>(res, fallbackMessage);
}

/** POST autenticado. */
export async function apiPost<T>(path: string, body?: unknown, fallbackMessage = "Error al crear el recurso"): Promise<T> {
  const res = await authFetch(resolveUrl(path), {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, fallbackMessage);
}

/** PATCH autenticado. */
export async function apiPatch<T>(path: string, body?: unknown, fallbackMessage = "Error al actualizar el recurso"): Promise<T> {
  const res = await authFetch(resolveUrl(path), {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, fallbackMessage);
}

/** DELETE autenticado. */
export async function apiDelete<T>(path: string, fallbackMessage = "Error al eliminar el recurso"): Promise<T> {
  const res = await authFetch(resolveUrl(path), { method: "DELETE" });
  return handleResponse<T>(res, fallbackMessage);
}
