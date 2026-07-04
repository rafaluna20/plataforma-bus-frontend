import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

export function getVehiclesByCompany<T = any>(companyId: string) {
  return apiGet<T>(`/api/v1/vehicles/company/${companyId}`, "Error al cargar los vehículos");
}

export function createVehicle<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/vehicles`, body, "Error al registrar vehículo");
}

export function updateVehicle<T = any>(vehicleId: string, body: unknown) {
  return apiPatch<T>(`/api/v1/vehicles/${vehicleId}`, body, "Error al actualizar vehículo");
}

export function deleteVehicle<T = any>(vehicleId: string) {
  return apiDelete<T>(`/api/v1/vehicles/${vehicleId}`, "Error al eliminar vehículo");
}
