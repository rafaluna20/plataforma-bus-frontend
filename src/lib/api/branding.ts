import { apiGetPublic, apiGet, apiPatch } from "./client";

export function getCompanyBySlug<T = any>(slug: string) {
  return apiGetPublic<T>(`/api/v1/branding/slug/${slug}`, "Empresa no encontrada");
}

export function getCompanyById<T = any>(id: string) {
  return apiGetPublic<T>(`/api/v1/branding/id/${id}`, "Empresa no encontrada");
}

/** Empresa del usuario autenticado (ADMIN/AGENCY_SELLER/DRIVER de esa empresa). */
export function getMyBranding<T = any>() {
  return apiGet<T>(`/api/v1/branding/me`, "Error al cargar la empresa");
}

/** Actualiza el branding de la empresa del usuario autenticado (solo ADMIN/SUPER_ADMIN). */
export function updateMyBranding<T = any>(body: unknown) {
  return apiPatch<T>(`/api/v1/branding/me`, body, "Error al guardar");
}
