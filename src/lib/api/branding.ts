import { apiGetPublic, apiGet } from "./client";

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
