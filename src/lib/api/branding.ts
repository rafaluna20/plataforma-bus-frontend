import { apiGetPublic } from "./client";

export function getCompanyBySlug<T = any>(slug: string) {
  return apiGetPublic<T>(`/api/v1/branding/slug/${slug}`, "Empresa no encontrada");
}

export function getCompanyById<T = any>(id: string) {
  return apiGetPublic<T>(`/api/v1/branding/id/${id}`, "Empresa no encontrada");
}
