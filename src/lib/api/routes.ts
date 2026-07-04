import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function getStationsByCity<T = any>(city: string) {
  return apiGet<T>(`/api/v1/routes/stations?city=${encodeURIComponent(city)}`, "Error al cargar estaciones");
}

export function getAllStations<T = any>() {
  return apiGet<T>(`/api/v1/routes/stations`, "Error al cargar estaciones");
}

export function createStation<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/routes/stations`, body, "Error al crear estación");
}

export function updateStation<T = any>(stationId: string, body: unknown) {
  return apiPut<T>(`/api/v1/routes/stations/${stationId}`, body, "Error al actualizar estación");
}

export function deleteStation<T = any>(stationId: string) {
  return apiDelete<T>(`/api/v1/routes/stations/${stationId}`, "Error al eliminar estación");
}

export function getRoutesByCompany<T = any>(companyId: string) {
  return apiGet<T>(`/api/v1/routes/company/${companyId}`, "Error al cargar rutas");
}

export function createRoute<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/routes`, body, "Error al crear ruta");
}

export function updateRoute<T = any>(routeId: string, body: unknown) {
  return apiPut<T>(`/api/v1/routes/${routeId}`, body, "Error al actualizar ruta");
}

export function deleteRoute<T = any>(routeId: string) {
  return apiDelete<T>(`/api/v1/routes/${routeId}`, "Error al eliminar ruta");
}
