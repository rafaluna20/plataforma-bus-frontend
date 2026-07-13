"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bus, Clock, ArrowRight, RefreshCw, Ticket, Search,
  AlertCircle, MapPin, Users, ChevronRight, Activity,
} from "lucide-react";
import { getCompanyBySlug, getCompanyById } from "@/lib/api/branding";
import { searchTrips } from "@/lib/api/trips";

type Waypoint = {
  id: string;
  stopOrder: number;
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
  };
};

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  SCHEDULED:  { label: "Programado",  cls: "text-slate-400 bg-slate-500/10 border-slate-500/20",  dot: "bg-slate-400" },
  BOARDING:   { label: "Abordando",   cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-400" },
  IN_TRANSIT: { label: "En Tránsito", cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", dot: "bg-indigo-400" },
  COMPLETED:  { label: "Completado",  cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  CANCELLED:  { label: "Cancelado",   cls: "text-red-400 bg-red-500/10 border-red-500/20", dot: "bg-red-400" },
};

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan", BUS_1P: "Bus 1 Piso", BUS_2P: "Bus 2 Pisos", AUTO: "Auto",
};

// ── Helper: extraer origen/destino de forma inteligente ──────────────────────
function getRoutePoints(trip: TripItem) {
  const wps = trip.route?.waypoints || [];
  const orig = wps[0]?.station?.name;
  const dest = wps[wps.length - 1]?.station?.name;
  if (orig && dest) return { origin: orig, destination: dest };

  const name = trip.route?.name || "";
  const separators = [" - ", " -> ", " / ", " a ", " → ", "-"];
  for (const sep of separators) {
    if (name.includes(sep)) {
      const parts = name.split(sep);
      if (parts.length >= 2) {
        return { origin: parts[0].trim(), destination: parts[parts.length - 1].trim() };
      }
    }
  }
  return { origin: name || "—", destination: "" };
}

export default function EmpresaAdminVentaPage() {
  const { slug } = useParams();
  const router = useRouter();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [primaryColor, setPrimaryColor]   = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [companyId, setCompanyId]         = useState("");
  const [companyName, setCompanyName]     = useState("");

  const [trips, setTrips]       = useState<TripItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [searchDate, setSearchDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchText, setSearchText] = useState("");

  // ── Filtros rápidos de estado ────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");

  const STATUS_FILTERS = [
    { key: "ACTIVE",     label: "Activos",     icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "ALL",        label: "Todos",        icon: <Bus className="w-3.5 h-3.5" /> },
    { key: "SCHEDULED",  label: "Programados",  icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "BOARDING",   label: "Abordando",    icon: <Users className="w-3.5 h-3.5" /> },
    { key: "COMPLETED",  label: "Completados",  icon: <ChevronRight className="w-3.5 h-3.5" /> },
  ];

  useEffect(() => {
    loadCompany();
  }, [slugStr]);

  async function loadCompany() {
    try {
      // Por slug; si el acceso vino con el ID crudo (ej. el redirect de
      // login), caer a getCompanyById.
      let data: any;
      try {
        data = await getCompanyBySlug<any>(slugStr as string);
      } catch {
        data = await getCompanyById<any>(slugStr as string);
      }
      const cid = data.company.id;
      setCompanyId(cid);
      setCompanyName(data.company.tradeName);
      setPrimaryColor(data.company.primaryColor || "#6366f1");
      setSecondaryColor(data.company.secondaryColor || "#8b5cf6");
      await loadTrips(cid, searchDate);
    } catch {
      setError("Error al cargar la empresa.");
      setLoading(false);
    }
  }

  async function loadTrips(cid: string, date: string) {
    setLoading(true);
    setError("");
    try {
      const data = await searchTrips<any>({ companyId: cid, date, limit: 100 });
      setTrips(data.trips || []);
    } catch {
      setError("Error al cargar los viajes.");
    } finally {
      setLoading(false);
    }
  }

  // ── Ir al punto de venta moderno ─────────────────────────────────────────────
  function goToSell(trip: TripItem) {
    router.push(`/empresa/${slugStr}/viaje/${trip.id}?sell=1`);
  }

  // ── Filtrado local ────────────────────────────────────────────────────────────
  const filtered = trips.filter(t => {
    const matchStatus =
      filterStatus === "ALL"    ? true :
      filterStatus === "ACTIVE" ? (t.status === "BOARDING" || t.status === "SCHEDULED" || t.status === "IN_TRANSIT") :
      t.status === filterStatus;

    const { origin, destination } = getRoutePoints(t);
    const needle = searchText.toLowerCase();
    const matchText = !needle ||
      origin.toLowerCase().includes(needle) ||
      destination.toLowerCase().includes(needle) ||
      t.vehicle.plateNumber.toLowerCase().includes(needle) ||
      t.route.name.toLowerCase().includes(needle);

    return matchStatus && matchText;
  });

  // Estadísticas rápidas del día
  const countScheduled = trips.filter(t => t.status === "SCHEDULED").length;
  const countBoarding  = trips.filter(t => t.status === "BOARDING").length;
  const countTransit   = trips.filter(t => t.status === "IN_TRANSIT").length;
  const countDone      = trips.filter(t => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6" style={{ color: primaryColor }} />
            Punto de Venta
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {companyName} — Selecciona un viaje para abrir el mapa de asientos
          </p>
        </div>
        <button
          onClick={() => companyId && loadTrips(companyId, searchDate)}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Mini-estadísticas ───────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Programados",  value: countScheduled, color: "#94a3b8" },
            { label: "Abordando",    value: countBoarding,  color: "#facc15" },
            { label: "En Tránsito",  value: countTransit,   color: "#818cf8" },
            { label: "Completados",  value: countDone,      color: "#34d399" },
          ].map(s => (
            <div key={s.label}
              className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: s.color }} />
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-lg font-bold text-white leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Controles: fecha + búsqueda ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2 sm:w-48">
          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
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

        <div className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por origen, destino o placa…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Filtros de estado ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              filterStatus === f.key
                ? "text-white border-transparent"
                : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            }`}
            style={filterStatus === f.key ? {
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            } : {}}
          >
            {f.icon} {f.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-xs text-slate-500 self-center">
            {filtered.length} viaje{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Lista de viajes ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-16 text-center">
          <Bus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No hay viajes para mostrar</p>
          <p className="text-slate-600 text-sm mt-1">
            Cambia la fecha o el filtro de estado
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(trip => {
            const { origin, destination } = getRoutePoints(trip);
            const dep = new Date(trip.departureTime);
            const st  = statusConfig[trip.status] || statusConfig.SCHEDULED;
            const isSellable = trip.status !== "CANCELLED" && trip.status !== "COMPLETED";

            return (
              <button
                key={trip.id}
                onClick={() => isSellable && goToSell(trip)}
                disabled={!isSellable}
                className={`w-full text-left bg-slate-900/60 border border-white/5 rounded-2xl p-5
                  transition-all group overflow-hidden relative
                  ${isSellable
                    ? "hover:border-white/15 hover:scale-[1.02] cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                {/* Indicador lateral de estado */}
                <span
                  className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${st.dot}`}
                />

                <div className="pl-3">
                  {/* Ruta: Origen → Destino */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                    <span className="text-sm font-bold text-white truncate">{origin}</span>
                    {destination && (
                      <>
                        <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                        <span className="text-sm font-bold text-white truncate">{destination}</span>
                      </>
                    )}
                  </div>

                  {/* Hora + estado */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-2xl font-extrabold text-white">
                      {dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Vehículo + placa */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {vehicleTypeLabel[trip.vehicle.vehicleType] || trip.vehicle.vehicleType}
                      {" · "}{trip.vehicle.plateNumber}
                    </span>
                    <span>{trip.vehicle.capacity} asientos</span>
                  </div>

                  {/* CTA si es vendible */}
                  {isSellable && (
                    <div
                      className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl
                        text-xs font-bold text-white transition-all
                        opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}30)`,
                        borderTop: `1px solid ${primaryColor}30`,
                      }}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      Abrir Punto de Venta
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
