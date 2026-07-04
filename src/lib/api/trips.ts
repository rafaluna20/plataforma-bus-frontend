import { apiGetPublic, apiGet, apiPatch } from "./client";

// ─── Endpoints públicos (/api/v1/trips) ────────────────────────────────────────

export function getTripDetail<T = any>(tripId: string) {
  return apiGetPublic<T>(`/api/v1/trips/${tripId}`, "Viaje no encontrado");
}

export function getTripManifest<T = any>(tripId: string) {
  return apiGetPublic<T>(`/api/v1/trips/${tripId}/manifest`, "Error al cargar pasajeros");
}

export function searchTrips<T = any>(params: { origin?: string; destination?: string; date?: string }) {
  const query = new URLSearchParams({
    origin: params.origin || "",
    destination: params.destination || "",
    date: params.date || "",
  }).toString();
  return apiGetPublic<T>(`/api/v1/trips/search?${query}`, "Error al buscar viajes");
}

// ─── Endpoints de gestión (/api/v1/management/trips) — requieren sesión ───────

export function getManagementTripDetail<T = any>(tripId: string) {
  return apiGet<T>(`/api/v1/management/trips/${tripId}`, "Viaje no encontrado");
}

export function getManagementTripManifest<T = any>(tripId: string) {
  return apiGet<T>(`/api/v1/management/trips/${tripId}/manifest`, "Error al cargar el manifiesto");
}

export function getMyDriverTrips<T = any>() {
  return apiGet<T>(`/api/v1/management/trips/my-driver`, "Error al cargar tus viajes");
}

/** Avanza el estado del viaje (SCHEDULED→BOARDING→IN_TRANSIT→COMPLETED). Requiere sesión. */
export function updateTripStatus<T = any>(tripId: string, status: string) {
  return apiPatch<T>(`/api/v1/management/trips/${tripId}/status`, { status }, "No se pudo actualizar el estado del viaje");
}
