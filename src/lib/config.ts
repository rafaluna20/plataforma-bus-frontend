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
 */
export function calcTripPrice(
  waypoints: Array<{ id: string; stopOrder: number; basePrice: number }>,
  startId: string,
  endId: string
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
      price += Number(wp.basePrice);
    }
  }
  return price;
}
