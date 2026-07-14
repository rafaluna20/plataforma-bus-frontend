import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyBookings, cancelBooking } from "@/lib/api/bookings";

export const myBookingsKey = (page: number) => ["myBookings", page] as const;

export function useMyBookings(page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: myBookingsKey(page),
    queryFn: () => getMyBookings<any>(page, limit),
    enabled,
  });
}

/** Cancela una reserva propia desde la lista de "Mis viajes" — invalida esa lista al terminar. */
export function useCancelMyBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking<any>(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}
