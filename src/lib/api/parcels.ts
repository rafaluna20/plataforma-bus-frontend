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

/** Bandeja: encomiendas "pendientes de asignar" (sin viaje) de una empresa, filtrable por tramo. */
export function getPendingParcels<T = any>(companyId: string, filters?: { startWaypointId?: string; endWaypointId?: string }) {
  const query = new URLSearchParams({
    companyId,
    ...(filters?.startWaypointId ? { startWaypointId: filters.startWaypointId } : {}),
    ...(filters?.endWaypointId ? { endWaypointId: filters.endWaypointId } : {}),
  }).toString();
  return apiGet<T>(`/api/v1/parcels/pending?${query}`, "Error al cargar la bandeja de encomiendas");
}

/** Asigna (tripId), reasigna, o quita del viaje (tripId=null, vuelve a la bandeja) una encomienda. */
export function reassignParcel<T = any>(parcelId: string, tripId: string | null) {
  return apiPatch<T>(`/api/v1/parcels/${parcelId}/reassign`, { tripId }, "Error al reasignar la encomienda");
}
