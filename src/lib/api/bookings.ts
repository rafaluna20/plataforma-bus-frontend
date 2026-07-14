import { apiGet, apiPost, apiPatch } from "./client";

export function createCashBooking<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/bookings`, body, "Error al reservar");
}

export function createDigitalBooking<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/bookings/digital`, body, "Error al reservar");
}

export function getMyBookings<T = any>(page = 1, limit = 10) {
  return apiGet<T>(`/api/v1/bookings/my?page=${page}&limit=${limit}`, "Error al cargar tus reservas");
}

/** Cancela una reserva y libera su asiento (funciona con reservas ya pagadas). */
export function cancelBooking<T = any>(bookingId: string) {
  return apiPatch<T>(`/api/v1/bookings/${bookingId}/cancel`, undefined, "Error al cancelar la reserva");
}

/** Aparta un asiento (nombre + documento) sin cobrar todavía. Solo staff de la empresa. */
export function reserveSeat<T = any>(body: unknown) {
  return apiPost<T>(`/api/v1/bookings/reserve`, body, "Error al reservar el asiento");
}

/** Confirma una reserva hacia una venta real (efectivo o digital). */
export function confirmReservation<T = any>(bookingId: string, method: "cash" | "digital", paymentDetails?: unknown) {
  return apiPatch<T>(`/api/v1/bookings/${bookingId}/confirm`, { method, paymentDetails }, "Error al confirmar la reserva");
}
