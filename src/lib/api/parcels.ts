import { apiGet, apiPost, apiPatch } from "./client";

export function getParcelsByTrip<T = any>(tripId: string) {
  return apiGet<T>(`/api/v1/parcels/trip/${tripId}`, "Error al cargar encomiendas");
}

export function createParcel<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/parcels`, body, "Error al registrar encomienda");
}

export function updateParcelStatus<T = any>(parcelId: string, status: string) {
  return apiPatch<T>(`/api/v1/parcels/${parcelId}/status`, { status }, "Error al actualizar estado");
}
