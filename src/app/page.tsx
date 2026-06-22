"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TripCard from "@/components/trips/TripCard";
import Link from "next/link";
import {
  MapPin, Calendar, Search, ArrowRightLeft, Bus, Clock,
  Filter, CarFront, Car, WifiOff,
  Ticket, Wallet, ArrowRight, Sparkles, TrendingUp,
  ChevronLeft, ChevronRight
} from "lucide-react";
import type { Trip } from "@/types/booking";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

// ─── Destinos populares (grid) ────────────────────────────────────────────────
const popularDestinations = [
  { city: "Ayacucho",      color: "from-blue-500 to-indigo-600" },
  { city: "Cusco",         color: "from-violet-500 to-purple-600" },
  { city: "Arequipa",      color: "from-orange-400 to-red-500" },
  { city: "Huancavelica",  color: "from-emerald-400 to-teal-500" },
  { city: "Tacna",         color: "from-cyan-400 to-blue-500" },
  { city: "Acobamba",      color: "from-pink-500 to-rose-500" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

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
        const res = await fetch(`${API}/api/v1/trips/search?origin=&destination=&date=`);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setHasSearched(true);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(
        `${API}/api/v1/trips/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`
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

      {/* ─── OPCIÓN A: Fondo animado global (fuera del hero para no ser cortado) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)", animationDuration: "4s" }} />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 65%)", animationDuration: "6s", animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)", animationDuration: "5s", animationDelay: "3s" }} />
      </div>

      {/* ─── HERO: Saludo + Buscador ──────────────────────────────────────── */}
      <div className="w-full pt-6 space-y-6 relative" style={{ zIndex: 1 }}>

        {/* Saludo personalizado */}
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

        {/* Formulario de búsqueda */}
        <form onSubmit={handleSearch}
          className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-4">

          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Origen */}
            <div className="relative flex-1 w-full">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              <input
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="Ciudad de origen"
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
                placeholder="Ciudad de destino"
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
          <div className="flex gap-2 flex-wrap">
            {quickFilters.map(f => (
              <button key={f.id} type="button" onClick={() => setVehicleFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  vehicleFilter === f.id
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                }`}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* ─── ACCESOS RÁPIDOS para usuario logueado (PASSENGER/DRIVER) ────── */}
      {user && (user.role === "PASSENGER" || user.role === "DRIVER") && (
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="w-full flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>Sin conexión al servidor. Los viajes se mostrarán cuando el backend esté disponible.</span>
        </div>
      )}

      {error && !networkError && (
        <div className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="w-full flex flex-col items-center gap-4 py-12">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Buscando los mejores viajes...</p>
        </div>
      )}

      {!loading && filteredResults.length > 0 && (
        <div className="w-full space-y-4">
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
        <div className="w-full flex flex-col items-center gap-4 py-16 text-center">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5">
            <Bus className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No se encontraron viajes para esa ruta</p>
          <p className="text-slate-600 text-sm">Intenta con otras fechas o ciudades</p>
        </div>
      )}

      {/* ─── OPCIÓN B: Slider de destinos ────────────────────────────────── */}
      {!hasSearched && !loading && (
        <DestinationSlider
          onSelect={(city) => setDestination(city)}
        />
      )}

      {/* ─── CTA para usuarios no logueados ──────────────────────────────── */}
      {!authLoading && !user && (
        <div className="w-full bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
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
        <MapPin className="w-5 h-5 text-cyan-400" /> Destinos populares
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
              <Search className="w-3 h-3" /> Buscar viajes a {slide.city}
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
