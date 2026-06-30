"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Bus, Clock, ArrowRight, CheckCircle2, AlertCircle,
  Loader2, Banknote, CreditCard, Printer, RefreshCw, X, Ticket
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import TicketModal from "@/components/trips/TicketModal";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

export default function EmpresaAdminVentaPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  // Colores de la empresa (cargados desde el layout/branding)
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyRuc, setCompanyRuc] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | undefined>(undefined);

  // Usuario actual
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  // Viajes
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split("T")[0]);

  // Viaje seleccionado
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(false);

  // Asiento y tramo
  const [selectedSeat, setSelectedSeat] = useState("");
  const [startWaypointId, setStartWaypointId] = useState("");
  const [endWaypointId, setEndWaypointId] = useState("");

  // Formulario
  const [passengerName, setPassengerName] = useState("");
  const [passengerDocType, setPassengerDocType] = useState("DNI");
  const [passengerDocNum, setPassengerDocNum] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "digital">("cash");

  // Estado de reserva
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  // Ticket modal
  const [ticketOpen, setTicketOpen] = useState(false);
  const [lastPassengerName, setLastPassengerName] = useState("");
  const [lastPassengerDoc, setLastPassengerDoc] = useState("");

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    loadCompany();
  }, [slugStr]);

  async function loadCompany() {
    try {
      const res = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      const data = await res.json();
      if (!res.ok) return;
      const cid = data.company.id;
      setCompanyId(cid);
      setCompanyName(data.company.tradeName);
      setCompanyRuc(data.company.ruc || "");
      setCompanyLogoUrl(data.company.logoUrl || undefined);
      setPrimaryColor(data.company.primaryColor || "#6366f1");
      setSecondaryColor(data.company.secondaryColor || "#8b5cf6");
      await loadTrips(cid, searchDate);

      // Si viene con tripId en query, preseleccionar
      const preselectedTripId = searchParams.get("tripId");
      if (preselectedTripId) {
        // Se cargará después de que trips esté disponible
      }
    } catch {
      setError("Error al cargar la empresa.");
      setLoading(false);
    }
  }

  async function loadTrips(cid: string, date: string) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ companyId: cid, date, limit: "50" });
      const res = await fetch(`${API}/api/v1/trips/search?${qs}`);
      const data = await res.json();
      const tripsList = data.trips || [];
      setTrips(tripsList);

      // Preseleccionar viaje si viene en query
      const preselectedTripId = searchParams.get("tripId");
      if (preselectedTripId) {
        const found = tripsList.find((t: TripItem) => t.id === preselectedTripId);
        if (found) selectTrip(found);
      }
    } catch {
      setError("Error al cargar los viajes.");
    } finally {
      setLoading(false);
    }
  }

  async function selectTrip(trip: TripItem) {
    setSelectedTrip(trip);
    setSelectedSeat("");
    setReceipt(null);
    setBookingError("");
    setTicketOpen(false);
    setLoadingTrip(true);

    try {
      const res = await fetch(`${API}/api/v1/trips/${trip.id}`);
      const data = await res.json();
      if (res.ok) {
        setOccupiedSeats(data.occupiedSeats || []);
        const wps = data.trip?.route?.waypoints || trip.route.waypoints;
        if (wps.length >= 2) {
          // Si es AGENCY_SELLER y tiene estación, preseleccionar origen
          let initialStart = wps[0].id;
          if (currentUser?.role === 'AGENCY_SELLER' && currentUser?.station?.id) {
            const userStationId = currentUser.station.id;
            const wpMatch = wps.find((w: any) => w.station.id === userStationId);
            if (wpMatch) initialStart = wpMatch.id;
          }
          setStartWaypointId(initialStart);
          setEndWaypointId(wps[wps.length - 1].id);
        }
      }
    } catch { }
    finally { setLoadingTrip(false); }
  }

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

  function getSeats(): string[] {
    if (!selectedTrip) return [];
    const st = selectedTrip.vehicle.seatTemplate;
    const raw: any[] = Array.isArray(st) ? st : st?.seats || st?.floor1?.seats || [];
    if (raw.length > 0) return raw.map((s: any) => s.id || s.label);
    return Array.from({ length: selectedTrip.vehicle.capacity }, (_, i) => `S${i + 1}`);
  }

  /** Calcula duración total del tramo seleccionado en minutos */
  function calcDurationMins(): number {
    if (!selectedTrip) return 0;
    const wps = selectedTrip.route.waypoints;
    const startWp = wps.find(w => w.id === startWaypointId);
    const endWp = wps.find(w => w.id === endWaypointId);
    if (!startWp || !endWp) return 0;
    let mins = 0;
    for (const wp of wps) {
      if (wp.stopOrder >= startWp.stopOrder && wp.stopOrder < endWp.stopOrder) {
        mins += Number(wp.estimatedDurationMins);
      }
    }
    return mins;
  }

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

    setBooking(true);
    setBookingError("");

    // Guardar datos del pasajero antes de limpiar el form
    const savedPassengerName = passengerName.trim();
    const savedPassengerDoc = `${passengerDocType}: ${passengerDocNum.trim()}`;

    try {
      const endpoint = paymentMethod === "cash"
        ? `${API}/api/v1/bookings`
        : `${API}/api/v1/bookings/digital`;

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

      const res = await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar la venta");

      setReceipt(data.booking);
      setLastPassengerName(savedPassengerName);
      setLastPassengerDoc(savedPassengerDoc);
      setOccupiedSeats(prev => [...prev, selectedSeat]);
      setSelectedSeat("");
      setPassengerName("");
      setPassengerDocNum("");
      setPassengerPhone("");

      // Abrir el ticket automáticamente
      setTicketOpen(true);
    } catch (e: any) {
      setBookingError(e.message);
    } finally {
      setBooking(false);
    }
  }

  const pricePerSeat = calcPrice();
  const seats = getSeats();
  const waypoints = selectedTrip?.route.waypoints || [];
  const freeSeats = selectedTrip ? selectedTrip.vehicle.capacity - occupiedSeats.length : 0;

  // Datos para el TicketModal
  const ticketData = receipt && selectedTrip ? {
    companyName,
    companyRuc: companyRuc || undefined,
    companyLogoUrl,
    origin: (() => {
      const wp = waypoints.find(w => w.id === startWaypointId);
      return wp ? `${wp.station.city}-${wp.station.name}` : waypoints[0]?.station?.name || "—";
    })(),
    destination: (() => {
      const wp = waypoints.find(w => w.id === endWaypointId);
      return wp ? `${wp.station.city}-${wp.station.name}` : waypoints[waypoints.length - 1]?.station?.name || "—";
    })(),
    departureTime: selectedTrip.departureTime,
    passengerName: lastPassengerName,
    passengerDoc: lastPassengerDoc,
    seatId: receipt.seatId,
    seatLabel: receipt.seatId,
    bookingId: receipt.id,
    totalPrice: Number(receipt.totalPrice),
    paymentStatus: receipt.paymentStatus,
    paymentMethod: paymentMethod === "cash" ? "Efectivo" : "Yape/Digital",
    routeName: selectedTrip.route.name,
    estimatedDurationMins: calcDurationMins() || undefined,
  } : null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6" style={{ color: primaryColor }} />
            Venta de Pasajes — Mostrador
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{companyName}</p>
        </div>
        <button onClick={() => companyId && loadTrips(companyId, searchDate)}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Lista de viajes ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">

          {/* Filtro de fecha */}
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
            <input type="date" value={searchDate}
              onChange={e => {
                setSearchDate(e.target.value);
                if (companyId) loadTrips(companyId, e.target.value);
              }}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none [color-scheme:dark]" />
          </div>

          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-1">
            {loading ? "Cargando..." : `${trips.length} viaje${trips.length !== 1 ? "s" : ""}`}
          </p>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))
          ) : trips.length === 0 ? (
            <div className="bg-slate-900/60 border border-white/5 rounded-xl p-8 text-center">
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
                <button key={trip.id} onClick={() => selectTrip(trip)}
                  className={`w-full text-left bg-slate-900/60 border rounded-xl p-4 transition-all hover:border-white/15 ${
                    isSelected ? "border-white/20" : "border-white/5"
                  }`}
                  style={isSelected ? {
                    borderColor: `${primaryColor}60`,
                    background: `linear-gradient(135deg, ${primaryColor}08, transparent)`,
                  } : {}}>
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

        {/* ── Detalle + Venta ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {!selectedTrip ? (
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-16 text-center">
              <Bus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Selecciona un viaje de la lista</p>
              <p className="text-slate-600 text-sm mt-1">para ver el mapa de asientos y registrar una venta</p>
            </div>
          ) : (
            <>
              {/* Info del viaje */}
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
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
                    <p className="text-2xl font-bold" style={{ color: primaryColor }}>{freeSeats}</p>
                    <p className="text-xs text-slate-500">libres de {selectedTrip.vehicle.capacity}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((occupiedSeats.length / selectedTrip.vehicle.capacity) * 100)}%`,
                        background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
                      }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {occupiedSeats.length} ocupados · {Math.round((occupiedSeats.length / selectedTrip.vehicle.capacity) * 100)}% de ocupación
                  </p>
                </div>
              </div>

              {/* Recibo / Ticket */}
              {receipt && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" /> ¡Venta registrada!
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTicketOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90 text-white"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                      >
                        <Ticket className="w-3.5 h-3.5" /> Ver Ticket
                      </button>
                    </div>
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
                      <p className="text-slate-500 text-xs">Pasajero</p>
                      <p className="text-white text-sm">{lastPassengerName}</p>
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
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Mapa de Asientos</h3>
                  {loadingTrip && <Loader2 className="w-4 h-4 animate-spin" style={{ color: primaryColor }} />}
                </div>

                <div className="flex gap-4 mb-4 text-xs">
                  {[
                    { cls: "bg-slate-700 border-slate-600", label: "Libre" },
                    { cls: "border-2", label: "Seleccionado", style: { background: `${primaryColor}30`, borderColor: primaryColor } },
                    { cls: "bg-slate-800 border-slate-700 opacity-40", label: "Ocupado" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded border ${item.cls}`} style={(item as any).style} />
                      <span className="text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {seats.map(seatId => {
                    const isOccupied = occupiedSeats.includes(seatId);
                    const isSelected = selectedSeat === seatId;
                    return (
                      <button key={seatId}
                        onClick={() => !isOccupied && setSelectedSeat(isSelected ? "" : seatId)}
                        disabled={isOccupied}
                        className={`w-11 h-11 rounded-lg border text-xs font-bold transition-all ${
                          isOccupied
                            ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-40"
                            : isSelected
                              ? "text-white scale-110 shadow-lg"
                              : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"
                        }`}
                        style={isSelected ? {
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          borderColor: primaryColor,
                          boxShadow: `0 4px 15px ${primaryColor}40`,
                        } : {}}>
                        {seatId}
                      </button>
                    );
                  })}
                </div>

                {selectedSeat && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border"
                    style={{ background: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                    <span className="text-sm text-white">
                      Asiento: <strong style={{ color: primaryColor }}>{selectedSeat}</strong>
                      {pricePerSeat > 0 && (
                        <span className="ml-2 font-bold" style={{ color: primaryColor }}>— S/ {pricePerSeat.toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Formulario de venta */}
              {selectedSeat && (
                <form onSubmit={handleReserve} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-white">Datos del Pasajero — Asiento {selectedSeat}</h3>

                  {/* Tramo */}
                  {waypoints.length >= 2 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Desde *</label>
                        <select value={startWaypointId} onChange={e => setStartWaypointId(e.target.value)}
                          disabled={currentUser?.role === 'AGENCY_SELLER' && !!currentUser?.station}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-70">
                          {waypoints.map(wp => <option key={wp.id} value={wp.id}>{wp.station.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Hasta *</label>
                        <select value={endWaypointId} onChange={e => setEndWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                          {waypoints.map(wp => <option key={wp.id} value={wp.id}>{wp.station.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {pricePerSeat > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-white/5">
                      <span className="text-slate-400 text-sm">Precio del tramo</span>
                      <span className="text-xl font-bold" style={{ color: primaryColor }}>S/ {pricePerSeat.toFixed(2)}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nombre completo *</label>
                    <input value={passengerName} onChange={e => setPassengerName(e.target.value)}
                      placeholder="Juan Pérez García" required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
                  </div>

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
                      <input value={passengerDocNum} onChange={e => setPassengerDocNum(e.target.value)}
                        placeholder="12345678" required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Teléfono (opcional)</label>
                    <input value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)}
                      placeholder="987654321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none" />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Método de pago *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "cash", label: "Efectivo", icon: <Banknote className="w-4 h-4" /> },
                        { key: "digital", label: "Yape/Digital", icon: <CreditCard className="w-4 h-4" /> },
                      ].map(opt => (
                        <button key={opt.key} type="button"
                          onClick={() => setPaymentMethod(opt.key as any)}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                            paymentMethod === opt.key ? "text-white" : "border-slate-700 text-slate-400 hover:text-white"
                          }`}
                          style={paymentMethod === opt.key ? {
                            background: `${primaryColor}20`, borderColor: primaryColor, color: primaryColor
                          } : {}}>
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bookingError && (
                    <div className="flex items-start gap-2 text-sm text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {bookingError}
                    </div>
                  )}

                  <button type="submit" disabled={booking}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                    {booking
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando venta...</>
                      : <><CheckCircle2 className="w-4 h-4" />
                          Registrar Venta{pricePerSeat > 0 ? ` — S/ ${pricePerSeat.toFixed(2)}` : ""}
                        </>}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Ticket Modal ─────────────────────────────────────────────────── */}
      {ticketData && (
        <TicketModal
          open={ticketOpen}
          onClose={() => setTicketOpen(false)}
          ticket={ticketData}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}
    </div>
  );
}
