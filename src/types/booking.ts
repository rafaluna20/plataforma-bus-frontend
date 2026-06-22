/**
 * src/types/booking.ts
 * Tipos compartidos para el flujo de reserva de viajes.
 * Importar desde aquí en lugar de definir localmente en cada componente.
 */

export type SeatStatus = 'libre' | 'ocupado' | 'reservado' | 'proceso';

export interface Seat {
  id: string;
  label: string;
  status: SeatStatus;
  price: number;
}

export interface Passenger {
  seatId: string;
  dni: string;
  nombre: string;
  telefono: string;
  partida: string;
  destino: string;
}

export interface TripSummary {
  origin: string;
  destination: string;
  company: string;
  duration: string;
  departureTime: string;
}

export interface BookingData {
  selectedSeats: Seat[];
  passengers: Passenger[];
}

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  company: string;
  departureTime: string;
  duration: string;
  price: number;
  vehicleType: string;
  capacity: number;
  occupiedSeats: number;
  description: string;
  likes: number;
  comments: number;
  imageUrl?: string;
}
