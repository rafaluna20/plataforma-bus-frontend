import { apiGet, apiPost } from "./client";

export function createCashBooking<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/bookings`, body, "Error al reservar");
}

export function createDigitalBooking<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/bookings/digital`, body, "Error al reservar");
}

export function getMyBookings<T = any>(page = 1, limit = 10) {
  return apiGet<T>(`/api/v1/bookings/my?page=${page}&limit=${limit}`, "Error al cargar tus reservas");
}
