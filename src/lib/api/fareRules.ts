import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

/** Reglas de tarifa dinámica (franja horaria / fecha especial) de una ruta. */
export function getFareRulesByRoute<T = any>(routeId: string) {
  return apiGet<T>(`/api/v1/fare-rules/route/${routeId}`, "Error al cargar las reglas de tarifa");
}

export function createFareRule<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/fare-rules`, body, "Error al crear la regla de tarifa");
}

export function updateFareRule<T = any>(ruleId: string, body: unknown) {
  return apiPatch<T>(`/api/v1/fare-rules/${ruleId}`, body, "Error al actualizar la regla de tarifa");
}

export function deleteFareRule<T = any>(ruleId: string) {
  return apiDelete<T>(`/api/v1/fare-rules/${ruleId}`, "Error al eliminar la regla de tarifa");
}
