"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Phone, Mail, Globe, MapPin, Bus, ArrowRight,
  Clock, Users, AlertCircle, ArrowLeft, Search,
  Calendar, ArrowRightLeft, Sparkles, CheckCircle2,
  Info, Route, Menu, X, Settings, Lock, Eye, EyeOff, Loader2,
  Bell, ChevronDown, ExternalLink, Copy, Check, SlidersHorizontal
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { getCompanyBySlug, getCompanyById } from "@/lib/api/branding";
import { searchTrips } from "@/lib/api/trips";
import dynamic from "next/dynamic";
import EmpresaBottomNav from "@/components/layout/EmpresaBottomNav";

const AdminDashboard = dynamic(() => import("./admin/page"), { ssr: false });
const AdminVenta = dynamic(() => import("./admin/venta/page"), { ssr: false });
const AdminViajes = dynamic(() => import("./admin/viajes/page"), { ssr: false });
const AdminRutas = dynamic(() => import("./admin/rutas/page"), { ssr: false });
const AdminVehiculos = dynamic(() => import("./admin/vehiculos/page"), { ssr: false });
const AdminConductores = dynamic(() => import("./admin/conductores/page"), { ssr: false });
const AdminVendedores = dynamic(() => import("./admin/vendedores/page"), { ssr: false });
const AdminPerfil = dynamic(() => import("./admin/perfil/page"), { ssr: false });
const MapaInteractivo = dynamic(() => import("@/components/map/MapaInteractivo"), { ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  ),
});

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
  sliderImages?: string[];
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

