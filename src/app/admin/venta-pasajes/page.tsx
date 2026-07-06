"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bus, Clock, Users, Search, CheckCircle2,
  AlertCircle, Loader2, Banknote, CreditCard, Printer,
  RefreshCw, MapPin, ArrowRight, X
} from "lucide-react";
import { fetchProfile } from "@/lib/auth";
import { searchTrips } from "@/lib/api/trips";
import { useTripDetail, useCreateBooking } from "@/lib/queries/trips";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Waypoint = {
  id: string;
  stopOrder: number;
  estimatedDurationMins: number;
  basePrice: number;
  station: { id: string; name: string; city: string };
};

type TripItem = {
  id: string;
  departureTime: string;
  status: string;
  availableSeats?: number;
  route: { id: string; name: string; waypoints: Waypoint[] };
  vehicle: {
    id: string;
    plateNumber: string;
    vehicleType: string;
    capacity: number;
    imageUrl: string | null;
    seatTemplate: any;
  };
};

type BookingReceipt = {
  id: string;
  seatId: string;
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Programado", cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  BOARDING:  { label: "Abordando",  cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  IN_TRANSIT:{ label: "En Tránsito",cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  COMPLETED: { label: "Completado", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  CANCELLED: { label: "Cancelado",  cls: "text-red-400 bg-red-500/10 border-red-500/20" },
};

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan", BUS_1P: "Bus 1 Piso", BUS_2P: "Bus 2 Pisos", AUTO: "Auto",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function VentaPasajesPage() {
  const router = useRouter();

  // Estado general
  const [companyId, setCompanyId] = useState("");
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split("T")[0]);

  // Viaje seleccionado
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const { data: tripDetailData, isLoading: loadingTrip } = useTripDetail(selectedTrip?.id);
  const occupiedSeats: string[] = tripDetailData?.occupiedSeats || [];
  const createBooking = useCreateBooking(selectedTrip?.id);

  // Asiento seleccionado
  const [selectedSeat, setSelectedSeat] = useState<string>("");

  // Tramo
  const [startWaypointId, setStartWaypointId] = useState("");
  const [endWaypointId, setEndWaypointId] = useState("");

  // Formulario de pasajero
  const [passengerName, setPassengerName] = useState("");
  const [passengerDocType, setPassengerDocType] = useState("DNI");
  const [passengerDocNum, setPassengerDocNum] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "digital">("cash");

  // Estado de reserva
  const [bookingError, setBookingError] = useState("");
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  // ─── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data: any = await fetchProfile();
      const cid = data?.company?.id || data?.companyId;
      if (!cid) { setError("No se encontró empresa asociada."); setLoading(false); return; }
      setCompanyId(cid);
      await loadTrips(cid, searchDate);
    } catch {
      setError("Error al cargar el perfil.");
      setLoading(false);
    }
  }

  async function loadTrips(cid: string, date: string) {
    setLoading(true);
    setError("");
    try {
      const data = await searchTrips<any>({ companyId: cid, date, limit: 50 });
      setTrips(data.trips || []);
    } catch {
      setError("Error al cargar los viajes.");
    } finally {
      setLoading(false);
    }
  }

  function selectTrip(trip: TripItem) {
    setSelectedTrip(trip);
    setSelectedSeat("");
    setReceipt(null);
    setBookingError("");
    setStartWaypointId("");
    setEndWaypointId("");
  }

  // Pre-seleccionar primer y último waypoint apenas llega el detalle del viaje
  useEffect(() => {
    const wps = tripDetailData?.trip?.route?.waypoints || selectedTrip?.route.waypoints || [];
    if (wps.length >= 2 && !startWaypointId && !endWaypointId) {
      setStartWaypointId(wps[0].id);
      setEndWaypointId(wps[wps.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripDetailData, selectedTrip?.id]);

  // Calcular precio del tramo
  function calcPrice(): number {
    if (!selectedTrip) return 0;
    const wps = selectedTrip.route.waypoints;
    const startWp = wps.find(w => w.id === startWaypointId);
    const endWp = wps.find(w => w.id === endWaypointId);
    if (!startWp || !endWp) return 0;
    let price = 0;
    for (const wp of wps) {
      if (wp.stopOrder > startWp.stopOrder && wp.stopOrder <= endWp.stopOrder) {
        price += Number(wp.basePrice);
      }
    }
    return price;
  }

  // Asientos del vehículo
  function getSeats(): string[] {
    if (!selectedTrip) return [];
    const st = selectedTrip.vehicle.seatTemplate;
    const raw: any[] = Array.isArray(st) ? st : st?.seats || st?.floor1?.seats || [];
    if (raw.length > 0) return raw.map((s: any) => s.id || s.label);
    return Array.from({ length: selectedTrip.vehicle.capacity }, (_, i) => `S${i + 1}`);
  }

  // Reservar
  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip || !selectedSeat) return;
    if (!passengerName.trim() || !passengerDocNum.trim()) {
      setBookingError("Nombre y número de documento son obligatorios.");
      return;
    }
    if (!startWaypointId || !endWaypointId || startWaypointId === endWaypointId) {
      setBookingError("Selecciona un tramo válido (origen ≠ destino).");
      return;
    }

    setBookingError("");

    const body: any = {
      tripId: selectedTrip.id,
      passengerName: passengerName.trim(),
      passengerDocType,
      passengerDocNum: passengerDocNum.trim(),
      startWaypointId,
      endWaypointId,
      seatId: selectedSeat,
    };

    if (paymentMethod === "digital") {
      body.paymentDetails = { method: "YAPE", phoneNumber: passengerPhone };
    }

    try {
      const data = await createBooking.mutateAsync({ method: paymentMethod, body });
      setReceipt(data.booking);
      setSelectedSeat("");
      // Limpiar formulario para siguiente venta
      setPassengerName("");
      setPassengerDocNum("");
      setPassengerPhone("");
    } catch (e: any) {
      setBookingError(e.message);
    }
  }

  const pricePerSeat = calcPrice();
  const seats = getSeats();
  const waypoints = selectedTrip?.route.waypoints || [];
  const freeSeats = selectedTrip ? selectedTrip.vehicle.capacity - occupiedSeats.length : 0;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin")}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-indigo-400" /> Venta de Pasajes — Mostrador
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Registra ventas en efectivo o digital para los viajes del día
          </p>
        </div>
        <button onClick={() => companyId && loadTrips(companyId, searchDate)}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Layout: lista de viajes | detalle + venta */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── COLUMNA IZQUIERDA: Lista de viajes ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filtro de fecha */}
          <div className="glass-card p-4 flex items-center gap-3">
            <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <input
              type="date"
              value={searchDate}
              onChange={e => {
                setSearchDate(e.target.value);
                if (companyId) loadTrips(companyId, e.target.value);
              }}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none [color-scheme:dark]"
            />
          </div>

          {/* Lista */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-1">
              {loading ? "Cargando..." : `${trips.length} viaje${trips.length !== 1 ? "s" : ""} encontrado${trips.length !== 1 ? "s" : ""}`}
            </p>

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
              ))
            ) : trips.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Bus className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No hay viajes para esta fecha</p>
              </div>
            ) : (
              trips.map(trip => {
                const wps = trip.route.waypoints || [];
                const orig = wps[0]?.station?.name || "—";
                const dest = wps[wps.length - 1]?.station?.name || "—";
                const dep = new Date(trip.departureTime);
                const st = statusConfig[trip.status] || statusConfig.SCHEDULED;
                const isSelected = selectedTrip?.id === trip.id;

                return (
                  <button
                    key={trip.id}
                    onClick={() => selectTrip(trip)}
                    className={`w-full text-left glass-card p-4 transition-all hover:border-indigo-500/40 ${
                      isSelected ? "border-indigo-500/60 bg-indigo-500/5" : ""
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">
                          <span className="truncate">{orig}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                          <span className="truncate">{dest}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {vehicleTypeLabel[trip.vehicle.vehicleType] || trip.vehicle.vehicleType} · {trip.vehicle.plateNumber}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-white">
                          {dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Detalle + Venta ────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {!selectedTrip ? (
            <div className="glass-card p-16 text-center">
              <Bus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Selecciona un viaje de la lista</p>
              <p className="text-slate-600 text-sm mt-1">para ver el mapa de asientos y registrar una venta</p>
            </div>
          ) : (
            <>
              {/* Info del viaje seleccionado */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-white text-lg">
                      {selectedTrip.route.waypoints[0]?.station?.name || "—"}{" "}
                      <span className="text-slate-500">→</span>{" "}
                      {selectedTrip.route.waypoints[selectedTrip.route.waypoints.length - 1]?.station?.name || "—"}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {vehicleTypeLabel[selectedTrip.vehicle.vehicleType]} · {selectedTrip.vehicle.plateNumber} ·{" "}
                      {new Date(selectedTrip.departureTime).toLocaleString("es-PE", {
                        weekday: "short", day: "2-digit", month: "short",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-400">{freeSeats}</p>
                    <p className="text-xs text-slate-500">libres de {selectedTrip.vehicle.capacity}</p>
                  </div>
                </div>

                {/* Barra de ocupación */}
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.round((occupiedSeats.length / selectedTrip.vehicle.capacity) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {occupiedSeats.length} ocupados · {Math.round((occupiedSeats.length / selectedTrip.vehicle.capacity) * 100)}% de ocupación
                  </p>
                </div>
              </div>

              {/* Recibo de última venta */}
              {receipt && (
                <div className="glass-card p-4 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" /> ¡Venta registrada!
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg">
                      <Printer className="w-3.5 h-3.5" /> Imprimir
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Asiento</p>
                      <p className="text-white font-bold text-lg">{receipt.seatId}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Total cobrado</p>
                      <p className="text-emerald-400 font-bold text-lg">S/ {Number(receipt.totalPrice).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Estado</p>
                      <p className="text-white text-sm">{receipt.paymentStatus}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">ID Reserva</p>
                      <p className="text-slate-400 text-xs font-mono">{receipt.id?.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <button onClick={() => setReceipt(null)}
                    className="mt-3 text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1">
                    <X className="w-3 h-3" /> Cerrar recibo
                  </button>
                </div>
              )}

              {/* Mapa de asientos */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Mapa de Asientos</h3>
                  {loadingTrip && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                </div>

                {/* Leyenda */}
                <div className="flex gap-4 mb-4 text-xs">
                  {[
                    { cls: "bg-slate-700 border-slate-600", label: "Libre" },
                    { cls: "bg-indigo-500/30 border-indigo-400", label: "Seleccionado" },
                    { cls: "bg-slate-800 border-slate-700 opacity-40", label: "Ocupado" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded border ${item.cls}`} />
                      <span className="text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Asientos */}
                <div className="flex flex-wrap gap-2">
                  {seats.map(seatId => {
                    const isOccupied = occupiedSeats.includes(seatId);
                    const isSelected = selectedSeat === seatId;
                    return (
                      <button
                        key={seatId}
                        onClick={() => !isOccupied && setSelectedSeat(isSelected ? "" : seatId)}
                        disabled={isOccupied}
                        title={isOccupied ? "Ocupado" : `Asiento ${seatId}`}
                        className={`w-11 h-11 rounded-lg border text-xs font-bold transition-all ${
                          isOccupied
                            ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-40"
                            : isSelected
                              ? "bg-indigo-500/30 border-indigo-400 text-indigo-300 scale-110 shadow-lg shadow-indigo-500/20"
                              : "bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-white hover:scale-105"
                        }`}>
                        {seatId}
                      </button>
                    );
                  })}
                </div>

                {selectedSeat && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm text-white">
                      Asiento seleccionado: <strong className="text-indigo-300">{selectedSeat}</strong>
                      {pricePerSeat > 0 && (
                        <span className="ml-2 text-indigo-400 font-bold">— S/ {pricePerSeat.toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Formulario de venta */}
              {selectedSeat && (
                <form onSubmit={handleReserve} className="glass-card p-5 space-y-4">
                  <h3 className="font-bold text-white">Datos del Pasajero — Asiento {selectedSeat}</h3>

                  {/* Tramo */}
                  {waypoints.length >= 2 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Desde *</label>
                        <select value={startWaypointId} onChange={e => setStartWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                          {waypoints.map(wp => (
                            <option key={wp.id} value={wp.id}>{wp.station.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Hasta *</label>
                        <select value={endWaypointId} onChange={e => setEndWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                          {waypoints.map(wp => (
                            <option key={wp.id} value={wp.id}>{wp.station.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Precio calculado */}
                  {pricePerSeat > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-white/5">
                      <span className="text-slate-400 text-sm">Precio del tramo</span>
                      <span className="text-xl font-bold text-indigo-400">S/ {pricePerSeat.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Nombre */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nombre completo *</label>
                    <input
                      value={passengerName}
                      onChange={e => setPassengerName(e.target.value)}
                      placeholder="Juan Pérez García"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Documento */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Tipo Doc.</label>
                      <select value={passengerDocType} onChange={e => setPassengerDocType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                        <option value="DNI">DNI</option>
                        <option value="CE">CE</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-slate-400 mb-1 block">Número *</label>
                      <input
                        value={passengerDocNum}
                        onChange={e => setPassengerDocNum(e.target.value)}
                        placeholder="12345678"
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Teléfono (opcional)</label>
                    <input
                      value={passengerPhone}
                      onChange={e => setPassengerPhone(e.target.value)}
                      placeholder="987654321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Método de pago *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setPaymentMethod("cash")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === "cash"
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                            : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                        }`}>
                        <Banknote className="w-4 h-4" /> Efectivo
                      </button>
                      <button type="button" onClick={() => setPaymentMethod("digital")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === "digital"
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                            : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                        }`}>
                        <CreditCard className="w-4 h-4" /> Yape/Digital
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {bookingError && (
                    <div className="flex items-start gap-2 text-sm text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {bookingError}
                    </div>
                  )}

                  {/* Botón registrar venta */}
                  <button type="submit" disabled={createBooking.isPending}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm gradient-btn disabled:opacity-50 flex items-center justify-center gap-2">
                    {createBooking.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Registrando venta...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" />
                        Registrar Venta{pricePerSeat > 0 ? ` — S/ ${pricePerSeat.toFixed(2)}` : ""}
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
