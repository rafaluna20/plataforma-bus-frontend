import { apiGet } from "./client";

export function getCompanies<T = any>() {
  return apiGet<T>(`/api/v1/companies`, "Error al cargar empresas");
}
