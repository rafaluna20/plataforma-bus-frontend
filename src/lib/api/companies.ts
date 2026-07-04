import { apiGet, apiPost } from "./client";

export function getCompanies<T = any>() {
  return apiGet<T>(`/api/v1/companies`, "Error al cargar empresas");
}

export function createCompany<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/companies`, body, "Error al crear empresa");
}
