import { apiGet } from "./client";

export function getParcelsByTrip<T = any>(tripId: string) {
  return apiGet<T>(`/api/v1/parcels/trip/${tripId}`, "Error al cargar encomiendas");
}