const tripStatusConfig: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
  SCHEDULED:  { label: "Programado", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  BOARDING:   { label: "Abordando",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)", pulse: true },
  IN_TRANSIT: { label: "En Ruta",    color: "#6366f1", bg: "rgba(99,102,241,0.12)", pulse: true },
  COMPLETED:  { label: "Finalizado", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  CANCELLED:  { label: "Cancelado",  color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

type SidebarSection = "viajes" | "rutas" | "contacto" | "nosotros" | "mapa" | "admin-dashboard" | "admin-venta" | "admin-viajes" | "admin-rutas" | "admin-vehiculos" | "admin-conductores" | "admin-vendedores" | "admin-perfil";

// ─── COUNTDOWN BADGE COMPONENT ────────────────────────────────────────────────
function CountdownBadge({ departureTime, isPast }: { departureTime: string; isPast: boolean }) {
  const calcRemaining = () => {
    const diff = new Date(departureTime).getTime() - Date.now();
    return diff;
  };

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    // Only tick if departure is in the future and within 7 days
    if (isPast || remaining <= 0 || remaining > 7 * 24 * 3600 * 1000) return;

    // Tick every second when under 1 minute; every 30s otherwise
    const interval = remaining < 60_000 ? 1000 : 30_000;
    const timer = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [remaining, isPast, departureTime]);

  const formatCountdown = (ms: number): { label: string; color: string; bg: string; pulse: boolean } => {
    if (ms <= 0) return { label: "¡Partió!", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", pulse: false };
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (days >= 1) return { label: `Faltan ${days}d`, color: "#6366f1", bg: "rgba(99,102,241,0.1)", pulse: false };
    if (hours >= 1) return { label: `Faltan ${hours}h`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", pulse: false };
    if (mins >= 1) return { label: `Faltan ${mins}min`, color: "#f97316", bg: "rgba(249,115,22,0.12)", pulse: true };
    return { label: `${secs}s`, color: "#ef4444", bg: "rgba(239,68,68,0.15)", pulse: true };
  };

  // Don't show badge for past trips or departures > 7 days away
  if (isPast) {
    return <span className="text-[10px] text-slate-600 font-semibold">Viaje finalizado</span>;
  }
  if (remaining > 7 * 24 * 3600 * 1000) {
    // For far-future trips: just show the date
    const dateStr = new Date(departureTime).toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" });
    return <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{dateStr}</span>;
  }

  const { label, color, bg, pulse } = formatCountdown(remaining);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${pulse ? "animate-pulse" : ""}`}
      style={{ background: bg, borderColor: `${color}30`, color }}
    >
      <Clock className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

export default function EmpresaPublicaPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SidebarSection>("viajes");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const { login, logout } = useAuth();

  // Un usuario es "staff de la empresa" si:
  // 1. Es SUPER_ADMIN (acceso global)
  // 2. Es ADMIN o AGENCY_SELLER Y su companyId coincide con el id de la empresa cargada
  // 3. Es ADMIN o AGENCY_SELLER Y no tiene companyId asignado aún (fallback permisivo)
  // Nota: también se acepta si el role es ADMIN sin importar companyId, ya que
  // el backend protege los endpoints con autenticación real.
  const isCompanyStaff = !!(
    currentUser &&
    (currentUser.role === "SUPER_ADMIN" ||
      (currentUser.role === "ADMIN" || currentUser.role === "AGENCY_SELLER"))
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Buscador y filtros
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Dropdown de origen/destino ───────────────────────────────────────────────
  const [originOpen, setOriginOpen] = useState(false);
  const [destOpen, setDestOpen]     = useState(false);
  const originDropRef = useRef<HTMLDivElement>(null);
  const destDropRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (originDropRef.current && !originDropRef.current.contains(e.target as Node))
        setOriginOpen(false);
      if (destDropRef.current && !destDropRef.current.contains(e.target as Node))
        setDestOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Contar filtros secundarios activos
  const activeFilterCount = [
    vehicleFilter !== "",
    routeFilter !== "",
    timeFilter !== ""
  ].filter(Boolean).length;

  // Estado del mapa embebido
  const [mapaViajes, setMapaViajes] = useState<import('@/components/map/MapaInteractivo').ViajeMapa[]>([]);
  const [mapaSeleccionado, setMapaSeleccionado] = useState<import('@/components/map/MapaInteractivo').ViajeMapa | null>(null);
  const [mapaLoading, setMapaLoading] = useState(false);
  const [mapaRutas, setMapaRutas] = useState<import('@/components/map/MapaInteractivo').RutaMapa[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<import('@/components/map/MapaInteractivo').RutaMapa | null>(null);

  useEffect(() => {
    loadCompany();
    // Leer el usuario del localStorage en el cliente
    const user = getCurrentUser();
    setCurrentUser(user);
  }, [slug]);

  // Navegación entrante desde otra ruta (ej. la barra inferior de /viaje/[tripId])
  // vía ?section=admin-venta o ?menu=1. Se aplica una sola vez y se limpia la URL.
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const menuParam = searchParams.get("menu");
    if (!sectionParam && !menuParam) return;
    if (sectionParam) setActiveSection(sectionParam as SidebarSection);
    if (menuParam) setSidebarOpen(true);
    const slugStr = Array.isArray(slug) ? slug[0] : slug;
    router.replace(`/empresa/${slugStr}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (company && currentUser) {
      if (!isCompanyStaff && activeSection.startsWith("admin-")) {
        setActiveSection("viajes");
      }
    }
  }, [company?.id, currentUser, activeSection, isCompanyStaff]);

  // Refrescar los viajes al volver a la sección "Nuestros Viajes" desde el panel
  // administrativo (p. ej. tras vender un pasaje), para reflejar los asientos vendidos.
  const previousSectionRef = useRef<SidebarSection>("viajes");
  useEffect(() => {
    const cameFromAdmin = previousSectionRef.current !== "viajes";
    previousSectionRef.current = activeSection;
    if (activeSection === "viajes" && cameFromAdmin && company) {
      loadTrips(company.id, { origin, destination, date, vehicleType: vehicleFilter });
    }
  }, [activeSection]);

  useEffect(() => {
    // Definimos imágenes por defecto si la empresa no ha subido ninguna
    const images = company?.sliderImages?.filter(Boolean).length 
      ? company.sliderImages.filter(Boolean)
      : [
          "https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1920&auto=format&fit=crop", // Peru Cusco
          "https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=1920&auto=format&fit=crop", // Machu Picchu
          "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1920&auto=format&fit=crop"  // Travel Bus
        ];
        
    // The total number of slides is images.length + 1 (the map slide)
    const totalSlides = images.length + 1;
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(interval);
  }, [company]);

  async function loadCompany() {
    setLoading(true);
    try {
      const slugStr = Array.isArray(slug) ? slug[0] : slug;

      // Intentar primero por slug; si no encontró, intentar por ID/RUC (cuando la empresa no tiene slug aún)
      let data: any;
      try {
        data = await getCompanyBySlug<any>(slugStr as string);
      } catch {
        data = await getCompanyById<any>(slugStr as string);
      }

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
      const data = await searchTrips<any>({
        companyId,
        origin: params?.origin,
        destination: params?.destination,
        date: params?.date,
        vehicleType: params?.vehicleType,
        limit: 50,
      });
      setTrips((data.trips || []).slice(0, 50));
    } catch { }
    finally { setSearching(false); }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setActiveSection("viajes");
    await loadTrips(company.id, { origin, destination, date, vehicleType: vehicleFilter });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      const user = getCurrentUser();
      setCurrentUser(user);
      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
      
      // Activar panel admin dentro de la misma SPA según el rol del usuario
      if (user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
        setActiveSection("admin-dashboard");
      } else if (user && user.role === "AGENCY_SELLER") {
        // El vendedor va directo a Venta de Pasajes (no tiene acceso a endpoints de management)
        setActiveSection("admin-venta");
      }
    } catch (err: any) {
      setLoginError(err.message || "Credenciales incorrectas.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setCurrentUser(null);
    setActiveSection("viajes");
  }

  // Filtrado local
  const filteredTrips = trips.filter(t => {
    // 1. Filtro por ruta
    if (routeFilter && t.route?.name !== routeFilter) return false;
    
    // 2. Filtro por vehículo
    if (vehicleFilter && t.vehicle?.vehicleType !== vehicleFilter) return false;
    
    // 3. Filtro por tiempo (cubre tanto pasado como futuro para no ocultar viajes próximos)
    if (timeFilter) {
      const tripDate = new Date(t.departureTime);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (timeFilter === "hoy") {
        if (tripDate < startOfToday || tripDate > endOfToday) return false;
      } else if (timeFilter === "semana") {
        const pastWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        const nextWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (tripDate < pastWeek || tripDate > nextWeek) return false;
      } else if (timeFilter === "mes") {
        const pastMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        const nextMonth = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (tripDate < pastMonth || tripDate > nextMonth) return false;
      } else if (timeFilter === "ano") {
        const pastYear = new Date(startOfToday.getTime() - 365 * 24 * 60 * 60 * 1000);
        const nextYear = new Date(startOfToday.getTime() + 365 * 24 * 60 * 60 * 1000);
        if (tripDate < pastYear || tripDate > nextYear) return false;
      }
    }
    
    return true;
  });

  // Ordenar: los viajes más recientes (o próximos) primero
  const sortedTrips = [...filteredTrips].sort(
    (a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime()
  );


  const primaryColor = company?.primaryColor || "#6366f1";
  const secondaryColor = company?.secondaryColor || "#8b5cf6";

  // Rutas únicas de los viajes
  const uniqueRoutes = Array.from(new Set(trips.map(t => t.route?.name).filter(Boolean)));

  // ── Ciudades disponibles derivadas de los viajes reales de la empresa ─────────
  const availableOrigins = useMemo(() => {
    const cities = new Set<string>();
    trips.forEach(t => {
      const wps = t.route?.waypoints || [];
      const city = wps[0]?.station?.city || wps[0]?.station?.name;
      if (city) cities.add(city);
    });
    return Array.from(cities).sort();
  }, [trips]);

  const availableDestinations = useMemo(() => {
    const cities = new Set<string>();
    trips.forEach(t => {
      const wps = t.route?.waypoints || [];
      if (wps.length < 2) return;
      const firstCity = wps[0]?.station?.city || wps[0]?.station?.name;
      const lastCity  = wps[wps.length - 1]?.station?.city || wps[wps.length - 1]?.station?.name;
      if (!lastCity) return;
      // Cascada: si hay origen seleccionado solo mostramos destinos alcanzables desde él
      if (!origin || firstCity === origin) cities.add(lastCity);
    });
    return Array.from(cities).sort();
  }, [trips, origin]);

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

  // Cargar viajes y rutas del mapa cuando se activa esa sección
  async function loadMapaViajes() {
    if (mapaViajes.length > 0) return; // ya cargados
    setMapaLoading(true);
    try {
      if (company) {
        {
          const data = await searchTrips<any>({ companyId: company.id, limit: 50 });
          const trips: Trip[] = Array.isArray(data) ? data : (data.trips || data.data || []);

          // Helper: extrae {lat, lng} desde station.location.coordinates (GeoJSON: [lng, lat])
          const getCoords = (station: any): { lat: number; lng: number } | null => {
            const coords = station?.location?.coordinates;
            if (Array.isArray(coords) && coords.length === 2 && coords[0] !== 0) {
              return { lat: Number(coords[1]), lng: Number(coords[0]) };
            }
            return null;
          };

          // ── Viajes para el modo "En Vivo" ────────────────────────────────
          const viajesConCoordenadas = trips
            .filter((t: Trip) => t.route?.waypoints?.length)
            .map((t: Trip) => {
              const wps = t.route!.waypoints!.sort((a: any, b: any) => a.stopOrder - b.stopOrder);
              const firstCoords = getCoords(wps[0]?.station);
              return {
                id: t.id,
                origen: wps[0]?.station?.name || 'Origen',
                destino: wps[wps.length - 1]?.station?.name || 'Destino',
                conductor: company.tradeName,
                categoria: t.vehicle?.vehicleType === 'MINIVAN' ? 'minivan' : t.vehicle?.vehicleType === 'AUTO' ? 'auto' : 'bus',
                estado: t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS',
                coordenadas: firstCoords ?? { lat: -12.0464, lng: -77.0428 },
                precio: t.price || 0,
                urlimagen: (t.vehicle as any)?.imageUrl,
                pasajerosRestantes: t.availableSeats ?? 0,
              };
            });

          // ── Rutas únicas para el modo "Red de Rutas" ─────────────────────
          const rutasMap = new Map<string, import('@/components/map/MapaInteractivo').RutaMapa>();
          trips.forEach((t: Trip) => {
            if (!t.route?.waypoints?.length) return;
            const rId = (t.route as any).id || t.route.name;
            if (rutasMap.has(rId)) return;
            const wps = t.route!.waypoints!.sort((a: any, b: any) => a.stopOrder - b.stopOrder);
            const estaciones = wps
              .map((wp: any) => {
                const c = getCoords(wp.station);
                if (!c) return null;
                return {
                  nombre: wp.station?.name || wp.locationName || 'Estación',
                  lat: c.lat,
                  lng: c.lng,
                  stopOrder: wp.stopOrder ?? 0,
                };
              })
              .filter(Boolean) as import('@/components/map/MapaInteractivo').EstacionRuta[];
            if (estaciones.length >= 2) {
              // Trazado real (opcional): dibujado a mano por el admin sobre el
              // camino de verdad, en vez de conectar las paradas en línea recta.
              let shape: [number, number][] | undefined;
              try {
                const parsed = (t.route as any).polyline ? JSON.parse((t.route as any).polyline) : null;
                if (Array.isArray(parsed) && parsed.length >= 2) shape = parsed;
              } catch {
                shape = undefined;
              }
              rutasMap.set(rId, {
                id: rId,
                nombre: t.route.name,
                estaciones,
                shape,
              });
            }
          });
          const rutasList = Array.from(rutasMap.values());

          if (viajesConCoordenadas.length > 0 || rutasList.length > 0) {
            setMapaViajes(viajesConCoordenadas);
            setMapaRutas(rutasList);
            setMapaLoading(false);
            return;
          }
        }
      }
    } catch { /* fallback a datos de demo */ }

    // ── Datos de demo si no hay reales o falló el fetch ───────────────────
    setMapaViajes([
      { id: '1', origen: 'Lima (Yerbateros)', destino: 'Huancayo', conductor: company?.tradeName || 'Empresa', categoria: 'minivan', estado: true, coordenadas: { lat: -12.0621, lng: -76.9932 }, precio: 45, pasajerosRestantes: 4 },
      { id: '2', origen: 'Lima (Plaza Norte)', destino: 'Chimbote', conductor: company?.tradeName || 'Empresa', categoria: 'bus', estado: true, coordenadas: { lat: -11.9928, lng: -77.0607 }, precio: 60, pasajerosRestantes: 12 },
      { id: '3', origen: 'Arequipa', destino: 'Juliaca', conductor: company?.tradeName || 'Empresa', categoria: 'bus', estado: false, coordenadas: { lat: -16.4090, lng: -71.5375 }, precio: 35, pasajerosRestantes: 0 },
    ]);
    setMapaRutas([
      {
        id: 'demo-1',
        nombre: 'Lima → Huancayo',
        estaciones: [
          { nombre: 'Lima (Yerbateros)', lat: -12.0621, lng: -76.9932, stopOrder: 0 },
          { nombre: 'La Oroya', lat: -11.5275, lng: -75.9063, stopOrder: 1 },
          { nombre: 'Huancayo', lat: -12.0651, lng: -75.2049, stopOrder: 2 },
        ],
      },
      {
        id: 'demo-2',
        nombre: 'Arequipa → Juliaca',
        estaciones: [
          { nombre: 'Arequipa', lat: -16.4090, lng: -71.5375, stopOrder: 0 },
          { nombre: 'Juliaca', lat: -15.4907, lng: -70.1328, stopOrder: 1 },
        ],
      },
    ]);
    setMapaLoading(false);
  }

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
            className="lg:hidden p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo + nombre */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
              {company.logoUrl
                ? <img src={company.logoUrl} alt={company.tradeName} className="w-full h-full object-contain p-0.5" />
                : company.tradeName[0]}
            </div>
            <p className="font-bold text-white text-sm truncate hidden sm:block">{company.tradeName}</p>
          </div>

          {/* Espacio flexible */}
          <div className="flex-1" />

          {/* ── ZONA DERECHA ─────────────────────────────── */}
          <div className="flex items-center gap-3">

            {currentUser ? (
              <>
                {/* Saldo + acciones (solo desktop) */}
                <div className="hidden md:flex flex-col items-end mr-1">
                  <span className="text-xs text-slate-400 font-medium leading-tight">
                    Saldo: <span className="text-white font-bold">S/ 0.00</span>
                  </span>
                  <div className="flex gap-1.5 mt-1">
                    <button className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                      style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}>
                      Recargar
                    </button>
                    <button className="px-3 py-1 rounded-lg text-xs font-bold text-slate-300 border border-white/15 hover:border-indigo-500/50 hover:text-white transition-all active:scale-95"
                      style={{ background: "rgba(99,102,241,0.12)" }}>
                      Retirar
                    </button>
                  </div>
                </div>

                {/* Campana de notificaciones */}
                <button className="relative p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Notificaciones">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                </button>

                {/* Avatar usuario */}
                <button
                  onClick={() => {
                    if (isCompanyStaff) {
                      setActiveSection("admin-dashboard");
                    }
                  }}
                  className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-white/10 hover:border-white/25 transition-all group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                    {currentUser.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-white text-xs font-semibold leading-tight truncate max-w-[100px]">
                      {currentUser.name?.split(" ").slice(0, 2).join(" ") || "Usuario"}
                    </p>
                    <p className="text-slate-500 text-[10px] font-medium leading-tight">
                      {currentUser.role === "SUPER_ADMIN" ? "Super Admin" : currentUser.role === "ADMIN" ? "Admin" : "Usuario"}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors hidden md:block" />
                </button>
              </>
            ) : (
              <>
                {/* Botón login */}
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/25 hover:text-white transition-all">
                  <Lock className="w-4 h-4" /> Iniciar Sesión
                </button>

                {/* Botón Reservar */}
                <a href="#viajes"
                  onClick={() => setActiveSection("viajes")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  Reservar <ArrowRight className="w-4 h-4" />
                </a>
              </>
            )}

            {/* Reservar siempre visible cuando logueado */}
            {currentUser && (
              <a href="#viajes"
                onClick={() => setActiveSection("viajes")}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                Reservar <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>


      {/* ─── LAYOUT PRINCIPAL: SIDEBAR + CONTENIDO ─────────────────────────── */}
      <div className="relative z-10 flex flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 gap-6 pb-24 lg:pb-6">

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

          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-y-auto overflow-x-hidden h-full lg:h-auto flex flex-col">

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

              {/* ── Mapa Interactivo ─────────────────────────────────────── */}
              <button
                onClick={() => { setActiveSection("mapa"); setSidebarOpen(false); loadMapaViajes(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative overflow-hidden ${
                  activeSection === "mapa" ? "" : ""
                }`}
                style={activeSection === "mapa" ? {
                  background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15))",
                  border: "1px solid rgba(59,130,246,0.4)",
                  color: "#60a5fa",
                } : {
                  background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))",
                  border: "1px solid rgba(59,130,246,0.2)",
                  color: "#60a5fa",
                }}>
                {/* Shimmer en hover */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.12))" }} />
                <span className="relative flex items-center gap-3 w-full">
                  <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: "#3b82f6" }} />
                  <span className="flex-1 text-left">Mapa de Flotas</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                    style={{ background: "rgba(59,130,246,0.25)", color: "#93c5fd" }}>
                    EN VIVO
                  </span>
                </span>
              </button>
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

            {/* ─── PANEL DE GESTIÓN ADMIN (solo visible para admin/seller de esta empresa) */}
            {isCompanyStaff && (
              <div className="border-t border-white/5">
                {/* Header de la sección */}
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: primaryColor }}>
                    ⚙ Gestión Interna
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: `${primaryColor}20`, color: primaryColor }}>
                    {currentUser.role === "AGENCY_SELLER" ? "AGENCIA" : "ADMIN"}
                  </span>
                </div>

                {/* Links de administración */}
                <nav className="p-2 space-y-0.5">
                  {[
                    { id: "admin-dashboard", label: "Dashboard", emoji: "📊", roles: ["ADMIN", "SUPER_ADMIN"] },
                    { id: "admin-venta", label: "Venta de Pasajes", emoji: "🎫", roles: ["ADMIN", "SUPER_ADMIN", "AGENCY_SELLER"] },
                    { id: "admin-viajes", label: "Mis Viajes", emoji: "🚌", roles: ["ADMIN", "SUPER_ADMIN", "AGENCY_SELLER"] },
                    { id: "admin-rutas", label: "Gestión de Rutas", emoji: "🗺️", roles: ["ADMIN", "SUPER_ADMIN"] },
                    { id: "admin-vehiculos", label: "Flota de Vehículos", emoji: "🚐", roles: ["ADMIN", "SUPER_ADMIN"] },
                    { id: "admin-conductores", label: "Conductores", emoji: "🚐", roles: ["ADMIN", "SUPER_ADMIN"] },
                    { id: "admin-vendedores", label: "Vendedores", emoji: "👥", roles: ["ADMIN", "SUPER_ADMIN"] },
                    { id: "admin-perfil", label: "Perfil de Empresa", emoji: "🏢", roles: ["ADMIN", "SUPER_ADMIN"] },
                  ]
                  .filter(item => item.roles.includes(currentUser.role))
                  .map(item => (
                    <button key={item.id}
                      onClick={() => { setActiveSection(item.id as SidebarSection); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group text-left ${
                        activeSection === item.id ? "text-white bg-white/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}>
                      <span className="text-sm">{item.emoji}</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Botón principal destacado + accesos rápidos */}
                <div className="px-3 pb-3 space-y-2">
                  <button onClick={() => { setActiveSection("admin-dashboard"); setSidebarOpen(false); }}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      boxShadow: `0 4px 15px ${primaryColor}40`,
                    }}>
                    <Settings className="w-4 h-4" />
                    Panel Principal
                  </button>

                  {/* ── ACCESO DIRECTO A PÁGINA PÚBLICA ─────────────────── */}
                  <div className="rounded-xl border border-white/8 overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-3 pt-2 pb-1">
                      🌐 Página Pública
                    </p>
                    <div className="flex gap-1 px-2 pb-2">
                      {/* Ver página pública en nueva pestaña */}
                      <Link
                        href={`/empresa/${Array.isArray(slug) ? slug[0] : slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setSidebarOpen(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-95"
                        style={{
                          background: `${primaryColor}18`,
                          border: `1px solid ${primaryColor}35`,
                          color: primaryColor,
                        }}
                        title="Ver cómo ven tu página los clientes">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        Ver como cliente
                      </Link>
                      {/* Copiar URL */}
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/empresa/${Array.isArray(slug) ? slug[0] : slug}`;
                          navigator.clipboard.writeText(url).then(() => {
                            setUrlCopied(true);
                            setTimeout(() => setUrlCopied(false), 2000);
                          });
                        }}
                        className="flex items-center justify-center px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-95"
                        style={{
                          background: urlCopied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                          border: urlCopied ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.1)",
                          color: urlCopied ? "#10b981" : "#64748b",
                        }}
                        title="Copiar URL pública">
                        {urlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 hover:bg-red-500/10 transition-all">
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}

            {/* Footer sidebar */}
            <div className="p-4 border-t border-white/5 space-y-3">
              {(!currentUser || !isCompanyStaff) && (
                <button onClick={() => setShowLoginModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all">
                  🔑 Acceso Administrativo
                </button>
              )}
              {currentUser && !isCompanyStaff && (
                <button onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 hover:bg-red-500/10 transition-all">
                  Cerrar Sesión
                </button>
              )}
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
              {/* Hero Slider (Opción 1: Fondo con degradado + slide de mapa) */}
              {(() => {
                const sliderImgs = company.sliderImages?.filter(Boolean).length
                  ? company.sliderImages.filter(Boolean)
                  : [
                      "https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1920&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=1920&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1920&auto=format&fit=crop",
                    ];

                // Total slides: fotos + 1 slide de mapa
                const TOTAL_SLIDES = sliderImgs.length + 1;
                const MAP_SLIDE_INDEX = sliderImgs.length; // último slide

                return (
                  <div className="relative overflow-hidden rounded-2xl min-h-[220px] md:min-h-[300px] flex items-end"
                    style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>

                    {/* ── Slides de foto (cross-fade) */}
                    {sliderImgs.map((img, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 transition-opacity duration-1000"
                        style={{ opacity: i === currentSlide ? 1 : 0 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`Slide ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading={i === 0 ? "eager" : "lazy"}
                        />
                      </div>
                    ))}

                    {/* ── Slide especial: MAPA INTERACTIVO ─────────────────── */}
                    <div
                      className="absolute inset-0 transition-opacity duration-1000"
                      style={{ opacity: currentSlide === MAP_SLIDE_INDEX ? 1 : 0, pointerEvents: currentSlide === MAP_SLIDE_INDEX ? "auto" : "none" }}
                    >
                      {/* Imagen limpia de mapa/carretera para evitar letras repetidas del iframe */}
                      <img
                        src="https://images.unsplash.com/photo-1506015391300-4802dc74de2e?q=80&w=1920&auto=format&fit=crop"
                        alt="Mapa de rutas"
                        className="w-full h-full object-cover filter brightness-[0.4]"
                      />
                      {/* Overlay semitransparente + CTA */}
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-3"
                          style={{ background: "#3b82f625", borderColor: "#3b82f650", color: "#60a5fa" }}>
                          <MapPin className="w-3.5 h-3.5" /> Seguimiento en tiempo real
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg leading-tight">
                          Viajes en ruta{" "}
                          <span className="text-transparent bg-clip-text"
                            style={{ backgroundImage: "linear-gradient(to right, #3b82f6, #06b6d4)" }}>
                            ahora mismo
                          </span>
                        </h2>
                        <p className="text-slate-300 text-sm mt-2 mb-4 drop-shadow">
                          Visualiza todos los buses y vehículos activos en el mapa interactivo
                        </p>
                        <Link href="/mapa" target="_blank"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                          <MapPin className="w-4 h-4" /> Ver mapa completo
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Degradados de fotos (solo visibles en slides de imagen) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-900/30 transition-opacity duration-1000 pointer-events-none"
                      style={{ opacity: currentSlide === MAP_SLIDE_INDEX ? 0 : 1 }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent transition-opacity duration-1000 pointer-events-none"
                      style={{ opacity: currentSlide === MAP_SLIDE_INDEX ? 0 : 1 }} />

                    {/* Contenido sobre slides de foto */}
                    <div className="relative z-10 p-6 md:p-8 w-full transition-opacity duration-500"
                      style={{ opacity: currentSlide === MAP_SLIDE_INDEX ? 0 : 1, pointerEvents: currentSlide === MAP_SLIDE_INDEX ? "none" : "auto" }}>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-3"
                        style={{ background: `${primaryColor}15`, borderColor: `${primaryColor}40`, color: primaryColor }}>
                        <Sparkles className="w-3.5 h-3.5" /> Viajes seguros y puntuales
                      </div>
                      <h2 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-lg leading-tight">
                        Reserva con{" "}
                        <span className="text-transparent bg-clip-text"
                          style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}>
                          {company.tradeName}
                        </span>
                      </h2>
                      {company.description && (
                        <p className="text-slate-300 text-sm mt-2 max-w-lg drop-shadow">{company.description}</p>
                      )}

                      {/* Indicadores del slider */}
                      <div className="flex items-center gap-2 mt-4">
                        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className="rounded-full transition-all duration-300"
                            style={{
                              width: i === currentSlide ? "24px" : "8px",
                              height: "8px",
                              background: i === MAP_SLIDE_INDEX
                                ? (i === currentSlide ? "#3b82f6" : "rgba(59,130,246,0.4)")
                                : (i === currentSlide ? primaryColor : "rgba(255,255,255,0.3)"),
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Indicadores también visibles en slide de mapa */}
                    {currentSlide === MAP_SLIDE_INDEX && (
                      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className="rounded-full transition-all duration-300"
                            style={{
                              width: i === currentSlide ? "24px" : "8px",
                              height: "8px",
                              background: i === MAP_SLIDE_INDEX
                                ? (i === currentSlide ? "#3b82f6" : "rgba(59,130,246,0.4)")
                                : (i === currentSlide ? primaryColor : "rgba(255,255,255,0.5)"),
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}



              {/* Buscador */}
              <form onSubmit={handleSearch}
                className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center">

                  {/* ── Dropdown ORIGEN ───────────────────────────────────── */}
                  <div className="relative flex-1 w-full" ref={originDropRef}>
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{ color: primaryColor }} />
                    <button
                      type="button"
                      onClick={() => { setOriginOpen(o => !o); setDestOpen(false); }}
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-left text-sm focus:outline-none transition-colors flex items-center gap-1"
                      style={{
                        color: origin ? "#ffffff" : "#64748b",
                        borderColor: originOpen ? `${primaryColor}60` : undefined,
                        boxShadow: originOpen ? `0 0 0 2px ${primaryColor}20` : undefined,
                      }}
                    >
                      <span className="flex-1 truncate">{origin || "Ciudad de origen"}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${originOpen ? "rotate-180" : ""}`} />
                    </button>

                    {originOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                        {/* Opción: cualquier origen */}
                        {origin && (
                          <button
                            type="button"
                            onClick={() => { setOrigin(""); setDestination(""); setOriginOpen(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-700/70 transition-colors flex items-center gap-2 border-b border-slate-700/60"
                          >
                            <X className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Cualquier origen</span>
                          </button>
                        )}

                        {availableOrigins.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-500">Sin datos de rutas aún</p>
                        ) : (
                          <div className="max-h-44 overflow-y-auto">
                            {availableOrigins.map(city => (
                              <button
                                key={city}
                                type="button"
                                onClick={() => { setOrigin(city); setDestination(""); setOriginOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 hover:bg-slate-700/70"
                                style={origin === city
                                  ? { background: `${primaryColor}20`, color: primaryColor, fontWeight: 700 }
                                  : { color: "#cbd5e1" }
                                }
                              >
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {city}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Botón intercambiar ────────────────────────────────── */}
                  <button
                    type="button"
                    onClick={() => {
                      const prev = origin;
                      setOrigin(destination);
                      setDestination(prev);
                    }}
                    className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all hover:rotate-180 duration-300 shrink-0"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  {/* ── Dropdown DESTINO ──────────────────────────────────── */}
                  <div className="relative flex-1 w-full" ref={destDropRef}>
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{ color: secondaryColor }} />
                    <button
                      type="button"
                      onClick={() => { setDestOpen(o => !o); setOriginOpen(false); }}
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-left text-sm focus:outline-none transition-colors flex items-center gap-1"
                      style={{
                        color: destination ? "#ffffff" : "#64748b",
                        borderColor: destOpen ? `${secondaryColor}60` : undefined,
                        boxShadow: destOpen ? `0 0 0 2px ${secondaryColor}20` : undefined,
                      }}
                    >
                      <span className="flex-1 truncate">{destination || "Ciudad de destino"}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${destOpen ? "rotate-180" : ""}`} />
                    </button>

                    {destOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                        {/* Opción: cualquier destino */}
                        {destination && (
                          <button
                            type="button"
                            onClick={() => { setDestination(""); setDestOpen(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-700/70 transition-colors flex items-center gap-2 border-b border-slate-700/60"
                          >
                            <X className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Cualquier destino</span>
                          </button>
                        )}

                        {availableDestinations.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-500">
                            {origin ? `No hay destinos desde ${origin}` : "Sin datos de rutas aún"}
                          </p>
                        ) : (
                          <div className="max-h-44 overflow-y-auto">
                            {availableDestinations.map(city => (
                              <button
                                key={city}
                                type="button"
                                onClick={() => { setDestination(city); setDestOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 hover:bg-slate-700/70"
                                style={destination === city
                                  ? { background: `${secondaryColor}20`, color: secondaryColor, fontWeight: 700 }
                                  : { color: "#cbd5e1" }
                                }
                              >
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {city}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative w-full md:w-44 shrink-0">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none transition-colors [color-scheme:dark]" />
                  </div>
                  <button type="submit" disabled={searching}
                    className="w-full md:w-auto px-6 py-2.5 font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #1e293b, #0f172a)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#94a3b8",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                      transition: "all 0.25s ease",
                    }}
                    onMouseEnter={e => {
                      if (!searching) {
                        const el = e.currentTarget;
                        el.style.background = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
                        el.style.color = "#ffffff";
                        el.style.borderColor = `${primaryColor}60`;
                        el.style.boxShadow = `0 6px 24px ${primaryColor}60, 0 0 0 2px ${primaryColor}30`;
                        el.style.transform = "translateY(-2px) scale(1.03)";
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget;
                      el.style.background = "linear-gradient(135deg, #1e293b, #0f172a)";
                      el.style.color = "#94a3b8";
                      el.style.borderColor = "rgba(255,255,255,0.1)";
                      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
                      el.style.transform = "translateY(0) scale(1)";
                    }}>
                    {searching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                    {searching ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {/* Sub-row: Filtros Toggle & Reset */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-300 select-none hover:scale-[1.02] active:scale-95"
                    style={{
                      borderColor: showFilters ? `${primaryColor}40` : "rgba(255,255,255,0.08)",
                      background: showFilters ? `${primaryColor}15` : "rgba(255,255,255,0.03)",
                      color: showFilters ? "#ffffff" : "#94a3b8"
                    }}
                  >
                    <SlidersHorizontal className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? "rotate-90" : ""}`} />
                    <span>Filtros</span>
                    {activeFilterCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold text-white animate-pulse" style={{ backgroundColor: primaryColor }}>
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
                  </button>

                  {/* Limpiar filtros */}
                  {(vehicleFilter || routeFilter || timeFilter || origin || destination || date) && (
                    <button
                      type="button"
                      onClick={() => {
                        setVehicleFilter("");
                        setRouteFilter("");
                        setTimeFilter("");
                        setOrigin("");
                        setDestination("");
                        setDate("");
                        if (company) loadTrips(company.id);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    >
                      ✕ Limpiar filtros
                    </button>
                  )}
                </div>

                {/* Filtros rápidos colapsables */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showFilters ? "max-h-[500px] opacity-100 mt-2 pt-2 border-t border-white/5" : "max-h-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
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
                    </div>

                    {/* Filtro de Tiempo */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "hoy", label: "Hoy" },
                        { id: "semana", label: "Última semana" },
                        { id: "mes", label: "Último mes" },
                        { id: "ano", label: "Último año" },
                      ].map(item => (
                        <button key={item.id} type="button"
                          onClick={() => setTimeFilter(timeFilter === item.id ? "" : item.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            timeFilter === item.id
                              ? "text-white border-transparent"
                              : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
                          }`}
                          style={timeFilter === item.id ? { background: `${primaryColor}30`, borderColor: primaryColor, color: primaryColor } : {}}>
                          📅 {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </form>

              {/* Lista de viajes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-400">
                    {sortedTrips.length > 0
                      ? `${sortedTrips.length} viaje${sortedTrips.length !== 1 ? "s" : ""} encontrado${sortedTrips.length !== 1 ? "s" : ""}`
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
                ) : sortedTrips.length === 0 ? (
                  <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-10 text-center">
                    <Bus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No hay viajes disponibles</p>
                    <p className="text-slate-600 text-sm mt-1">Prueba con otras fechas o destinos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedTrips.map(trip => {
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

                      const status = trip.status || "SCHEDULED";
                      const statusInfo = tripStatusConfig[status] || tripStatusConfig.SCHEDULED;
                      const isPast = status === "COMPLETED" || status === "CANCELLED";
                      const availableSeats = trip.availableSeats ?? trip.vehicle?.capacity;
                      const isSoldOut = availableSeats <= 0;
                      const hasFewSeats = !isSoldOut && availableSeats <= 10;

                      // Formato de hora: "10:05 PM"
                      const timeStr = departure.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
                        .replace("a. m.", "AM")
                        .replace("p. m.", "PM")
                        .replace("am", "AM")
                        .replace("pm", "PM");
                      // Formato de fecha simplificado: "Jue, 02 Jul"
                      const dateStr = departure.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" });

                      return (
                        <Link key={trip.id} href={`/empresa/${Array.isArray(slug) ? slug[0] : slug}/viaje/${trip.id}`}
                          className={`group block bg-slate-900/80 border rounded-2xl overflow-hidden transition-all duration-300 ${(trip.status === "COMPLETED" || trip.status === "CANCELLED") ? "opacity-60 hover:opacity-85" : ""}`}
                          style={{
                            borderColor: "rgba(255,255,255,0.06)",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={e => {
                            if (trip.status !== "COMPLETED" && trip.status !== "CANCELLED") {
                              e.currentTarget.style.borderColor = `${primaryColor}70`;
                              e.currentTarget.style.boxShadow = `0 12px 48px ${primaryColor}55, 0 4px 16px ${primaryColor}30, 0 0 0 1px ${primaryColor}25`;
                              e.currentTarget.style.transform = "translateY(-3px)";
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >

                          {/* Layout: info izquierda + imagen derecha */}
                          <div className="flex items-stretch">

                            {/* ── INFO IZQUIERDA (REDISEÑADA) ─────────────── */}
                            <div className="flex-1 p-4 space-y-3 min-w-0 flex flex-col justify-between">

                              {/* Encabezado: Hora + Fecha unificada + Estado */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xl font-extrabold text-white tracking-tight leading-none">{timeStr}</span>
                                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{dateStr}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider shrink-0 transition-all"
                                  style={{
                                    background: statusInfo.bg,
                                    borderColor: `${statusInfo.color}30`,
                                    color: statusInfo.color
                                  }}>
                                  {statusInfo.pulse && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                                  )}
                                  {statusInfo.label.toUpperCase()}
                                </span>
                              </div>

                              {/* Ruta: Diagrama Horizontal minimalista */}
                              {(orig || dest) && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                    <span className="font-bold text-slate-200 truncate max-w-[120px]">{orig}</span>
                                    <div className="flex-1 flex items-center justify-center relative min-w-[20px]">
                                      <div className="w-full h-[1px] bg-slate-800" />
                                      <Bus className="w-3 h-3 text-slate-600 absolute bg-slate-900 px-0.5 rounded-full" />
                                    </div>
                                    <span className="font-bold text-slate-200 truncate max-w-[120px]">{dest}</span>
                                  </div>

                                  {/* Barra de progreso de avance del viaje */}
                                  {(() => {
                                    let progressPercent = 0;
                                    if (status === "BOARDING") progressPercent = 15;
                                    else if (status === "IN_TRANSIT") progressPercent = 55;
                                    else if (status === "COMPLETED") progressPercent = 100;

                                    return (
                                      <div className="space-y-1 pt-0.5">
                                        <div className="flex justify-between items-center text-[8px] text-slate-600 font-bold uppercase tracking-wider">
                                          <span className={status === "BOARDING" ? "text-amber-500/80 font-bold" : ""}>Inicio</span>
                                          <span className={status === "IN_TRANSIT" ? "text-indigo-400 font-bold" : ""}>En Ruta</span>
                                          <span className={status === "COMPLETED" ? "text-slate-400 font-bold" : ""}>Fin</span>
                                        </div>
                                        <div className="relative w-full h-1 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                                          <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                              width: `${progressPercent}%`,
                                              background: status === "COMPLETED"
                                                ? "#475569"
                                                : `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Footer de Info: Vehiculo y Asientos */}
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[10px] text-slate-500 font-semibold truncate uppercase">
                                  {typeLabel} • {trip.vehicle?.plateNumber}
                                </span>
                                <div>
                                  {isSoldOut ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                                      🚫 Agotado
                                    </span>
                                  ) : hasFewSeats ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse uppercase tracking-wider">
                                      ⚠️ ¡Últimos {availableSeats}!
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                      ✅ {availableSeats} Libres
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* ── IMAGEN + PRECIO DERECHA (MANTENIDO Y REDISEÑADO) ── */}
                            <div className="w-36 flex-shrink-0 relative flex flex-col items-center justify-between p-3 bg-slate-800/30 border-l border-white/5">
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

                              {/* Botón de Precio — neutro por defecto, color de empresa al hover */}
                              <div
                                className="mt-2 px-3 py-1.5 rounded-xl text-xs font-extrabold text-center w-full flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95"
                                style={{
                                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#94a3b8",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                                  transition: "all 0.25s ease",
                                }}
                                onMouseEnter={e => {
                                  const el = e.currentTarget;
                                  el.style.background = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
                                  el.style.color = "#ffffff";
                                  el.style.borderColor = `${primaryColor}60`;
                                  el.style.boxShadow = `0 4px 14px ${primaryColor}40`;
                                  el.style.transform = "scale(1.04)";
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget;
                                  el.style.background = "linear-gradient(135deg, #1e293b, #0f172a)";
                                  el.style.color = "#94a3b8";
                                  el.style.borderColor = "rgba(255,255,255,0.1)";
                                  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
                                  el.style.transform = "scale(1)";
                                }}
                              >
                                <span>{trip.price ? `S/ ${Number(trip.price).toFixed(2)}` : "Ver Precio"}</span>
                                <ArrowRight className="w-3 h-3 shrink-0" />
                              </div>
                            </div>
                          </div>

                          {/* Footer: Contador regresivo + CTA */}
                          <div className="px-4 py-2 border-t border-white/5 flex justify-between items-center">
                            <CountdownBadge departureTime={trip.departureTime} isPast={isPast} />
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
          {/* ── SECCIÓN: MAPA DE FLOTAS ─────────────────────────────────── */}
          {activeSection === "mapa" && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" style={{ color: "#3b82f6" }} />
                    Mapa de Flotas
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse ml-1"
                      style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
                      EN VIVO
                    </span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Vehículos y rutas de <span className="text-white font-medium">{company.tradeName}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setMapaViajes([]); setMapaRutas([]); setRutaSeleccionada(null); loadMapaViajes(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all">
                  🔄 Actualizar
                </button>
              </div>

              {/* Mapa */}
              <div className="rounded-2xl overflow-hidden border border-white/8"
                style={{ height: "560px", background: "#0f172a" }}>
                {mapaLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Cargando mapa de flotas...</p>
                    </div>
                  </div>
                ) : (
                  <MapaInteractivo
                    viajes={mapaViajes}
                    seleccionado={mapaSeleccionado}
                    onSeleccionar={setMapaSeleccionado}
                    rutas={mapaRutas}
                    rutaSeleccionada={rutaSeleccionada}
                    onSeleccionarRuta={setRutaSeleccionada}
                  />
                )}
              </div>

              {/* Panel inferior: Vehículos en vivo */}
              {mapaViajes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                    Unidades activas
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {mapaViajes.map(v => (
                      <button key={v.id}
                        onClick={() => setMapaSeleccionado(v)}
                        className={`text-left p-2.5 rounded-xl border transition-all ${
                          mapaSeleccionado?.id === v.id
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-white/8 bg-slate-900/60 hover:border-white/20"
                        }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.estado ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                          <span className="text-white text-[11px] font-bold truncate">{v.categoria.toUpperCase()}</span>
                        </div>
                        <p className="text-slate-300 text-[10px] truncate">{v.origen} → {v.destino}</p>
                        {v.pasajerosRestantes !== undefined && (
                          <p className="text-slate-600 text-[10px] mt-0.5">{v.pasajerosRestantes} asientos</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Panel inferior: Rutas de la red */}
              {mapaRutas.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                    Red de rutas
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {mapaRutas.map((r, ri) => {
                      const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
                      const color = r.color || colors[ri % colors.length];
                      return (
                        <button key={r.id}
                          onClick={() => setRutaSeleccionada(r)}
                          className={`text-left p-2.5 rounded-xl border transition-all ${
                            rutaSeleccionada?.id === r.id
                              ? "border-purple-500/50 bg-purple-500/10"
                              : "border-white/8 bg-slate-900/60 hover:border-white/20"
                          }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-3 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-white text-[11px] font-bold truncate">{r.nombre}</span>
                          </div>
                          <p className="text-slate-500 text-[10px]">{r.estaciones.length} paradas</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SECCIONES ADMINISTRATIVAS (SPA) ─────────────────────────── */}
          {isCompanyStaff && activeSection === "admin-dashboard" && <AdminDashboard />}
          {isCompanyStaff && activeSection === "admin-venta" && <AdminVenta />}
          {isCompanyStaff && activeSection === "admin-viajes" && <AdminViajes />}
          {isCompanyStaff && activeSection === "admin-rutas" && <AdminRutas />}
          {isCompanyStaff && activeSection === "admin-vehiculos" && <AdminVehiculos />}
          {isCompanyStaff && activeSection === "admin-conductores" && <AdminConductores />}
          {isCompanyStaff && activeSection === "admin-vendedores" && <AdminVendedores />}
          {isCompanyStaff && activeSection === "admin-perfil" && <AdminPerfil />}


        </main>
      </div>

      {/* ── MODAL DE LOGIN ─────────────────────────────────────────────── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 relative">
              <button onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-6 mt-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl mb-3 shadow-lg shadow-indigo-500/25">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Acceso Administrativo</h3>
                <p className="text-sm text-slate-400 mt-1">Inicia sesión para gestionar {company.tradeName}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@empresa.com" required
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••" required
                      className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-2.5 pl-9 pr-10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loginLoading}
                  className="w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  {loginLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                  ) : (
                    "Ingresar al Panel"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM NAVIGATION BAR (MOBILE / TABLET, < lg) ─────────────────── */}
      <EmpresaBottomNav
        activeSection={activeSection}
        onNavigate={(id) => {
          if (id === "menu") { setSidebarOpen(true); return; }
          if (id === "mapa") { setActiveSection("mapa"); loadMapaViajes(); return; }
          setActiveSection(id as SidebarSection);
        }}
        primaryColor={primaryColor}
        isCompanyStaff={isCompanyStaff}
        userRole={currentUser?.role}
      />

    </div>
  );
}
