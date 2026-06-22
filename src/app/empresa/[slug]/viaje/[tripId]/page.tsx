"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bus, Clock, Users, CheckCircle2, AlertCircle,
  Share2, Heart, ChevronRight, Loader2, CreditCard, Banknote,
  Phone, ArrowRight, Ticket
} from "lucide-react";
import SeatMapModal from "@/components/ui/SeatMapModal";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
      bannerUrl: string | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      phone: string | null;
      description: string | null;
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

type CompanyPublic = {
  id: string;
  tradeName: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  phone: string | null;
  description: string | null;
};

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan", BUS_1P: "Bus 1 Piso", BUS_2P: "Bus 2 Pisos", AUTO: "Auto",
};

const vehicleImages: Record<string, string> = {
  BUS_2P: "https://i.imgur.com/8QkXqzP.png",
  BUS_1P: "https://i.imgur.com/3nYcmEf.png",
  MINIVAN: "https://i.imgur.com/7vQkLpN.png",
  AUTO: "https://i.imgur.com/2xRmKjT.png",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: "A TIEMPO",   color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  BOARDING:  { label: "ABORDANDO",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  IN_TRANSIT:{ label: "EN RUTA",    color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  COMPLETED: { label: "COMPLETADO", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
  CANCELLED: { label: "CANCELADO",  color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

export default function EmpresaViajeDetailPage() {
  const { slug, tripId } = useParams();
  const router = useRouter();

  const slugStr = Array.isArray(slug) ? slug[0] : slug;
  const tripIdStr = Array.isArray(tripId) ? tripId[0] : tripId;

  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"descripcion" | "paradas" | "vehiculo">("descripcion");
  const [startWaypointId, setStartWaypointId] = useState("");
  const [endWaypointId, setEndWaypointId] = useState("");

  // Modal de venta fullscreen
  const [seatModalOpen, setSeatModalOpen] = useState(false);

  // Notificación de venta exitosa (desde el modal)
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [slugStr, tripIdStr]);

  async function loadData() {
    setLoading(true);
    try {
      const [companyRes, tripRes] = await Promise.all([
        fetch(`${API}/api/v1/branding/slug/${slugStr}`),
        fetch(`${API}/api/v1/trips/${tripIdStr}`),
      ]);
      const [companyData, tripData] = await Promise.all([
        companyRes.json(),
        tripRes.json(),
      ]);
      if (!companyRes.ok) throw new Error(companyData.error || "Empresa no encontrada");
      if (!tripRes.ok) throw new Error(tripData.error || "Viaje no encontrado");

      setCompany(companyData.company);
      setTrip(tripData.trip);
      setOccupiedSeats(tripData.occupiedSeats || []);

      const wps = tripData.trip?.route?.waypoints || [];
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

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-slate-400 text-sm">Cargando viaje...</p>
        </div>
      </div>
    );
  }

  if (error || !trip || !company) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertCircle className="w-16 h-16 text-red-400" />
      <h1 className="text-2xl font-bold text-white">Viaje no encontrado</h1>
      <p className="text-slate-400">{error}</p>
      <button onClick={() => router.push(`/empresa/${slugStr}`)}
        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver a {company?.tradeName || "la empresa"}
      </button>
    </div>
  );

  const waypoints = trip.route.waypoints;
  const origin = waypoints[0]?.station?.name || "";
  const destination = waypoints[waypoints.length - 1]?.station?.name || "";
  const departure = new Date(trip.departureTime);
  const vehicle = trip.vehicle;
  const primaryColor = company.primaryColor || "#6366f1";
  const secondaryColor = company.secondaryColor || "#8b5cf6";
  const statusInfo = statusConfig[trip.status] || statusConfig.SCHEDULED;
  const vehicleImg = vehicle.imageUrl || vehicleImages[vehicle.vehicleType] || vehicleImages.BUS_1P;
  const typeLabel = vehicleTypeLabel[vehicle.vehicleType] || vehicle.vehicleType;
  const pricePerSeat = calcPrice();
  const freeSeats = vehicle.capacity - occupiedSeats.length;
  const occupancyPct = Math.round((occupiedSeats.length / vehicle.capacity) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Fondo animado */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 65%)`, animationDuration: "4s" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${secondaryColor}12 0%, transparent 65%)`, animationDuration: "6s" }} />
      </div>

      {/* ─── TOPBAR ──────────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-white/5 bg-slate-900/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.push(`/empresa/${slugStr}`)}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden border border-white/10 flex items-center justify-center font-bold text-white text-xs"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
              {company.logoUrl
                ? <img src={company.logoUrl} alt={company.tradeName} className="w-full h-full object-contain p-0.5" />
                : company.tradeName[0]}
            </div>
            <div className="min-w-0">
              <Link href={`/empresa/${slugStr}`}
                className="font-bold text-white text-sm hover:opacity-80 transition-opacity truncate block">
                {company.tradeName}
              </Link>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <ChevronRight className="w-3 h-3" />
                <span className="truncate">{origin} → {destination}</span>
              </div>
            </div>
          </div>
          {company.phone && (
            <a href={`tel:${company.phone}`}
              className="hidden md:flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
              <Phone className="w-4 h-4" style={{ color: primaryColor }} />
              {company.phone}
            </a>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── COLUMNA IZQUIERDA (2/3) ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero */}
            <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-slate-900/60" style={{ height: "280px" }}>
              <img src={vehicleImg} alt={typeLabel} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}>
                  {statusInfo.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 text-slate-300 border border-white/10">
                  {typeLabel}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-400 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                {company.logoUrl && (
                  <img src={company.logoUrl} alt={company.tradeName}
                    className="w-8 h-8 rounded-lg object-contain border border-white/20 bg-slate-900/60 p-0.5" />
                )}
                <span className="text-white font-bold text-sm drop-shadow">{company.tradeName}</span>
              </div>
            </div>

            {/* Título */}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Viaje: {origin} <span className="text-slate-500">→</span> {destination}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Bus className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-slate-400 text-sm">{company.tradeName}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Users className="w-4 h-4 text-indigo-400" />, value: freeSeats, label: "ASIENTOS LIBRES" },
                { icon: <Users className="w-4 h-4 text-slate-400" />, value: occupiedSeats.length, label: "PASAJEROS" },
                { icon: <Clock className="w-4 h-4 text-emerald-400" />,
                  value: departure.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
                  label: "SALIDA" },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/60 border border-white/5 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-1">{stat.icon}</div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 w-fit">
              {(["descripcion", "paradas", "vehiculo"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                  Viaje de <strong className="text-white">{origin}</strong> a{" "}
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
                {company.description && (
                  <p className="text-slate-400 text-sm border-t border-white/5 pt-4">{company.description}</p>
                )}
                <div>
                  <h3 className="font-bold text-white mb-3">Detalles del Servicio</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Asientos numerados", "Equipaje incluido",
                      `Capacidad: ${vehicle.capacity} pasajeros`,
                      `Placa: ${vehicle.plateNumber}`,
                      `Modo: ${vehicle.serviceMode}`,
                      `Tipo: ${typeLabel}`,
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
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1"
                          style={{
                            borderColor: idx === 0 ? primaryColor : idx === waypoints.length - 1 ? secondaryColor : "#475569",
                            background: idx === 0 || idx === waypoints.length - 1
                              ? (idx === 0 ? primaryColor : secondaryColor) : "transparent"
                          }} />
                        {idx < waypoints.length - 1 && <div className="w-0.5 h-10 bg-slate-700 mt-1" />}
                      </div>
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
                          <p className="text-xs text-slate-600 mt-0.5">~{wp.estimatedDurationMins} min desde parada anterior</p>
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
                  {[
                    { label: "Tipo", value: typeLabel },
                    { label: "Servicio", value: vehicle.serviceMode },
                    { label: "Asientos libres", value: `${freeSeats} de ${vehicle.capacity}` },
                    { label: "Ocupación", value: `${occupancyPct}%` },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-slate-500 text-xs">{item.label}</p>
                      <p className="text-white font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── PANEL LATERAL STICKY (1/3) ───────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">

              {/* Tarjeta de reserva */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Venta de Pasaje</p>
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
                      style={{ width: `${occupancyPct}%`, background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }} />
                  </div>
                </div>

                {/* Tramo */}
                {waypoints.length >= 2 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">TRAMO</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Desde</p>
                        <select value={startWaypointId} onChange={e => setStartWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                          {waypoints.map(wp => <option key={wp.id} value={wp.id}>{wp.station.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Hasta</p>
                        <select value={endWaypointId} onChange={e => setEndWaypointId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                          {waypoints.map(wp => <option key={wp.id} value={wp.id}>{wp.station.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BOTÓN VENDER PASAJE ── */}
                <button
                  onClick={() => setSeatModalOpen(true)}
                  className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all hover:opacity-90 hover:scale-[1.02] flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    boxShadow: `0 8px 25px ${primaryColor}40`
                  }}>
                  <Ticket className="w-5 h-5" />
                  Vender Pasaje
                </button>

                <p className="text-xs text-slate-600 text-center">
                  Pago seguro. Cancelación gratuita hasta 24h antes.
                </p>
              </div>

              {/* Notificación de venta exitosa */}
              {bookingSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" /> ¡Venta confirmada!
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>Asiento: <strong className="text-white">{bookingSuccess.seatId}</strong></p>
                    <p>Total: <strong className="text-white">S/ {Number(bookingSuccess.totalPrice).toFixed(2)}</strong></p>
                    <p>Estado: <strong className="text-emerald-400">{bookingSuccess.paymentStatus}</strong></p>
                    <p className="text-slate-500 text-xs">ID: {bookingSuccess.id?.slice(0, 8)}...</p>
                  </div>
                  <Link href={`/empresa/${slugStr}`}
                    className="mt-2 text-xs flex items-center gap-1 transition-colors"
                    style={{ color: primaryColor }}>
                    <ArrowLeft className="w-3 h-3" /> Ver más viajes de {company.tradeName}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL FULLSCREEN DE VENTA ─────────────────────────────────────── */}
      <SeatMapModal
        open={seatModalOpen}
        onClose={() => setSeatModalOpen(false)}
        tripId={trip.id}
        vehicleType={vehicle.vehicleType}
        vehicleCapacity={vehicle.capacity}
        seatTemplate={vehicle.seatTemplate}
        occupiedSeats={occupiedSeats}
        waypoints={waypoints}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        companyName={company.tradeName}
        routeName={trip.route.name}
        departureTime={trip.departureTime}
        onSaleSuccess={(receipt) => {
          setOccupiedSeats(prev => [...prev, receipt.seatId]);
          setBookingSuccess(receipt);
        }}
      />
    </div>
  );
}
