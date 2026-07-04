import { apiGetPublic, apiPatch } from "./client";

export function getTripDetail<T = any>(tripId: string) {
  return apiGetPublic<T>(`/api/v1/trips/${tripId}`, "Viaje no encontrado");
}

export function getTripManifest<T = any>(tripId: string) {
  return apiGetPublic<T>(`/api/v1/trips/${tripId}/manifest`, "Error al cargar pasajeros");
}

/** Avanza el estado del viaje (SCHEDULED→BOARDING→IN_TRANSIT→COMPLETED). Requiere sesión. */
export function updateTripStatus<T = any>(tripId: string, status: string) {
  return apiPatch<T>(`/api/v1/management/trips/${tripId}/status`, { status }, "No se pudo actualizar el estado del viaje");
}
