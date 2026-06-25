"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth";
import TripCard from "@/components/trips/TripCard";
import TicketModal from "@/components/trips/TicketModal";
import StatCard from "@/components/dashboard/StatCard";
import Link from "next/link";
import {
  MapPin, Calendar, Search, ArrowRightLeft, Bus, Clock,
  Filter, CarFront, Car, WifiOff,
  Ticket, Wallet, ArrowRight, Sparkles, TrendingUp,
  ChevronLeft, ChevronRight, Package, QrCode, Award, Shield, Info
} from "lucide-react";
import type { Trip } from "@/types/booking";

import { API_URL } from "@/lib/config";

// ─── Destinos para el slider (Opción B) ──────────────────────────────────────
const sliderDestinations = [
  {
    city: "Cusco",
    desc: "La ciudad imperial de los Incas",
    gradient: "from-violet-900/80 via-purple-800/60 to-transparent",
    bg: "from-violet-600 via-purple-700 to-indigo-900",
    emoji: "🏔️",
  },
  {
    city: "Arequipa",
    desc: "La Ciudad Blanca del sur del Perú",
    gradient: "from-orange-900/80 via-red-800/60 to-transparent",
    bg: "from-orange-500 via-red-600 to-rose-900",
    emoji: "🌋",
  },
  {
    city: "Ayacucho",
    desc: "Ciudad de las iglesias y la historia",
    gradient: "from-blue-900/80 via-indigo-800/60 to-transparent",
    bg: "from-blue-600 via-indigo-700 to-slate-900",
    emoji: "⛪",
  },
  {
    city: "Huancavelica",
    desc: "Entre montañas y tradiciones andinas",
    gradient: "from-emerald-900/80 via-teal-800/60 to-transparent",
    bg: "from-emerald-600 via-teal-700 to-cyan-900",
    emoji: "🌿",
  },
  {
    city: "Tacna",
    desc: "La ciudad heroica del extremo sur",
    gradient: "from-cyan-900/80 via-blue-800/60 to-transparent",
    bg: "from-cyan-600 via-blue-700 to-slate-900",
    emoji: "🦅",
  },
  {
    city: "Acobamba",
    desc: "Naturaleza y cultura en Huancavelica",
    gradient: "from-pink-900/80 via-rose-800/60 to-transparent",
    bg: "from-pink-600 via-rose-700 to-red-900",
    emoji: "🌸",
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // ─── Pestaña del buscador ──────────────────────────────────────────────────
  const [searchTab, setSearchTab] = useState<"pasajes" | "encomiendas">("pasajes");

  // ─── Reserva próxima (Boleto Rápido) ───────────────────────────────────────
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // ─── Para el modal de ticket ────────────────────────────────────────────────
  // (upcomingBooking se pasa directamente al nuevo TicketModal)

  // ─── Buscador ──────────────────────────────────────────────────────────────
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate]               = useState("");
  const [loading, setLoading]         = useState(false);
  const [results, setResults]         = useState<Trip[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError]             = useState("");
  const [networkError, setNetworkError] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState("Todos");

  // ─── Redirigir ADMIN/SUPER_ADMIN a su panel ────────────────────────────────
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "SUPER_ADMIN") {
        router.replace("/superadmin");
      } else if (user.role === "ADMIN") {
        router.replace("/admin");
      }
    }
  }, [authLoading, user, router]);

  // ─── Cargar viajes disponibles al inicio ───────────────────────────────────
  useEffect(() => {
    const fetchInitialTrips = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/trips/search?origin=&destination=&date=`);
        const data = await res.json();
        if (res.ok && data.trips) {
          setResults(data.trips);
          setNetworkError(false);
        }
      } catch {
        setNetworkError(true);
      }
    };
    fetchInitialTrips();
  }, []);

  // ─── Cargar el próximo viaje activo del usuario logueado ──────────────────
  useEffect(() => {
    if (!user) {
      setUpcomingBooking(null);
      return;
    }
    const fetchUserBookings = async () => {
      setLoadingBooking(true);
      try {
        const res = await authFetch(`${API_URL}/api/v1/bookings/my?page=1&limit=10`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && data.data.length > 0) {
            const now = new Date();
            // Buscar reservas futuras que estén pagadas o confirmadas
            const validBookings = data.data.filter((b: any) => {
              if (!b.trip?.departureTime) return false;
              const depTime = new Date(b.trip.departureTime);
              return depTime > now && (b.paymentStatus === 'PAID_DIGITAL' || b.paymentStatus === 'PENDING_CASH' || b.paymentStatus === 'PAID');
            });
            
            if (validBookings.length > 0) {
              // Ordenar por fecha de salida más cercana
              validBookings.sort((a: any, b: any) => new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime());
              setUpcomingBooking(validBookings[0]);
            } else {
              setUpcomingBooking(null);
            }
          } else {
            setUpcomingBooking(null);
          }
        }
      } catch (err) {
        console.error("Error al cargar reservas", err);
      } finally {
        setLoadingBooking(false);
      }
    };
    fetchUserBookings();
  }, [user]);

  const handleOpenTicket = (booking: any) => {
    if (!booking) return;
    setShowTicketModal(true);
  };


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setHasSearched(true);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/trips/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al buscar viajes");
      setResults(data.trips || []);
      setNetworkError(false);
    } catch (e: unknown) {
      const isNetErr = e instanceof TypeError && (e.message.includes("fetch") || e.message.includes("network"));
      setNetworkError(isNetErr);
      setError(isNetErr ? "No se pudo conectar al servidor." : (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => { setOrigin(destination); setDestination(origin); };

  const filteredResults = useMemo(() => {
    if (vehicleFilter === "Todos") return results;
    return results.filter(t => t.vehicleType?.toLowerCase() === vehicleFilter.toLowerCase());
  }, [results, vehicleFilter]);

  const quickFilters = [
    { id: "Todos",   label: "Todos",   icon: <Filter className="w-4 h-4" /> },
    { id: "Buscama", label: "Buscama", icon: <Bus className="w-4 h-4" /> },
    { id: "Minivan", label: "Minivan", icon: <CarFront className="w-4 h-4" /> },
    { id: "Auto",    label: "Auto",    icon: <Car className="w-4 h-4" /> },
  ];

  // Mientras redirige a admin/superadmin, no renderizar nada
  if (!authLoading && user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? null;

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-10 pb-20">

      {/* ─── Fondo animado global ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)", animationDuration: "4s" }} />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 65%)", animationDuration: "6s", animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)", animationDuration: "5s", animationDelay: "3s" }} />
      </div>

      {/* ─── HERO: Saludo ─── */}
      <div className="w-full pt-6 space-y-6 relative" style={{ zIndex: 1 }}>
        <div className="text-center space-y-2">
          {firstName ? (
            <>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{firstName}</span> 👋
              </h1>
              <p className="text-slate-400">¿A dónde viajas hoy?</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-sm font-medium mb-2">
                <Sparkles className="w-4 h-4" /> Transporte interprovincial y local
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                Encuentra tu próximo{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">viaje</span>
              </h1>
              <p className="text-slate-400 text-lg">Busca, compara y reserva en segundos</p>
            </>
          )}
        </div>
      </div>

      {/* ─── BOLETO RÁPIDO: Próximo Viaje ─── */}
      {user && upcomingBooking && (
        <div className="w-full relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5" /> Tu próximo viaje activo
                  </p>
                </div>
                
                <div className="flex items-center gap-5 flex-wrap">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-extrabold">Origen</p>
                    <p className="text-lg font-black text-white">
                      {upcomingBooking.startWaypoint?.station?.city || upcomingBooking.trip?.route?.name?.split(' - ')[0]}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center text-indigo-400 px-1">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                  
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-extrabold">Destino</p>
                    <p className="text-lg font-black text-white">
                      {upcomingBooking.endWaypoint?.station?.city || upcomingBooking.trip?.route?.name?.split(' - ')[1]}
                    </p>
                  </div>

                  <div className="border-l border-white/10 pl-4">
                    <p className="text-[10px] text-slate-500 uppercase font-extrabold">Salida</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {new Date(upcomingBooking.trip?.departureTime).toLocaleDateString("es-PE", { day: 'numeric', month: 'short' })} • {new Date(upcomingBooking.trip?.departureTime).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="border-l border-white/10 pl-4">
                    <p className="text-[10px] text-slate-500 uppercase font-extrabold">Asiento</p>
                    <p className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      {upcomingBooking.seatId}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <div className="text-center md:text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                    upcomingBooking.paymentStatus === 'PAID_DIGITAL' || upcomingBooking.paymentStatus === 'PAID'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}>
                    {upcomingBooking.paymentStatus === 'PAID_DIGITAL' || upcomingBooking.paymentStatus === 'PAID' ? '✓ PAGADO' : '● PAGO AL ABORDAR'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{upcomingBooking.passengerName}</p>
                </div>
                
                <button
                  onClick={() => handleOpenTicket(upcomingBooking)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Ver Ticket QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BUSCADOR RÁPIDO CON PESTAÑAS (TABS) ─── */}
      <div className="w-full relative z-10" style={{ zIndex: 1 }}>
        <div className="w-full bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-5">
          
          {/* Tabs */}
          <div className="flex border-b border-white/5 pb-3 gap-6">
            <button
              type="button"
              onClick={() => setSearchTab("pasajes")}
              className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all relative ${
                searchTab === "pasajes"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Ticket className="w-4 h-4 text-indigo-400" />
              Pasajes
            </button>
            <button
              type="button"
              onClick={() => setSearchTab("encomiendas")}
              className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all relative ${
                searchTab === "encomiendas"
                  ? "border-cyan-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-4 h-4 text-cyan-400" />
              Encomiendas
            </button>
          </div>

          {searchTab === "pasajes" ? (
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                {/* Origen */}
                <div className="relative flex-1 w-full">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    placeholder="¿De dónde sales? (Ej: Lima)"
                    className="w-full pl-9 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Swap */}
                <button type="button" onClick={swapLocations}
                  className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all hover:rotate-180 duration-300 shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>

                {/* Destino */}
                <div className="relative flex-1 w-full">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="¿A dónde vas? (Ej: Cusco)"
                    className="w-full pl-9 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* Fecha */}
                <div className="relative w-full md:w-48 shrink-0">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-9 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                  />
                </div>

                {/* Botón buscar */}
                <button type="submit" disabled={loading}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 shrink-0">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Search className="w-4 h-4" />}
                  {loading ? "Buscando..." : "Buscar"}
                </button>
              </div>

              {/* Filtros rápidos */}
              <div className="flex gap-2 flex-wrap pt-2">
                {quickFilters.map(f => (
                  <button key={f.id} type="button" onClick={() => setVehicleFilter(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      vehicleFilter === f.id
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                    }`}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <div className="py-2 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-300 text-sm">
                <Info className="w-5 h-5 shrink-0 text-cyan-400" />
                <div>
                  <p className="font-bold">Envío de Encomiendas Online próximamente</p>
                  <p className="text-slate-400 mt-1">Estamos integrando el sistema para registrar, cotizar y hacer el seguimiento satelital de tus paquetes interprovinciales.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl space-y-2">
                  <h4 className="text-white text-sm font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Envíos Físicos Activos
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Puedes acudir a cualquiera de nuestras agencias terminales físicas. Todos tus paquetes viajan asegurados y son monitoreados vía GPS en el vehículo de la ruta.
                  </p>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold">Cotizaciones y Soporte</h4>
                    <p className="text-xs text-slate-400 mt-1">Llama a nuestra central para cotizar tu carga o consultar estado de guías:</p>
                  </div>
                  <p className="text-sm font-black text-cyan-400 mt-3 flex items-center gap-1.5">
                    📞 (01) 555-1234
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ESTADÍSTICAS COMPACTAS (Para usuario logueado) ─── */}
      {user && (
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10 animate-in fade-in duration-500">
          <StatCard
            title="Saldo Disponible"
            value={`S/ ${user.balance?.toFixed(2) || "0.00"}`}
            subtitle="Billetera"
            icon={<Wallet className="w-5 h-5 text-indigo-400" />}
            gradient="from-indigo-500/10 to-purple-500/10"
          />
          <StatCard
            title="Viajes Completados"
            value={5}
            subtitle="Historial"
            icon={<Award className="w-5 h-5 text-emerald-400" />}
            gradient="from-emerald-500/10 to-teal-500/10"
          />
          <StatCard
            title="Nivel de Viajero"
            value="Socio VIP"
            subtitle="Plata"
            icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
            gradient="from-cyan-500/10 to-blue-500/10"
          />
        </div>
      )}

      {/* ─── ACCESOS RÁPIDOS ────── */}
      {user && (user.role === "PASSENGER" || user.role === "DRIVER") && (
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
          <QuickLink href="/reservas"  icon={<Ticket className="w-5 h-5 text-emerald-400" />}  label="Mis Reservas"  />
          <QuickLink href="/billetera" icon={<Wallet className="w-5 h-5 text-indigo-400" />}   label="Billetera"     />
          <QuickLink href="/mis-viajes" icon={<Clock className="w-5 h-5 text-cyan-400" />}     label="Mis Viajes"    />
          {user.role === "DRIVER" && (
            <QuickLink href="/crear-viaje" icon={<Bus className="w-5 h-5 text-purple-400" />}  label="Crear Viaje"   />
          )}
        </div>
      )}

      {/* ─── RESULTADOS ───────────────────────────────────────────────────── */}
      {networkError && (
        <div className="w-full flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm relative z-10">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>Sin conexión al servidor. Los viajes se mostrarán cuando el backend esté disponible.</span>
        </div>
      )}

      {error && !networkError && (
        <div className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm relative z-10">
          {error}
        </div>
      )}

      {loading && (
        <div className="w-full flex flex-col items-center gap-4 py-12 relative z-10">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Buscando los mejores viajes...</p>
        </div>
      )}

      {!loading && filteredResults.length > 0 && (
        <div className="w-full space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              {hasSearched ? `${filteredResults.length} viaje${filteredResults.length !== 1 ? "s" : ""} encontrado${filteredResults.length !== 1 ? "s" : ""}` : "Viajes disponibles"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResults.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                originName={(trip as any).originName || trip.origin || origin || "Origen"}
                destinationName={(trip as any).destinationName || trip.destination || destination || "Destino"}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && hasSearched && filteredResults.length === 0 && !error && (
        <div className="w-full flex flex-col items-center gap-4 py-16 text-center relative z-10">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5">
            <Bus className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No se encontraron viajes para esa ruta</p>
          <p className="text-slate-600 text-sm">Intenta con otras fechas o ciudades</p>
        </div>
      )}

      {/* ─── SLIDER DE DESTINOS POPULARES ────────────────────────────────── */}
      {!hasSearched && !loading && (
        <div className="w-full relative z-10">
          <DestinationSlider
            onSelect={(city) => setDestination(city)}
          />
        </div>
      )}

      {/* ─── CTA para usuarios no logueados ──────────────────────────────── */}
      {!authLoading && !user && (
        <div className="w-full bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-white font-bold text-lg">¿Eres empresa de transporte?</h3>
            <p className="text-slate-400 text-sm mt-1">Registra tu empresa y gestiona tus rutas y vehículos</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/register"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors">
              Registrarse
            </Link>
            <Link href="/login"
              className="px-5 py-2.5 border border-white/10 text-slate-300 hover:text-white font-medium rounded-xl text-sm transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}

      {/* ─── MODAL TICKET QR ────────────────────────────────────────────────── */}
      {showTicketModal && upcomingBooking && (
        <TicketModal
          open={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          ticket={{
            companyName: upcomingBooking.trip?.route?.company?.tradeName || 'Transporte',
            origin: upcomingBooking.startWaypoint?.station?.city || upcomingBooking.trip?.route?.name?.split(' - ')[0] || 'Origen',
            destination: upcomingBooking.endWaypoint?.station?.city || upcomingBooking.trip?.route?.name?.split(' - ')[1] || 'Destino',
            departureTime: upcomingBooking.trip?.departureTime || new Date().toISOString(),
            passengerName: upcomingBooking.passengerName || user?.name || 'Pasajero',
            passengerDoc: upcomingBooking.passengerDocNum || '',
            seatId: upcomingBooking.seatId || '',
            bookingId: upcomingBooking.id || 'BK-0',
            totalPrice: Number(upcomingBooking.totalPrice) || 0,
            paymentStatus: upcomingBooking.paymentStatus || 'PENDING',
            routeName: upcomingBooking.trip?.route?.name,
          }}
        />
      )}

    </div>
  );
}

// ─── Sub-componente: Acceso rápido ────────────────────────────────────────────
function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 p-3 bg-slate-900/60 border border-white/5 rounded-xl hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all group">
      <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
        {icon}
      </div>
      <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">{label}</span>
    </Link>
  );
}

