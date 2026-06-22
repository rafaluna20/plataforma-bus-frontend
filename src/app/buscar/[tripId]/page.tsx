"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bus, Clock, Users, MapPin, ArrowRight,
  CheckCircle2, AlertCircle, Share2, Heart, ChevronRight,
  Loader2, CreditCard, Banknote, Phone
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Waypoint = {
  id: string;
  stopOrder: number;
  estimatedDurationMins: number;
  basePrice: number;
  station: { id: string; name: string; city: string };
};

type TripDetail = {
  id: string;
  departureTime: string;
  status: string;
  route: {
    id: string;
    name: string;
    company: {
      id: string;
      tradeName: string;
      slug: string | null;
      logoUrl: string | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      phone: string | null;
    };
    waypoints: Waypoint[];
  };
  vehicle: {
    id: string;
    plateNumber: string;
    vehicleType: string;
    serviceMode: string;
    capacity: number;
    imageUrl: string | null;
    seatTemplate: any;
  };
};

type SeatStatus = "libre" | "ocupado" | "seleccionado";

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan",
  BUS_1P: "Bus 1 Piso",
  BUS_2P: "Bus 2 Pisos",
  AUTO: "Auto",
};

const vehicleImages: Record<string, string> = {
  BUS_2P: "https://i.imgur.com/8QkXqzP.png",
  BUS_1P: "https://i.imgur.com/3nYcmEf.png",
  MINIVAN: "https://i.imgur.com/7vQkLpN.png",
  AUTO: "https://i.imgur.com/2xRmKjT.png",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: "A TIEMPO", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  BOARDING: { label: "ABORDANDO", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  IN_TRANSIT: { label: "EN RUTA", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  COMPLETED: { label: "COMPLETADO", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
  CANCELLED: { label: "CANCELADO", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TripDetailPage() {
  const { tripId } = useParams();
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selección de asientos
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"descripcion" | "paradas" | "vehiculo">("descripcion");

  // Tramo seleccionado
  const [startWaypointId, setStartWaypointId] = useState("");
  const [endWaypointId, setEndWaypointId] = useState("");

  // Formulario de pasajero
  const [showForm, setShowForm] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [passengerDocType, setPassengerDocType] = useState("DNI");
  const [passengerDocNum, setPassengerDocNum] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "digital">("cash");
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  async function loadTrip() {
    setLoading(true);
    try {
      const id = Array.isArray(tripId) ? tripId[0] : tripId;
      const res = await fetch(`${API}/api/v1/trips/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Viaje no encontrado");
      setTrip(data.trip);
      setOccupiedSeats(data.occupiedSeats || []);

      // Pre-seleccionar primer y último waypoint
      const wps = data.trip.route?.waypoints || [];
      if (wps.length >= 2) {
        setStartWaypointId(wps[0].id);
        setEndWaypointId(wps[wps.length - 1].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSeat(seatId: string) {
    if (occupiedSeats.includes(seatId)) return;
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  }

  function getSeatStatus(seatId: string): SeatStatus {
    if (occupiedSeats.includes(seatId)) return "ocupado";
    if (selectedSeats.includes(seatId)) return "seleccionado";
    return "libre";
  }

  // Calcular precio del tramo seleccionado
  function calcPrice(): number {
    if (!trip) return 0;
    const wps = trip.route.waypoints;
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

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!trip || selectedSeats.length === 0) return;
    if (!passengerName.trim() || !passengerDocNum.trim()) {
      setBookingError("Nombre y documento son obligatorios.");
      return;
    }

    setBooking(true);
    setBookingError("");

    try {
      const endpoint = paymentMethod === "cash"
        ? `${API}/api/v1/bookings`
        : `${API}/api/v1/bookings/digital`;

      const body: any = {
        tripId: trip.id,
        passengerName: passengerName.trim(),
        passengerDocType,
        passengerDocNum: passengerDocNum.trim(),
        startWaypointId,
        endWaypointId,
        seatId: selectedSeats[0], // Por ahora 1 asiento por reserva
      };

      if (paymentMethod === "digital") {
        body.paymentDetails = { method: "YAPE", phoneNumber: passengerPhone };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reservar");

      setBookingSuccess(data.booking);
      setOccupiedSeats(prev => [...prev, selectedSeats[0]]);
      setSelectedSeats([]);
      setShowForm(false);
    } catch (e: any) {
      setBookingError(e.message);
    } finally {
      setBooking(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-400 text-sm">Cargando viaje...</p>
      </div>
    </div>
  );

  if (error || !trip) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertCircle className="w-16 h-16 text-red-400" />
      <h1 className="text-2xl font-bold text-white">Viaje no encontrado</h1>
      <p className="text-slate-400">{error}</p>
      <button onClick={() => router.back()} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
    </div>
  );

  const waypoints = trip.route.waypoints;
  const origin = waypoints[0]?.station?.name || "";
  const destination = waypoints[waypoints.length - 1]?.station?.name || "";
  const departure = new Date(trip.departureTime);
  const company = trip.route.company;
  const vehicle = trip.vehicle;
  const primaryColor = company.primaryColor || "#6366f1";
  const secondaryColor = company.secondaryColor || "#8b5cf6";
  const statusInfo = statusConfig[trip.status] || statusConfig.SCHEDULED;
  const vehicleImg = vehicle.imageUrl || vehicleImages[vehicle.vehicleType] || vehicleImages.BUS_1P;
  const typeLabel = vehicleTypeLabel[vehicle.vehicleType] || vehicle.vehicleType;
  const pricePerSeat = calcPrice();
  const freeSeats = vehicle.capacity - occupiedSeats.length;
  const occupancyPct = Math.round((occupiedSeats.length / vehicle.capacity) * 100);

  // Asientos del seatTemplate
  const seats: any[] = Array.isArray(vehicle.seatTemplate)
    ? vehicle.seatTemplate
    : vehicle.seatTemplate?.seats || vehicle.seatTemplate?.floor1?.seats || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Fondo animado */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 65%)`, animationDuration: "4s" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${secondaryColor}12 0%, transparent 65%)`, animationDuration: "6s" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ─── Breadcrumb / Back ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {company.slug && (
              <>
                <Link href={`/empresa/${company.slug}`} className="hover:text-indigo-400 transition-colors">
                  {company.tradeName}
                </Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-slate-300">{origin} → {destination}</span>
          </div>
        </div>

        {/* ─── Layout principal: contenido + panel lateral ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── COLUMNA IZQUIERDA (2/3) ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero: imagen del vehículo */}
            <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-slate-900/60"
              style={{ height: "280px" }}>
              <img
                src={vehicleImg}
                alt={typeLabel}
                className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9h16v2H4z'/%3E%3C/svg%3E";
                }}
              />
              {/* Gradiente overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}>
                  {statusInfo.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 text-slate-300 border border-white/10">
                  {typeLabel}
                </span>
              </div>

              {/* Acciones */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-400 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Título del viaje */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Viaje: {origin}{" "}
                <span className="text-slate-500">→</span>{" "}
                {destination}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={company.tradeName} className="w-5 h-5 rounded object-contain" />
                ) : (
                  <Bus className="w-4 h-4" style={{ color: primaryColor }} />
                )}
                <span className="text-slate-400 text-sm">{company.tradeName}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-2xl font-bold text-white">{freeSeats}</p>
                <p className="text-xs text-slate-500 mt-0.5">ASIENTOS LIBRES</p>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-white">{occupiedSeats.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">PASAJEROS</p>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {departure.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">SALIDA</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 w-fit">
              {(["descripcion", "paradas", "vehiculo"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    activeTab === tab ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                  style={activeTab === tab ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : {}}>
                  {tab === "descripcion" ? "Descripción" : tab === "paradas" ? `Paradas ${waypoints.length}` : "Vehículo"}
                </button>
              ))}
            </div>

            {/* Tab: Descripción */}
            {activeTab === "descripcion" && (
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-4">
                <p className="text-slate-300 leading-relaxed">
                  Viaje directo de <strong className="text-white">{origin}</strong> a{" "}
                  <strong className="text-white">{destination}</strong> con{" "}
                  <strong className="text-white">{company.tradeName}</strong>.
                  Salida el{" "}
                  <strong className="text-white">
                    {departure.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                  </strong>{" "}
                  a las{" "}
                  <strong className="text-white">
                    {departure.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </strong>.
                </p>

                <div>
                  <h3 className="font-bold text-white mb-3">Detalles del Servicio</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Asientos numerados",
                      "Equipaje incluido",
                      "Servicio interprovincial",
                      `Capacidad: ${vehicle.capacity} pasajeros`,
                      `Placa: ${vehicle.plateNumber}`,
                      `Modo: ${vehicle.serviceMode}`,
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {company.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 pt-2 border-t border-white/5">
                    <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                    Contacto: <a href={`tel:${company.phone}`} className="text-white hover:underline">{company.phone}</a>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Paradas */}
            {activeTab === "paradas" && (
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4">Ruta: {trip.route.name}</h3>
                <div className="space-y-0">
                  {waypoints.map((wp, idx) => (
                    <div key={wp.id} className="flex items-start gap-4">
                      {/* Línea de tiempo */}
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1"
                          style={{
                            borderColor: idx === 0 ? primaryColor : idx === waypoints.length - 1 ? secondaryColor : "#475569",
                            background: idx === 0 || idx === waypoints.length - 1 ? (idx === 0 ? primaryColor : secondaryColor) : "transparent"
                          }} />
                        {idx < waypoints.length - 1 && (
                          <div className="w-0.5 h-10 bg-slate-700 mt-1" />
                        )}
                      </div>
                      {/* Info parada */}
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold ${idx === 0 || idx === waypoints.length - 1 ? "text-white" : "text-slate-300"}`}>
                              {wp.station.name}
                            </p>
                            <p className="text-xs text-slate-500">{wp.station.city}</p>
                          </div>
                          {Number(wp.basePrice) > 0 && (
                            <span className="text-xs font-bold px-2 py-1 rounded-lg"
                              style={{ background: `${primaryColor}20`, color: primaryColor }}>
                              +S/ {Number(wp.basePrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {wp.estimatedDurationMins > 0 && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            ~{wp.estimatedDurationMins} min desde parada anterior
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Vehículo */}
            {activeTab === "vehiculo" && (
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 flex-shrink-0">
                    <img src={vehicleImg} alt={typeLabel} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{typeLabel}</h3>
                    <p className="text-slate-400 text-sm">Placa: {vehicle.plateNumber}</p>
                    <p className="text-slate-400 text-sm">Capacidad: {vehicle.capacity} asientos</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-slate-500 text-xs">Tipo</p>
                    <p className="text-white font-medium">{typeLabel}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-slate-500 text-xs">Servicio</p>
                    <p className="text-white font-medium">{vehicle.serviceMode}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-slate-500 text-xs">Asientos libres</p>
                    <p className="text-white font-medium">{freeSeats} de {vehicle.capacity}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-slate-500 text-xs">Ocupación</p>
                    <p className="text-white font-medium">{occupancyPct}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Selector de asientos ──────────────────────────────────── */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-1">Selecciona tu Asiento</h3>
              <p className="text-xs text-slate-500 mb-4">
                Haz clic en un asiento disponible para seleccionarlo
              </p>

              {/* Leyenda */}
              <div className="flex gap-4 mb-4 text-xs">
                {[
                  { color: "bg-slate-700 border-slate-600", label: "Libre" },
                  { color: "border-2", label: "Seleccionado", style: { background: `${primaryColor}30`, borderColor: primaryColor } },
                  { color: "bg-slate-800 border-slate-700 opacity-40", label: "Ocupado" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded ${item.color} border`} style={item.style} />
                    <span className="text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Mapa de asientos */}
              {seats.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-w-sm">
                  {seats.map((seat: any) => {
                    const seatId = seat.id || seat.label;
                    const status = getSeatStatus(seatId);
                    return (
                      <button
                        key={seatId}
                        onClick={() => toggleSeat(seatId)}
                        disabled={status === "ocupado"}
                        title={`Asiento ${seatId} — ${status}`}
                        className={`w-10 h-10 rounded-lg border text-xs font-bold transition-all ${
                          status === "ocupado"
                            ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-40"
                            : status === "seleccionado"
                              ? "text-white scale-105 shadow-lg"
                              : "bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-white"
                        }`}
                        style={status === "seleccionado" ? {
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          borderColor: primaryColor,
                        } : {}}
                      >
                        {seatId}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-w-sm">
                  {Array.from({ length: vehicle.capacity }, (_, i) => {
                    const seatId = `S${i + 1}`;
                    const status = getSeatStatus(seatId);
                    return (
                      <button
                        key={seatId}
                        onClick={() => toggleSeat(seatId)}
                        disabled={status === "ocupado"}
                        className={`w-10 h-10 rounded-lg border text-xs font-bold transition-all ${
                          status === "ocupado"
                            ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-40"
                            : status === "seleccionado"
                              ? "text-white scale-105"
                              : "bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-400"
                        }`}
                        style={status === "seleccionado" ? {
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          borderColor: primaryColor,
                        } : {}}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSeats.length > 0 && (
                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="text-sm text-white">
                    Asiento(s) seleccionado(s): <strong>{selectedSeats.join(", ")}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── PANEL LATERAL STICKY (1/3) ───────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">

              {/* Tarjeta de reserva */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Reservar Asiento</p>
                  <p className="text-slate-400 text-xs mt-1">Asegura tu lugar antes de que se agoten.</p>
                </div>

                {/* Precio */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">PRECIO POR ASIENTO</p>
                  <div className="flex items-end gap-3 mt-1">
                    <p className="text-3xl font-extrabold" style={{ color: primaryColor }}>
                      {pricePerSeat > 0 ? `S/ ${pricePerSeat.toFixed(2)}` : "Ver precio"}
                    </p>
                    <div className="text-right pb-1">
                      <p className="text-xs font-bold" style={{ color: primaryColor }}>{freeSeats} libres</p>
                      <p className="text-xs text-slate-500">de {vehicle.capacity} total</p>
                    </div>
                  </div>
                </div>

                {/* Barra de ocupación */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Ocupación del bus</span>
                    <span>{occupancyPct}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${occupancyPct}%`,
                        background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
                      }} />
                  </div>
                </div>

                {/* Tramo */}
                {waypoints.length >= 2 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">TRAMO</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Desde</p>
                        <select
                          value={startWaypointId}
                          onChange={e => setStartWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                          {waypoints.map(wp => (
                            <option key={wp.id} value={wp.id}>{wp.station.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Hasta</p>
                        <select
                          value={endWaypointId}
                          onChange={e => setEndWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                          {waypoints.map(wp => (
                            <option key={wp.id} value={wp.id}>{wp.station.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón elegir asientos */}
                {!showForm ? (
                  <button
                    onClick={() => {
                      if (selectedSeats.length === 0) {
                        alert("Primero selecciona un asiento en el mapa.");
                        return;
                      }
                      setShowForm(true);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                    <Bus className="w-4 h-4" />
                    {selectedSeats.length > 0 ? `Reservar asiento ${selectedSeats[0]}` : "Elegir Asientos"}
                  </button>
                ) : null}

                <p className="text-xs text-slate-600 text-center">
                  Pago seguro. Cancelación gratuita hasta 24h antes.
                </p>
              </div>

              {/* Éxito de reserva */}
              {bookingSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    ¡Reserva confirmada!
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>Asiento: <strong className="text-white">{bookingSuccess.seatId}</strong></p>
                    <p>Total: <strong className="text-white">S/ {Number(bookingSuccess.totalPrice).toFixed(2)}</strong></p>
                    <p>Estado: <strong className="text-emerald-400">{bookingSuccess.paymentStatus}</strong></p>
                    <p className="text-slate-500 text-xs">ID: {bookingSuccess.id?.slice(0, 8)}...</p>
                  </div>
                </div>
              )}

              {/* Formulario de pasajero */}
              {showForm && (
                <form onSubmit={handleReserve}
                  className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Datos del Pasajero</h3>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="text-slate-500 hover:text-white text-xs transition-colors">
                      Cancelar
                    </button>
                  </div>

                  {/* Asiento seleccionado */}
                  <div className="flex items-center gap-2 p-2 rounded-lg text-xs"
                    style={{ background: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}>
                    <span style={{ color: primaryColor }}>Asiento:</span>
                    <strong className="text-white">{selectedSeats[0]}</strong>
                    {pricePerSeat > 0 && (
                      <span className="ml-auto font-bold" style={{ color: primaryColor }}>
                        S/ {pricePerSeat.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nombre completo *</label>
                    <input
                      value={passengerName}
                      onChange={e => setPassengerName(e.target.value)}
                      placeholder="Juan Pérez García"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Documento */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                      <select
                        value={passengerDocType}
                        onChange={e => setPassengerDocType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-xs focus:outline-none">
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Método de pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button"
                        onClick={() => setPaymentMethod("cash")}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          paymentMethod === "cash"
                            ? "text-white"
                            : "border-slate-700 text-slate-400 hover:text-white"
                        }`}
                        style={paymentMethod === "cash" ? {
                          background: `${primaryColor}20`,
                          borderColor: primaryColor,
                          color: primaryColor
                        } : {}}>
                        <Banknote className="w-4 h-4" /> Efectivo
                      </button>
                      <button type="button"
                        onClick={() => setPaymentMethod("digital")}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          paymentMethod === "digital"
                            ? "text-white"
                            : "border-slate-700 text-slate-400 hover:text-white"
                        }`}
                        style={paymentMethod === "digital" ? {
                          background: `${primaryColor}20`,
                          borderColor: primaryColor,
                          color: primaryColor
                        } : {}}>
                        <CreditCard className="w-4 h-4" /> Yape/Digital
                      </button>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="flex items-start gap-2 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {bookingError}
                    </div>
                  )}

                  <button type="submit" disabled={booking}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                    {booking ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Confirmar Reserva</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
