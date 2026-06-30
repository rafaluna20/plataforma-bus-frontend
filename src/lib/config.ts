/**
 * Configuración centralizada de la aplicación.
 * Importar desde aquí en lugar de usar process.env directamente.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Calcula el precio de un tramo dado un array de waypoints,
 * el id del waypoint de inicio y el id del waypoint de fin.
 * Función pura compartida entre frontend y lógica de UI.
 *
 * @param floor - Piso del asiento (1 = primer piso/VIP, 2 = segundo piso/estándar, default = 2)
 *                Si el waypoint no tiene basePriceFloor1 se usa basePrice para cualquier piso.
 */
export function calcTripPrice(
  waypoints: Array<{ id: string; stopOrder: number; basePrice: number; basePriceFloor1?: number | null }>,
  startId: string,
  endId: string,
  floor: 1 | 2 = 2
): number {
  const startWp = waypoints.find((w) => w.id === startId);
  const endWp = waypoints.find((w) => w.id === endId);
  if (!startWp || !endWp) return 0;
  let price = 0;
  for (const wp of waypoints) {
    if (
      wp.stopOrder > startWp.stopOrder &&
      wp.stopOrder <= endWp.stopOrder
    ) {
      // Usar basePriceFloor1 para piso 1 si está definido; caso contrario usar basePrice
      const segmentPrice =
        floor === 1 && wp.basePriceFloor1 != null
          ? Number(wp.basePriceFloor1)
          : Number(wp.basePrice);
      price += segmentPrice;
    }
  }
  return price;
}

/**
 * Calcula el rango de precios [mínimo, máximo] para un tramo en buses de 2 pisos.
 * Útil para mostrar "S/ 45.00 – S/ 60.00" en la tarjeta de información del viaje.
 * Si no hay diferencia de precios retorna [precio, precio].
 */
export function calcTripPriceRange(
  waypoints: Array<{ id: string; stopOrder: number; basePrice: number; basePriceFloor1?: number | null }>,
  startId: string,
  endId: string
): [number, number] {
  const floor2Price = calcTripPrice(waypoints, startId, endId, 2);
  const floor1Price = calcTripPrice(waypoints, startId, endId, 1);
  const min = Math.min(floor1Price, floor2Price);
  const max = Math.max(floor1Price, floor2Price);
  return [min, max];
}
