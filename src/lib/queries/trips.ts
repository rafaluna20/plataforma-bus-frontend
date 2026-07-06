import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTripDetail, getTripManifest } from "@/lib/api/trips";
import { createCashBooking, createDigitalBooking } from "@/lib/api/bookings";

/**
 * Claves compartidas por TODAS las pantallas que muestran el detalle/asientos
 * ocupados de un viaje (venta pública, mostrador, punto de venta y panel de
 * empresa) o su manifiesto de pasajeros. Vender un asiento en cualquiera de
 * ellas invalida ambas claves, así las demás dejan de mostrar ese asiento
 * como libre en su próximo refetch — sin importar si leen el dato desde
 * /trips/:id (occupiedSeats) o desde /trips/:id/manifest (pasajeros).
 */
export const tripDetailKey = (tripId: string) => ["tripDetail", tripId] as const;
export const tripManifestKey = (tripId: string) => ["tripManifest", tripId] as const;

export function useTripDetail(tripId: string | undefined) {
  return useQuery({
    queryKey: tripDetailKey(tripId ?? ""),
    queryFn: () => getTripDetail<any>(tripId as string),
    enabled: !!tripId,
  });
}

export function useTripManifest(tripId: string | undefined) {
  return useQuery({
    queryKey: tripManifestKey(tripId ?? ""),
    queryFn: () => getTripManifest<any>(tripId as string),
    enabled: !!tripId,
  });
}

type BookingPayload = { method: "cash" | "digital"; body: unknown };

export function useCreateBooking(tripId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ method, body }: BookingPayload) =>
      method === "cash" ? createCashBooking<any>(body) : createDigitalBooking<any>(body),
    onSuccess: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: tripDetailKey(tripId) });
        queryClient.invalidateQueries({ queryKey: tripManifestKey(tripId) });
      }
    },
  });
}
