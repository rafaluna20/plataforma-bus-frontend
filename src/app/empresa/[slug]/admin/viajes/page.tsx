"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bus, Plus, AlertCircle, CheckCircle2, RefreshCw,
  Clock, ArrowRight, Activity
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Trip = {
  id: string;
  departureTime: string;
  status: string;
  route: { name: string; waypoints: any[] };
  vehicle: { plateNumber: string; vehicleType: string; capacity: number };
};

type Route = { id: string; name: string };
type Vehicle = { id: string; plateNumber: string; vehicleType: string; capacity: number };

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

export default function EmpresaAdminViajesPage() {
  const { slug } = useParams();
  const router = useRouter();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Formulario nuevo viaje
  const [showForm, setShowForm] = useState(false);
  const [tripForm, setTripForm] = useState({ routeId: "", vehicleId: "", departureTime: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Filtro de estado
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => { loadData(); }, [slugStr]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const compRes = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      const compData = await compRes.json();
      if (!compRes.ok) throw new Error("Empresa no encontrada");
      const cid = compData.company?.id;
      setCompanyId(cid);

      const [tripsRes, routesRes, vehiclesRes] = await Promise.all([
        authFetch(`${API}/api/v1/management/trips/company/${cid}`),
        authFetch(`${API}/api/v1/routes/company/${cid}`),
        authFetch(`${API}/api/v1/vehicles/company/${cid}`),
      ]);

      const [tripsData, routesData, vehiclesData] = await Promise.all([
        tripsRes.json(), routesRes.json(), vehiclesRes.json(),
      ]);

      setTrips(tripsData.trips || []);
      setRoutes(routesData.routes || []);
      setVehicles(vehiclesData.vehicles || []);
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!tripForm.routeId) { setFormError("⚠️ Selecciona una ruta."); return; }
    if (!tripForm.vehicleId) { setFormError("⚠️ Selecciona un vehículo."); return; }
    if (!tripForm.departureTime) { setFormError("⚠️ Selecciona la fecha y hora de salida."); return; }

    const selectedDate = new Date(tripForm.departureTime);
    const now = new Date();
    const diffMinutes = (selectedDate.getTime() - now.getTime()) / 60000;

    if (selectedDate <= now) {
      setFormError("📅 La fecha de salida debe ser en el futuro.");
      return;
    }
    if (diffMinutes < 30) {
      setFormError("⏰ La salida debe programarse con al menos 30 minutos de anticipación.");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips`, {
        method: "POST",
        body: JSON.stringify({
          routeId: tripForm.routeId,
          vehicleId: tripForm.vehicleId,
          departureTime: tripForm.departureTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("futuro") || msg.includes("fecha")) {
          setFormError("📅 La fecha de salida debe ser en el futuro.");
        } else if (msg.includes("programado") || msg.includes("conflicto")) {
          setFormError("🚌 Este vehículo ya tiene un viaje programado para esa fecha.");
        } else if (msg.includes("inactivo")) {
          setFormError("🔴 El vehículo seleccionado está inactivo.");
        } else {
          setFormError(`❌ ${msg || "Error al programar el viaje."}`);
        }
        return;
      }
      setSuccess("✅ Viaje programado exitosamente");
      setShowForm(false);
      setTripForm({ routeId: "", vehicleId: "", departureTime: "" });
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setFormError("❌ Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date();
  const todayTrips = trips.filter(t => new Date(t.departureTime).toDateString() === today.toDateString());
  const activeTrips = trips.filter(t => t.status === "IN_TRANSIT" || t.status === "BOARDING");

  const filteredTrips = filterStatus === "ALL"
    ? trips
    : trips.filter(t => t.status === filterStatus);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-indigo-400" />
            Gestión de Viajes
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${trips.length} viaje${trips.length !== 1 ? "s" : ""} registrado${trips.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Plus className="w-5 h-5" /> Programar Viaje
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Hoy", value: todayTrips.length, color: "#6366f1", icon: <Clock className="w-4 h-4" /> },
          { label: "En Tránsito", value: activeTrips.length, color: "#06b6d4", icon: <Activity className="w-4 h-4" /> },
          { label: "Programados", value: trips.filter(t => t.status === "SCHEDULED").length, color: "#f59e0b", icon: <Bus className="w-4 h-4" /> },
          { label: "Completados", value: trips.filter(t => t.status === "COMPLETED").length, color: "#10b981", icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: `${stat.color}15` }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{loading ? "..." : stat.value}</p>
          </div>
        ))}
      </div>

      {/* Mensajes */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ─── Formulario nuevo viaje ─────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={createTrip}
          className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white text-lg">Programar Nuevo Viaje</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Ruta *</label>
              <select
                value={tripForm.routeId}
                onChange={e => setTripForm(f => ({ ...f, routeId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
                <option value="">Selecciona una ruta</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Vehículo *</label>
              <select
                value={tripForm.vehicleId}
                onChange={e => setTripForm(f => ({ ...f, vehicleId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
                <option value="">Selecciona un vehículo</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({vehicleTypeLabel[v.vehicleType] || v.vehicleType} · {v.capacity} asientos)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Fecha y Hora de Salida *</label>
              <input
                type="datetime-local"
                value={tripForm.departureTime}
                onChange={e => setTripForm(f => ({ ...f, departureTime: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setFormError(""); }}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Plus className="w-4 h-4" /> Programar Viaje</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "ALL", label: "Todos" },
          { value: "SCHEDULED", label: "Programados" },
          { value: "BOARDING", label: "Abordando" },
          { value: "IN_TRANSIT", label: "En Tránsito" },
          { value: "COMPLETED", label: "Completados" },
          { value: "CANCELLED", label: "Cancelados" },
        ].map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === f.value
                ? "bg-indigo-500 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white border border-white/5"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ─── Lista de viajes ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5">
            <Bus className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No hay viajes {filterStatus !== "ALL" ? "con este estado" : "registrados"}</p>
          <p className="text-slate-600 text-sm">Haz clic en "Programar Viaje" para comenzar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTrips.map(trip => {
            const wps = trip.route.waypoints || [];
            const orig = wps[0]?.station?.name || "—";
            const dest = wps[wps.length - 1]?.station?.name || "—";
            const dep = new Date(trip.departureTime);
            const st = statusConfig[trip.status] || statusConfig.SCHEDULED;

            return (
              <div key={trip.id}
                className="flex items-center gap-4 p-4 bg-slate-900/60 border border-white/5 rounded-xl hover:border-white/10 transition-all">
                <div className="p-2 rounded-lg flex-shrink-0 bg-indigo-500/10">
                  <Bus className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <span className="truncate">{orig}</span>
                    <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                    <span className="truncate">{dest}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {vehicleTypeLabel[trip.vehicle.vehicleType] || trip.vehicle.vehicleType} · {trip.vehicle.plateNumber} · {trip.vehicle.capacity} asientos
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">
                    {dep.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} {dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <Link
                  href={`/empresa/${slugStr}/admin/venta?tripId=${trip.id}`}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25">
                  Vender
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