// ─── Sub-componente: Slider de destinos (Opción B) ────────────────────────────
function DestinationSlider({ onSelect }: { onSelect: (city: string) => void }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % sliderDestinations.length);
    }, 4000);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goTo = (idx: number) => {
    setCurrent(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  };

  const prev = () => goTo((current - 1 + sliderDestinations.length) % sliderDestinations.length);
  const next = () => goTo((current + 1) % sliderDestinations.length);

  const slide = sliderDestinations[current];

  return (
    <div className="w-full space-y-3">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <MapPin className="w-5 h-5 text-cyan-400" /> Salidas populares desde Lima
      </h2>

      {/* Slide principal */}
      <div className="relative w-full h-52 rounded-2xl overflow-hidden group cursor-pointer"
        onClick={() => onSelect(slide.city)}>

        {/* Fondo con gradiente animado */}
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-all duration-700`} />

        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

        {/* Emoji decorativo */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-30 select-none">
          {slide.emoji}
        </div>

        {/* Contenido */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className={`absolute inset-0 bg-gradient-to-t ${slide.gradient}`} />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Destino destacado</p>
            <h3 className="text-white text-2xl font-extrabold">{slide.city}</h3>
            <p className="text-white/80 text-sm mt-0.5">{slide.desc}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 group-hover:bg-white/20 transition-colors">
              <Search className="w-3 h-3" /> Ver salidas a {slide.city}
            </div>
          </div>
        </div>

        {/* Flechas */}
        <button type="button" onClick={e => { e.stopPropagation(); prev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={e => { e.stopPropagation(); next(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Miniaturas / dots */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sliderDestinations.map((d, i) => (
          <button key={d.city} type="button" onClick={() => goTo(i)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              i === current
                ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
            }`}>
            <span>{d.emoji}</span>
            <span>{d.city}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
