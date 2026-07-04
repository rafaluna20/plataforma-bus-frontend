import { apiGet, apiPost } from "./client";

export function getVehiclesByCompany<T = any>(companyId: string) {
  return apiGet<T>(`/api/v1/vehicles/company/${companyId}`, "Error al cargar los vehículos");
}

export function createVehicle<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/vehicles`, body, "Error al registrar vehículo");
}
