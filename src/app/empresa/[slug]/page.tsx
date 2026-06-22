"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Phone, Mail, Globe, MapPin, Bus, ArrowRight,
  Clock, Users, AlertCircle, ArrowLeft, Search,
  Calendar, ArrowRightLeft, Sparkles, CheckCircle2,
  Info, Route, Menu, X, Settings
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type CompanyPublic = {
  id: string;
  tradeName: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  bannerUrl: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
  contactEmail: string | null;
};

type Trip = {
  id: string;
  departureTime: string;
  status: string;
  availableSeats: number;
  price?: number;
  route: { name: string; waypoints: any[] };
  vehicle: { plateNumber: string; vehicleType: string; capacity: number };
};

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan",
  BUS_1P: "Bus 1 Piso",
  BUS_2P: "Bus 2 Pisos",
  AUTO: "Auto",
};

type SidebarSection = "viajes" | "rutas" | "contacto" | "nosotros";

export default function EmpresaPublicaPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SidebarSection>("viajes");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Buscador y filtros
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCompany();
  }, [slug]);

  async function loadCompany() {
    setLoading(true);
    try {
      const slugStr = Array.isArray(slug) ? slug[0] : slug;
      const res = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Empresa no encontrada");
      setCompany(data.company);
      await loadTrips(data.company.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrips(companyId: string, params?: { origin?: string; destination?: string; date?: string; vehicleType?: string }) {
    setSearching(true);
    try {
      const qs = new URLSearchParams({
        companyId,
        origin: params?.origin || "",
        destination: params?.destination || "",
        date: params?.date || "",
        ...(params?.vehicleType ? { vehicleType: params.vehicleType } : {}),
        limit: "50",
      });
      const url = `${API}/api/v1/trips/search?${qs.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTrips((data.trips || []).slice(0, 50));
      }
    } catch { }
    finally { setSearching(false); }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setActiveSection("viajes");
    await loadTrips(company.id, { origin, destination, date, vehicleType: vehicleFilter });
  }

  // Filtrado local por ruta (sobre los viajes ya cargados)
  const filteredTrips = routeFilter
    ? trips.filter(t => t.route?.name === routeFilter)
    : vehicleFilter && !origin && !destination && !date
      ? trips.filter(t => t.vehicle?.vehicleType === vehicleFilter)
      : trips;

  const primaryColor = company?.primaryColor || "#6366f1";
  const secondaryColor = company?.secondaryColor || "#8b5cf6";

  // Rutas únicas de los viajes
  const uniqueRoutes = Array.from(new Set(trips.map(t => t.route?.name).filter(Boolean)));

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !company) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertCircle className="w-16 h-16 text-red-400" />
      <h1 className="text-2xl font-bold text-white">Empresa no encontrada</h1>
      <p className="text-slate-400">{error || "La empresa que buscas no existe o no está disponible."}</p>
      <Link href="/" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver al inicio
      </Link>
    </div>
  );

  const navItems: { id: SidebarSection; label: string; icon: React.ReactNode }[] = [
    { id: "viajes", label: "Nuestros Viajes", icon: <Bus className="w-5 h-5" /> },
    { id: "rutas", label: "Rutas Disponibles", icon: <Route className="w-5 h-5" /> },
    { id: "contacto", label: "Contacto", icon: <Phone className="w-5 h-5" /> },
    { id: "nosotros", label: "Sobre Nosotros", icon: <Info className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ─── FONDO ANIMADO ─────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${primaryColor}25 0%, transparent 65%)`, animationDuration: "4s" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${secondaryColor}15 0%, transparent 65%)`, animationDuration: "6s" }} />
      </div>

      {/* ─── TOPBAR DE LA EMPRESA ──────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-white/5 bg-slate-900/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          {/* Hamburger mobile */}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo + nombre */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden border border-white/10 flex items-center justify-center font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.tradeName} className="w-full h-full object-contain p-1" />
              ) : company.tradeName[0]}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{company.tradeName}</p>
              {company.city && <p className="text-slate-500 text-xs">{company.city}</p>}
            </div>
          </div>

          {/* Contacto rápido desktop */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4" style={{ color: primaryColor }} /> {company.phone}
              </a>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <Globe className="w-4 h-4" style={{ color: primaryColor }} />
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          {/* CTA Reservar */}
          <a href="#viajes"
            onClick={() => setActiveSection("viajes")}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
            Reservar <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ─── LAYOUT PRINCIPAL: SIDEBAR + CONTENIDO ─────────────────────────── */}
      <div className="relative z-10 flex flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 gap-6">

        {/* ─── SIDEBAR DE LA EMPRESA ─────────────────────────────────────── */}
        <aside className={`
          fixed lg:sticky top-[57px] lg:top-[57px] left-0 h-[calc(100vh-57px)] lg:h-auto
          w-72 lg:w-64 flex-shrink-0 z-30 lg:z-auto
          transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:flex flex-col gap-4
        `}>
          {/* Overlay mobile */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/60 lg:hidden z-[-1]" onClick={() => setSidebarOpen(false)} />
          )}

          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden h-full lg:h-auto">

            {/* Banner de la empresa */}
            <div className="h-24 relative"
              style={{
                background: company.bannerUrl
                  ? `url(${company.bannerUrl}) center/cover`
                  : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl border-2 border-white/30 overflow-hidden flex items-center justify-center font-bold text-white"
                  style={{ background: primaryColor }}>
                  {company.logoUrl
                    ? <img src={company.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                    : company.tradeName[0]}
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{company.tradeName}</p>
                  {company.city && <p className="text-white/60 text-xs">{company.city}</p>}
                </div>
              </div>
            </div>

            {/* Navegación */}
            <nav className="p-3 space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 py-2">Menú</p>
              {navItems.map(item => (
                <button key={item.id}
                  onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    activeSection === item.id
                      ? "text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                  style={activeSection === item.id ? {
                    background: `linear-gradient(135deg, ${primaryColor}25, ${secondaryColor}15)`,
                    borderLeft: `3px solid ${primaryColor}`,
                  } : {}}>
                  <span style={{ color: activeSection === item.id ? primaryColor : undefined }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Contacto rápido en sidebar */}
            <div className="p-4 border-t border-white/5 space-y-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Contacto</p>
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primaryColor }} />
                  {company.phone}
                </a>
              )}
              {company.contactEmail && (
                <a href={`mailto:${company.contactEmail}`} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="truncate">{company.contactEmail}</span>
                </a>
              )}
              {company.address && (
                <div className="flex items-start gap-2 text-slate-500 text-xs">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
                  {company.address}
                </div>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>

            {/* Acceso al panel admin (solo si el usuario es admin de esta empresa) */}
            {(() => {
              const user = typeof window !== "undefined" ? getCurrentUser() : null;
              const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
              const slugStr = Array.isArray(slug) ? slug[0] : slug;
              if (!isAdmin) return null;
              return (
                <div className="p-3 border-t border-white/5">
                  <Link href={`/empresa/${slugStr}/admin`}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-white w-full"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}20)`, border: `1px solid ${primaryColor}40` }}>
                    <Settings className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                    Panel Admin
                  </Link>
                </div>
              );
            })()}

            {/* Footer sidebar */}
            <div className="p-4 border-t border-white/5">
              <p className="text-xs text-slate-600 text-center">
                Powered by{" "}
                <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Transporte PRO
                </Link>
              </p>
            </div>
          </div>
        </aside>

        {/* ─── CONTENIDO PRINCIPAL ───────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-6" id="viajes">

          {/* ── SECCIÓN: VIAJES ─────────────────────────────────────────── */}
          {activeSection === "viajes" && (
            <div className="space-y-6">
              {/* Hero */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border"
                  style={{ background: `${primaryColor}15`, borderColor: `${primaryColor}30`, color: primaryColor }}>
                  <Sparkles className="w-3.5 h-3.5" /> Viajes seguros y puntuales
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                  Reserva con{" "}
                  <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}>
                    {company.tradeName}
                  </span>
                </h2>
                {company.description && <p className="text-slate-400 text-sm">{company.description}</p>}
              </div>

              {/* Buscador */}
              <form onSubmit={handleSearch}
                className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  <div className="relative flex-1 w-full">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: primaryColor }} />
                    <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ciudad de origen"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors" />
                  </div>
                  <button type="button" onClick={() => { setOrigin(destination); setDestination(origin); }}
                    className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all hover:rotate-180 duration-300 shrink-0">
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                  <div className="relative flex-1 w-full">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: secondaryColor }} />
                    <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ciudad de destino"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors" />
                  </div>
                  <div className="relative w-full md:w-44 shrink-0">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none transition-colors [color-scheme:dark]" />
                  </div>
                  <button type="submit" disabled={searching}
                    className="w-full md:w-auto px-6 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                    {searching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                    {searching ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {/* Filtros rápidos */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Filtro por tipo de vehículo */}
                  {Object.entries(vehicleTypeLabel).map(([key, label]) => (
                    <button key={key} type="button"
                      onClick={() => setVehicleFilter(vehicleFilter === key ? "" : key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        vehicleFilter === key
                          ? "text-white border-transparent"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                      style={vehicleFilter === key ? { background: `${primaryColor}30`, borderColor: primaryColor, color: primaryColor } : {}}>
                      🚌 {label}
                    </button>
                  ))}

                  {/* Filtro por ruta */}
                  {uniqueRoutes.length > 0 && (
                    <select
                      value={routeFilter}
                      onChange={e => setRouteFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800/50 text-slate-400 focus:outline-none transition-colors">
                      <option value="">Todas las rutas</option>
                      {uniqueRoutes.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}

                  {/* Limpiar filtros */}
                  {(vehicleFilter || routeFilter || origin || destination || date) && (
                    <button type="button"
                      onClick={() => { setVehicleFilter(""); setRouteFilter(""); setOrigin(""); setDestination(""); setDate(""); if (company) loadTrips(company.id); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                      ✕ Limpiar filtros
                    </button>
                  )}
                </div>
              </form>

              {/* Lista de viajes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-400">
                    {filteredTrips.length > 0
                      ? `${filteredTrips.length} viaje${filteredTrips.length !== 1 ? "s" : ""} encontrado${filteredTrips.length !== 1 ? "s" : ""}`
                      : "Sin resultados"}
                    {(vehicleFilter || routeFilter) && (
                      <span className="ml-2 text-xs text-slate-600">(filtrado de {trips.length} total)</span>
                    )}
                  </p>
                </div>
                {searching ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse" />)}
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-10 text-center">
                    <Bus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No hay viajes disponibles</p>
                    <p className="text-slate-600 text-sm mt-1">Prueba con otras fechas o destinos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTrips.map(trip => {
                      const departure = new Date(trip.departureTime);
                      const waypoints = trip.route?.waypoints?.sort((a: any, b: any) => a.stopOrder - b.stopOrder) || [];
                      const orig = waypoints[0]?.station?.name || "";
                      const dest = waypoints[waypoints.length - 1]?.station?.name || "";
                      const typeLabel = vehicleTypeLabel[trip.vehicle?.vehicleType] || trip.vehicle?.vehicleType;

                      // Imagen: usar la foto real del vehículo si existe, sino imagen genérica por tipo
                      const vehicleImages: Record<string, string> = {
                        BUS_2P: "https://i.imgur.com/8QkXqzP.png",
                        BUS_1P: "https://i.imgur.com/3nYcmEf.png",
                        MINIVAN: "https://i.imgur.com/7vQkLpN.png",
                        AUTO: "https://i.imgur.com/2xRmKjT.png",
                      };
                      const vehicleImg = (trip.vehicle as any)?.imageUrl || vehicleImages[trip.vehicle?.vehicleType] || vehicleImages["BUS_1P"];

                      return (
                        <Link key={trip.id} href={`/empresa/${Array.isArray(slug) ? slug[0] : slug}/viaje/${trip.id}`}
                          className="group block bg-slate-900/80 border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 hover:shadow-lg transition-all duration-200"
                          style={{ borderColor: "rgba(255,255,255,0.06)" }}>

                          {/* Layout: info izquierda + imagen derecha */}
                          <div className="flex items-stretch">

                            {/* ── INFO IZQUIERDA ─────────────────────────── */}
                            <div className="flex-1 p-4 space-y-2 min-w-0">

                              {/* Empresa + ruta */}
                              <div>
                                <p className="text-xs text-slate-500">
                                  <span className="font-bold text-slate-300">EMPRESA:</span> {company.tradeName}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  <span className="font-bold text-slate-300">CARRO:</span> {typeLabel} {trip.vehicle?.plateNumber}
                                </p>
                                <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>
                                  ASIENTOS LIBRES: {trip.availableSeats ?? trip.vehicle?.capacity}
                                </p>
                              </div>

                              {/* Ruta origen → destino */}
                              {(orig || dest) && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <span className="text-slate-200 font-medium truncate">{orig}</span>
                                  <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-600" />
                                  <span className="text-slate-200 font-medium truncate">{dest}</span>
                                </div>
                              )}

                              {/* Hora de salida */}
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-300">HORA SALIDA:</p>
                                <p className="text-xs text-slate-400">
                                  <span className="text-slate-500">-Aproximada:</span>{" "}
                                  <span className="text-slate-200">{departure.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
                                </p>
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                                  style={{ background: "rgba(30,30,40,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                  <span className="text-slate-500">-Confirmada:</span>{" "}
                                  <span className="text-white font-bold">{departure.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              </div>
                            </div>

                            {/* ── IMAGEN + PRECIO DERECHA ─────────────────── */}
                            <div className="w-36 flex-shrink-0 relative flex flex-col items-center justify-between p-3 bg-slate-800/40">
                              {/* Imagen del vehículo */}
                              <div className="w-full h-20 flex items-center justify-center">
                                <img
                                  src={vehicleImg}
                                  alt={typeLabel}
                                  className="w-full h-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                                  onError={e => {
                                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9h16v2H4z'/%3E%3C/svg%3E";
                                  }}
                                />
                              </div>

                              {/* Precio */}
                              <div className="mt-2 px-3 py-1.5 rounded-xl text-sm font-bold text-white text-center w-full"
                                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                                {trip.price
                                  ? `S/ ${Number(trip.price).toFixed(1)}`
                                  : "Ver precio"}
                              </div>
                            </div>
                          </div>

                          {/* Fecha en footer */}
                          <div className="px-4 py-2 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs text-slate-500">
                              {departure.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <span className="text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                              style={{ color: primaryColor }}>
                              Reservar <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECCIÓN: RUTAS ──────────────────────────────────────────── */}
          {activeSection === "rutas" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Rutas Disponibles</h2>
              {uniqueRoutes.length === 0 ? (
                <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-10 text-center">
                  <Route className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay rutas disponibles actualmente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uniqueRoutes.map((routeName, i) => {
                    const routeTrips = trips.filter(t => t.route?.name === routeName);
                    const waypoints = routeTrips[0]?.route?.waypoints?.sort((a: any, b: any) => a.stopOrder - b.stopOrder) || [];
                    return (
                      <div key={i} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${primaryColor}20` }}>
                            <Route className="w-5 h-5" style={{ color: primaryColor }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{routeName}</h3>
                            <p className="text-slate-500 text-xs">{routeTrips.length} viaje{routeTrips.length !== 1 ? "s" : ""} programado{routeTrips.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        {waypoints.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400">
                            {waypoints.map((wp: any, idx: number) => (
                              <span key={idx} className="flex items-center gap-1.5">
                                <span className="text-slate-300">{wp.station?.name || wp.locationName}</span>
                                {idx < waypoints.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                              </span>
                            ))}
                          </div>
                        )}
                        <button onClick={() => setActiveSection("viajes")}
                          className="mt-3 text-xs font-medium flex items-center gap-1 transition-colors"
                          style={{ color: primaryColor }}>
                          Ver viajes disponibles <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SECCIÓN: CONTACTO ───────────────────────────────────────── */}
          {activeSection === "contacto" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Información de Contacto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all">
                    <div className="p-3 rounded-xl" style={{ background: `${primaryColor}20` }}>
                      <Phone className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Teléfono</p>
                      <p className="text-white font-bold">{company.phone}</p>
                    </div>
                  </a>
                )}
                {company.contactEmail && (
                  <a href={`mailto:${company.contactEmail}`} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all">
                    <div className="p-3 rounded-xl" style={{ background: `${primaryColor}20` }}>
                      <Mail className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Email</p>
                      <p className="text-white font-bold">{company.contactEmail}</p>
                    </div>
                  </a>
                )}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all">
                    <div className="p-3 rounded-xl" style={{ background: `${primaryColor}20` }}>
                      <Globe className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Sitio Web</p>
                      <p className="text-white font-bold">{company.website.replace(/^https?:\/\//, "")}</p>
                    </div>
                  </a>
                )}
                {company.address && (
                  <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: `${primaryColor}20` }}>
                      <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Dirección</p>
                      <p className="text-white font-bold">{company.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECCIÓN: NOSOTROS ───────────────────────────────────────── */}
          {activeSection === "nosotros" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Sobre {company.tradeName}</h2>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
                {company.description ? (
                  <p className="text-slate-300 leading-relaxed">{company.description}</p>
                ) : (
                  <p className="text-slate-500 italic">Esta empresa aún no ha agregado una descripción.</p>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-2xl font-bold" style={{ color: primaryColor }}>{trips.length}</p>
                    <p className="text-slate-400 text-sm">Viajes disponibles</p>
                  </div>
                  <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-2xl font-bold" style={{ color: primaryColor }}>{uniqueRoutes.length}</p>
                    <p className="text-slate-400 text-sm">Rutas activas</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
