import { apiGet, apiPost } from "./client";

export function getParcelsByTrip<T = any>(tripId: string) {
  return apiGet<T>(`/api/v1/parcels/trip/${tripId}`, "Error al cargar encomiendas");
}

export function createParcel<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/parcels`, body, "Error al registrar encomienda");
}
