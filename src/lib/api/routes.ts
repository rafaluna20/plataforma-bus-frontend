import { apiGet, apiPost } from "./client";

export function getStationsByCity<T = any>(city: string) {
  return apiGet<T>(`/api/v1/routes/stations?city=${encodeURIComponent(city)}`, "Error al cargar estaciones");
}

export function createStation<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/routes/stations`, body, "Error al crear estación");
}

export function createRoute<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/routes`, body, "Error al crear ruta");
}
