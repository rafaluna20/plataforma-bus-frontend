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

export function toggleUser<T = any>(userId: string, isActive: boolean) {
  return apiPatch<T>(`/api/v1/admin/users/${userId}/toggle`, { isActive }, "Error al cambiar estado");
}
