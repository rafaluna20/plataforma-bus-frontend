"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bus, Plus, AlertCircle, CheckCircle2, RefreshCw,
  Clock, ArrowRight, Activity, Edit2, X, AlertTriangle,
  Copy, XCircle, ChevronDown,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Trip = {
  id: string;
  departureTime: string;
  status: string;
  route: { id: string; name: string; waypoints: any[] };
  vehicle: { id: string; plateNumber: string; vehicleType: string; capacity: number };
};

type Route = { id: string; name: string };
type Vehicle = { id: string; plateNumber: string; vehicleType: string; capacity: number };

const statusConfig: Record<string, { label: string; cls: string }> = {
  SCHEDULED:  { label: "Programado",  cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  BOARDING:   { label: "Abordando",   cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  IN_TRANSIT: { label: "En Tránsito", cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  COMPLETED:  { label: "Completado",  cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  CANCELLED:  { label: "Cancelado",   cls: "text-red-400 bg-red-500/10 border-red-500/20" },
};

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan", BUS_1P: "Bus 1 Piso", BUS_2P: "Bus 2 Pisos", AUTO: "Auto",
};

const CANCEL_REASONS = [
  "Falla mecánica del vehículo",
  "Condiciones climáticas adversas",
  "Falta de pasajeros",
  "Problema con el conductor",
  "Cierre de vía / bloqueo",
  "Disposición de la empresa",
  "Otro motivo",
];

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

  // ── Formulario nuevo viaje ──────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [tripForm, setTripForm] = useState({ routeId: "", vehicleId: "", departureTime: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Formulario editar / reprogramar ────────────────────────────────────────
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({ vehicleId: "", departureTime: "" });
  const [editFormError, setEditFormError] = useState("");
  const [updatingTrip, setUpdatingTrip] = useState(false);
  const [editBookingsCount, setEditBookingsCount] = useState<number | null>(null);
  const [loadingBookingsCount, setLoadingBookingsCount] = useState(false);
  // MEJORA 2 — checkbox de confirmación cuando hay pasajeros
  const [editConfirmed, setEditConfirmed] = useState(false);

  // ── MEJORA 1 — Cancelar viaje ───────────────────────────────────────────────
  const [cancelingTrip, setCancelingTrip] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelCustomReason, setCancelCustomReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelingLoading, setCancelingLoading] = useState(false);
  const [cancelBookingsCount, setCancelBookingsCount] = useState<number | null>(null);
  const [cancelFormError, setCancelFormError] = useState("");

  // ── MEJORA 4 — Duplicar viaje ───────────────────────────────────────────────
  const [duplicatingTrip, setDuplicatingTrip] = useState<Trip | null>(null);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  // ── Filtro de estado ────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // ── Auxiliar — formatear fecha local ───────────────────────────────────────
  function formatDateTimeLocal(dateInput: string | Date) {
    const d = new Date(dateInput);
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  }

  // ── Abrir modal editar ──────────────────────────────────────────────────────
  async function handleOpenEdit(trip: Trip) {
    setEditingTrip(trip);
    setEditForm({
      vehicleId: trip.vehicle.id || "",
      departureTime: formatDateTimeLocal(trip.departureTime),
    });
    setEditFormError("");
    setEditConfirmed(false);
    setEditBookingsCount(null);
    setLoadingBookingsCount(true);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips/${trip.id}/manifest`);
      if (res.ok) {
        const data = await res.json();
        setEditBookingsCount(data.count ?? data.passengers?.length ?? 0);
      }
    } catch { /* silent */ }
    finally { setLoadingBookingsCount(false); }
  }

  // ── Guardar edición ─────────────────────────────────────────────────────────
  async function handleUpdateTrip(e: React.FormEvent) {
    e.preventDefault();
    setEditFormError("");
    if (!editingTrip) return;
    if (!editForm.vehicleId) { setEditFormError("⚠️ Selecciona un vehículo."); return; }
    if (!editForm.departureTime) { setEditFormError("⚠️ Selecciona la fecha y hora de salida."); return; }
    if (new Date(editForm.departureTime) <= new Date()) {
      setEditFormError("📅 La fecha de salida debe ser en el futuro."); return;
    }
    // MEJORA 2 — exigir confirmación cuando hay pasajeros
    if (editBookingsCount && editBookingsCount > 0 && !editConfirmed) {
      setEditFormError("☑️ Debes confirmar que notificarás a los pasajeros."); return;
    }

    setUpdatingTrip(true);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips/${editingTrip.id}`, {
        method: "PATCH",
        body: JSON.stringify({ vehicleId: editForm.vehicleId, departureTime: editForm.departureTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("futuro") || msg.includes("fecha"))
          setEditFormError("📅 La fecha de salida debe ser en el futuro.");
        else if (msg.includes("programado") || msg.includes("conflicto"))
          setEditFormError("🚌 Este vehículo ya tiene un viaje programado para esa fecha.");
        else if (msg.includes("inactivo"))
          setEditFormError("🔴 El vehículo seleccionado está inactivo.");
        else
          setEditFormError(`❌ ${msg || "Error al reprogramar el viaje."}`);
        return;
      }
      setSuccess("✅ Viaje reprogramado exitosamente");
      setEditingTrip(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setEditFormError("❌ Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setUpdatingTrip(false);
    }
  }

  // ── MEJORA 1 — Abrir modal cancelar ────────────────────────────────────────
  async function handleOpenCancel(trip: Trip) {
    setCancelingTrip(trip);
    setCancelReason(CANCEL_REASONS[0]);
    setCancelCustomReason("");
    setCancelConfirmed(false);
    setCancelFormError("");
    setCancelBookingsCount(null);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips/${trip.id}/manifest`);
      if (res.ok) {
        const data = await res.json();
        setCancelBookingsCount(data.count ?? data.passengers?.length ?? 0);
      }
    } catch { /* silent */ }
  }

  async function handleCancelTrip() {
    if (!cancelingTrip) return;
    if (!cancelConfirmed) { setCancelFormError("☑️ Debes confirmar la cancelación."); return; }
    const reason = cancelReason === "Otro motivo" ? cancelCustomReason.trim() : cancelReason;
    if (!reason) { setCancelFormError("⚠️ Escribe el motivo de cancelación."); return; }

    setCancelingLoading(true);
    setCancelFormError("");
    try {
      const res = await authFetch(`${API}/api/v1/management/trips/${cancelingTrip.id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelFormError(`❌ ${data.error || "Error al cancelar el viaje."}`);
        return;
      }
      setSuccess("🚫 Viaje cancelado correctamente");
      setCancelingTrip(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setCancelFormError("❌ Error de conexión.");
    } finally {
      setCancelingLoading(false);
    }
  }

  // ── MEJORA 4 — Abrir modal duplicar ────────────────────────────────────────
  function handleOpenDuplicate(trip: Trip) {
    setDuplicatingTrip(trip);
    setDuplicateDate(formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    setDuplicateError("");
  }

  async function handleDuplicateTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!duplicatingTrip) return;
    if (!duplicateDate) { setDuplicateError("⚠️ Selecciona la fecha del nuevo viaje."); return; }
    if (new Date(duplicateDate) <= new Date()) { setDuplicateError("📅 La fecha debe ser en el futuro."); return; }

    setDuplicateLoading(true);
    setDuplicateError("");
    try {
      const res = await authFetch(`${API}/api/v1/management/trips`, {
        method: "POST",
        body: JSON.stringify({
          routeId: duplicatingTrip.route.id,
          vehicleId: duplicatingTrip.vehicle.id,
          departureTime: duplicateDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("conflicto") || msg.includes("programado"))
          setDuplicateError("🚌 El vehículo ya tiene un viaje en ese horario.");
        else
          setDuplicateError(`❌ ${msg || "Error al duplicar el viaje."}`);
        return;
      }
      setSuccess("📋 Viaje duplicado exitosamente");
      setDuplicatingTrip(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setDuplicateError("❌ Error de conexión.");
    } finally {
      setDuplicateLoading(false);
    }
  }

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

      const { getCurrentUser } = await import("@/lib/auth");
      const user = getCurrentUser();
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

      if (isAdmin) {
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
      } else {
        const tripsRes = await fetch(`${API}/api/v1/trips/search?companyId=${cid}&limit=100`);
        const tripsData = await tripsRes.json();
        setTrips(tripsData.trips || tripsData.data || []);
        setRoutes([]);
        setVehicles([]);
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!tripForm.routeId)      { setFormError("⚠️ Selecciona una ruta."); return; }
    if (!tripForm.vehicleId)    { setFormError("⚠️ Selecciona un vehículo."); return; }
    if (!tripForm.departureTime){ setFormError("⚠️ Selecciona la fecha y hora de salida."); return; }

    const selectedDate = new Date(tripForm.departureTime);
    if (selectedDate <= new Date()) { setFormError("📅 La fecha de salida debe ser en el futuro."); return; }
    if ((selectedDate.getTime() - Date.now()) / 60000 < 30) {
      setFormError("⏰ La salida debe programarse con al menos 30 minutos de anticipación."); return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips`, {
        method: "POST",
        body: JSON.stringify({ routeId: tripForm.routeId, vehicleId: tripForm.vehicleId, departureTime: tripForm.departureTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "";
        if (msg.includes("futuro") || msg.includes("fecha")) setFormError("📅 La fecha de salida debe ser en el futuro.");
        else if (msg.includes("programado") || msg.includes("conflicto")) setFormError("🚌 Este vehículo ya tiene un viaje programado para esa fecha.");
        else if (msg.includes("inactivo")) setFormError("🔴 El vehículo seleccionado está inactivo.");
        else setFormError(`❌ ${msg || "Error al programar el viaje."}`);
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

  const sessionUser = typeof window !== "undefined"
    ? (() => { try { const u = localStorage.getItem("user"); return u ? JSON.parse(u) : null; } catch { return null; } })()
    : null;
  const isAdmin = sessionUser?.role === "ADMIN" || sessionUser?.role === "SUPER_ADMIN";

  // MEJORA 3 — estados donde se permite editar
  const EDITABLE_STATUSES = ["SCHEDULED", "BOARDING"];

  return (
    <div className="space-y-6">

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
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
          {isAdmin && (
            <button
              onClick={() => { setShowForm(v => !v); setFormError(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Plus className="w-5 h-5" /> Programar Viaje
            </button>
          )}
        </div>
      </div>

      {/* ─── Stats rápidas ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Hoy",         value: todayTrips.length,                                    color: "#6366f1", icon: <Clock className="w-4 h-4" /> },
          { label: "En Tránsito", value: activeTrips.length,                                   color: "#06b6d4", icon: <Activity className="w-4 h-4" /> },
          { label: "Programados", value: trips.filter(t => t.status === "SCHEDULED").length,   color: "#f59e0b", icon: <Bus className="w-4 h-4" /> },
          { label: "Completados", value: trips.filter(t => t.status === "COMPLETED").length,   color: "#10b981", icon: <CheckCircle2 className="w-4 h-4" /> },
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

      {/* ─── Mensajes globales ───────────────────────────────────────────────── */}
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

      {/* ─── Formulario nuevo viaje ──────────────────────────────────────────── */}
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

      {/* ─── Filtros de estado ───────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "ALL",        label: "Todos" },
          { value: "SCHEDULED",  label: "Programados" },
          { value: "BOARDING",   label: "Abordando" },
          { value: "IN_TRANSIT", label: "En Tránsito" },
          { value: "COMPLETED",  label: "Completados" },
          { value: "CANCELLED",  label: "Cancelados" },
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
            const wps  = trip.route.waypoints || [];
            const orig = wps[0]?.station?.name || "—";
            const dest = wps[wps.length - 1]?.station?.name || "—";
            const dep  = new Date(trip.departureTime);
            const st   = statusConfig[trip.status] || statusConfig.SCHEDULED;
            const canEdit = EDITABLE_STATUSES.includes(trip.status) && isAdmin;
            const canCancel = ["SCHEDULED", "BOARDING"].includes(trip.status) && isAdmin;

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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* MEJORA 4 — Duplicar */}
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenDuplicate(trip)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      title="Duplicar viaje con nueva fecha">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  {/* MEJORA 3 — Editar también en BOARDING */}
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(trip)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Reprogramar viaje">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* MEJORA 1 — Cancelar */}
                  {canCancel && (
                    <button
                      onClick={() => handleOpenCancel(trip)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Cancelar viaje">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    href={`/empresa/${slugStr}/admin/venta?tripId=${trip.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25">
                    Vender
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL — Reprogramar viaje
      ══════════════════════════════════════════════════════════════════════════ */}
      {editingTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
            <button onClick={() => setEditingTrip(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-bold text-white text-xl flex items-center gap-2 mb-1">
              <Edit2 className="w-5 h-5 text-indigo-400" />
              Reprogramar Viaje
            </h2>
            <p className="text-xs text-slate-400 mb-4 truncate font-semibold">
              Ruta: {editingTrip.route?.name}
            </p>

            {/* MEJORA 3 — aviso si es BOARDING */}
            {editingTrip.status === "BOARDING" && (
              <div className="flex items-start gap-2.5 p-3.5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl text-yellow-400 text-xs mb-4">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Viaje en estado ABORDANDO</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Este viaje ya está en proceso de abordaje. Cambiar el vehículo o el horario puede afectar a los pasajeros que ya están en la terminal.
                  </p>
                </div>
              </div>
            )}

            {/* MEJORA 2 — advertencia con pasajeros */}
            {loadingBookingsCount ? (
              <div className="h-10 bg-slate-800/40 animate-pulse rounded-xl mb-4" />
            ) : editBookingsCount !== null && editBookingsCount > 0 ? (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-400 text-xs mb-4">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">¡Atención! Viaje con reservas activas</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Este viaje ya cuenta con <strong>{editBookingsCount} pasajero{editBookingsCount !== 1 ? "s" : ""}</strong>.
                    Si continúas, los pasajes se mantendrán pero deberás notificar a los clientes sobre el cambio.
                  </p>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleUpdateTrip} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Vehículo *</label>
                <select
                  value={editForm.vehicleId}
                  onChange={e => setEditForm(f => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
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
                  value={editForm.departureTime}
                  onChange={e => setEditForm(f => ({ ...f, departureTime: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* MEJORA 2 — checkbox obligatorio cuando hay pasajeros */}
              {editBookingsCount !== null && editBookingsCount > 0 && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={editConfirmed}
                      onChange={e => setEditConfirmed(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      editConfirmed ? "bg-indigo-500 border-indigo-500" : "border-slate-600 group-hover:border-indigo-400"
                    }`}>
                      {editConfirmed && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-xs text-slate-300 leading-relaxed">
                    Confirmo que <strong className="text-white">notificaré a los {editBookingsCount} pasajero{editBookingsCount !== 1 ? "s" : ""}</strong> sobre el cambio de horario o vehículo.
                  </span>
                </label>
              )}

              {editFormError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {editFormError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingTrip(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={updatingTrip}
                  className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  {updatingTrip ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                  ) : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL — Cancelar viaje (MEJORA 1)
      ══════════════════════════════════════════════════════════════════════════ */}
      {cancelingTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
            <button onClick={() => setCancelingTrip(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-bold text-white text-xl flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-red-400" />
              Cancelar Viaje
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-semibold truncate">
              Ruta: {cancelingTrip.route?.name}
            </p>

            {/* Advertencia si hay pasajeros */}
            {cancelBookingsCount !== null && cancelBookingsCount > 0 ? (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs mb-5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">⚠️ Viaje con {cancelBookingsCount} pasajero{cancelBookingsCount !== 1 ? "s" : ""}</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Al cancelar, los pasajes quedarán sin vigencia. Deberás coordinar los reembolsos y notificar a cada pasajero de forma individual.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3.5 bg-slate-800/40 border border-slate-700 rounded-xl text-slate-400 text-xs mb-5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <p>Este viaje no tiene pasajeros registrados. La cancelación no afectará reservas activas.</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Selector de motivo */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Motivo de cancelación *</label>
                <div className="relative">
                  <select
                    value={cancelReason}
                    onChange={e => { setCancelReason(e.target.value); setCancelCustomReason(""); }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 focus:outline-none appearance-none pr-10">
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Campo libre si es "Otro motivo" */}
              {cancelReason === "Otro motivo" && (
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Describe el motivo *</label>
                  <textarea
                    value={cancelCustomReason}
                    onChange={e => setCancelCustomReason(e.target.value)}
                    rows={2}
                    placeholder="Ej: Paro de transportistas en la ruta..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 focus:outline-none resize-none placeholder-slate-600"
                  />
                </div>
              )}

              {/* Checkbox de confirmación */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={cancelConfirmed}
                    onChange={e => setCancelConfirmed(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    cancelConfirmed ? "bg-red-500 border-red-500" : "border-slate-600 group-hover:border-red-400"
                  }`}>
                    {cancelConfirmed && <X className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-xs text-slate-300 leading-relaxed">
                  Entiendo que esta acción <strong className="text-red-400">no se puede deshacer</strong> y me comprometo a gestionar los reembolsos y notificaciones a los pasajeros.
                </span>
              </label>

              {cancelFormError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {cancelFormError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setCancelingTrip(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Volver
                </button>
                <button
                  onClick={handleCancelTrip}
                  disabled={cancelingLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90 bg-red-600 hover:bg-red-500">
                  {cancelingLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cancelando...</>
                  ) : (
                    <><XCircle className="w-4 h-4" /> Confirmar Cancelación</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL — Duplicar viaje (MEJORA 4)
      ══════════════════════════════════════════════════════════════════════════ */}
      {duplicatingTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setDuplicatingTrip(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-bold text-white text-xl flex items-center gap-2 mb-1">
              <Copy className="w-5 h-5 text-cyan-400" />
              Duplicar Viaje
            </h2>
            <p className="text-xs text-slate-400 mb-5 font-semibold truncate">
              Ruta: {duplicatingTrip.route?.name}
            </p>

            {/* Resumen del viaje original */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-white/5 space-y-1.5">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Viaje original</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Vehículo</span>
                <span className="text-xs text-white font-semibold">{duplicatingTrip.vehicle.plateNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Salida original</span>
                <span className="text-xs text-white font-semibold">
                  {new Date(duplicatingTrip.departureTime).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                  {new Date(duplicatingTrip.departureTime).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Capacidad</span>
                <span className="text-xs text-white font-semibold">{duplicatingTrip.vehicle.capacity} asientos</span>
              </div>
            </div>

            <form onSubmit={handleDuplicateTrip} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  Nueva Fecha y Hora de Salida *
                </label>
                <input
                  type="datetime-local"
                  value={duplicateDate}
                  onChange={e => setDuplicateDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-600 mt-1.5">
                  Se usará la misma ruta y vehículo del viaje original. El nuevo viaje empezará sin pasajeros.
                </p>
              </div>

              {duplicateError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {duplicateError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setDuplicatingTrip(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={duplicateLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
                  {duplicateLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Crear Duplicado</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
