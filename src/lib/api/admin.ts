import { apiGet, apiPost, apiPatch } from "./client";

export function getUsers<T = any>(params: { companyId?: string; role?: string; limit?: number }) {
  const query = new URLSearchParams({
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.role ? { role: params.role } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  }).toString();
  return apiGet<T>(`/api/v1/admin/users?${query}`, "Error al cargar usuarios");
}

export function createSeller<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/admin/users/seller`, body, "Error al crear vendedor");
}

export function createDriver<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/admin/users/driver`, body, "Error al crear conductor");
}

export function createAdmin<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/admin/users/admin`, body, "Error al crear ADMIN");
}

export function toggleUser<T = any>(userId: string, isActive: boolean) {
  return apiPatch<T>(`/api/v1/admin/users/${userId}/toggle`, { isActive }, "Error al cambiar estado");
}

/** Activa/desactiva un usuario usando los endpoints dedicados (distintos del /toggle genérico). */
export function setUserActive<T = any>(userId: string, active: boolean) {
  const endpoint = active ? "activate" : "deactivate";
  return apiPatch<T>(`/api/v1/admin/users/${userId}/${endpoint}`, undefined, "Error al cambiar estado");
}

export function changeUserRole<T = any>(userId: string, body: { role: string; companyId?: string }) {
  return apiPatch<T>(`/api/v1/admin/users/${userId}/role`, body, "Error al cambiar rol");
}

export function getAdminStats<T = any>() {
  return apiGet<T>(`/api/v1/admin/stats`, "Error al cargar estadísticas");
}
