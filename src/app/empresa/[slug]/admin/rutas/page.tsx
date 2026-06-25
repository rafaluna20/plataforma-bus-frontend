"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, MapPin, ArrowRight, AlertCircle, CheckCircle2,
  RefreshCw, Route, Map
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Station = { id: string; name: string; city: string };
type Waypoint = { stationId: string; stopOrder: number; estimatedDurationMins: number; basePrice: number };
type RouteItem = { id: string; name: string; serviceMode: string; waypoints: any[] };

export default function EmpresaAdminRutasPage() {
  const { slug } = useParams();
  const router = useRouter();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Formulario nueva ruta
  const [showForm, setShowForm] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [serviceMode, setServiceMode] = useState("INTERPROVINCIAL");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { stationId: "", stopOrder: 1, estimatedDurationMins: 0, basePrice: 0 },
    { stationId: "", stopOrder: 2, estimatedDurationMins: 60, basePrice: 45 },
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Estaciones
  const [stations, setStations] = useState<Station[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);

  // Nueva estación
  const [showStationForm, setShowStationForm] = useState(false);
  const [stationForm, setStationForm] = useState({ name: "", city: "", address: "", latitude: "", longitude: "" });
  const [stationSaving, setStationSaving] = useState(false);

  useEffect(() => { loadData(); }, [slugStr]);

  useEffect(() => {
    if (cityFilter) {
      setFilteredStations(stations.filter(s => s.city.toLowerCase().includes(cityFilter.toLowerCase())));
    } else {
      setFilteredStations(stations);
    }
  }, [cityFilter, stations]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Obtener empresa por slug
      const compRes = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      const compData = await compRes.json();
      if (!compRes.ok) throw new Error("Empresa no encontrada");
      const cid = compData.company?.id;
      setCompanyId(cid);

      // Cargar rutas
      const routesRes = await authFetch(`${API}/api/v1/routes/company/${cid}`);
      const routesData = await routesRes.json();
      setRoutes(routesData.routes || []);

      // Cargar estaciones
      const cities = ["Lima", "Huancayo", "Chosica", "La Oroya", "Ayacucho", "Ica", "Piura", "Trujillo", "Arequipa", "Cusco", "Huancavelica", "Junin", "Cangallo", "Vilcashuaman"];
      const allStations: Station[] = [];
      await Promise.all(cities.map(async city => {
        try {
          const res = await authFetch(`${API}/api/v1/routes/stations?city=${city}`);
          const data = await res.json();
          if (data.stations) allStations.push(...data.stations);
        } catch {}
      }));
      setStations(allStations);
      setFilteredStations(allStations);
      const uniqueCities = [...new Set(allStations.map(s => s.city))].sort();
      setAllCities(uniqueCities);
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function createStation() {
    if (!stationForm.name || !stationForm.city || !stationForm.latitude || !stationForm.longitude) {
      alert("Completa todos los campos obligatorios"); return;
    }
    setStationSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/routes/stations`, {
        method: "POST",
        body: JSON.stringify({
          companyId,
          name: stationForm.name,
          city: stationForm.city,
          address: stationForm.address,
          latitude: parseFloat(stationForm.latitude),
          longitude: parseFloat(stationForm.longitude),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear estación");
      setStations(s => [...s, data.station]);
      setShowStationForm(false);
      setStationForm({ name: "", city: "", address: "", latitude: "", longitude: "" });
    } catch (e: any) { alert(e.message); }
    finally { setStationSaving(false); }
  }

  function addWaypoint() {
    setWaypoints(wps => [...wps, { stationId: "", stopOrder: wps.length + 1, estimatedDurationMins: 60, basePrice: 10 }]);
  }

  function removeWaypoint(idx: number) {
    if (waypoints.length <= 2) return;
    setWaypoints(wps => wps.filter((_, i) => i !== idx).map((wp, i) => ({ ...wp, stopOrder: i + 1 })));
  }

  function updateWaypoint(idx: number, field: keyof Waypoint, value: any) {
    setWaypoints(wps => wps.map((wp, i) => i === idx ? { ...wp, [field]: value } : wp));
  }

  function getStationName(id: string) {
    const s = stations.find(st => st.id === id);
    return s ? `${s.name} (${s.city})` : "";
  }

  async function saveRoute(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!routeName.trim()) { setFormError("Ingresa un nombre para la ruta"); return; }
    if (waypoints.some(w => !w.stationId)) { setFormError("Selecciona una estación para cada parada"); return; }

    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/routes`, {
        method: "POST",
        body: JSON.stringify({ companyId, name: routeName, serviceMode, waypoints }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear ruta");
      setSuccess("✅ Ruta creada exitosamente");
      setShowForm(false);
      setRouteName("");
      setWaypoints([
        { stationId: "", stopOrder: 1, estimatedDurationMins: 0, basePrice: 0 },
        { stationId: "", stopOrder: 2, estimatedDurationMins: 60, basePrice: 45 },
      ]);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-indigo-400" />
            Gestión de Rutas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${routes.length} ruta${routes.length !== 1 ? "s" : ""} registrada${routes.length !== 1 ? "s" : ""}`}
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
            <Plus className="w-5 h-5" /> Nueva Ruta
          </button>
        </div>
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

      {/* ─── Formulario nueva ruta ─────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={saveRoute}
          className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-white text-lg">Crear Nueva Ruta</h2>

          {/* Info general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nombre de la Ruta *</label>
              <input
                value={routeName}
                onChange={e => setRouteName(e.target.value)}
                placeholder="Ej: Lima → Huancayo (Ruta Central)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tipo de Servicio</label>
              <select
                value={serviceMode}
                onChange={e => setServiceMode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                <option value="INTERPROVINCIAL">Interprovincial</option>
                <option value="LOCAL">Local / Urbano</option>
              </select>
            </div>
          </div>

          {/* Paradas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Paradas del Recorrido</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowStationForm(v => !v)}
                  className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
                  + Nueva Estación
                </button>
                <button type="button" onClick={addWaypoint}
                  className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar Parada
                </button>
              </div>
            </div>

            {/* Formulario nueva estación */}
            {showStationForm && (
              <div className="p-4 bg-slate-800/70 rounded-xl border border-white/10 space-y-3">
                <p className="text-sm font-medium text-white">Registrar Nueva Estación / Paradero</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre (Ej: Terminal Norte)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm col-span-2 md:col-span-1" />
                  <input value={stationForm.city} onChange={e => setStationForm(f => ({ ...f, city: e.target.value }))} placeholder="Ciudad" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  <input value={stationForm.address} onChange={e => setStationForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección (opcional)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  <input value={stationForm.latitude} onChange={e => setStationForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitud (Ej: -12.065)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  <input value={stationForm.longitude} onChange={e => setStationForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitud (Ej: -77.032)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowStationForm(false)} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10">Cancelar</button>
                  <button type="button" onClick={createStation} disabled={stationSaving} className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50">
                    {stationSaving ? "Guardando..." : "Crear Estación"}
                  </button>
                </div>
              </div>
            )}

            {/* Filtro ciudad */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">Filtrar por ciudad:</label>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs">
                <option value="">Todas las ciudades</option>
                {allCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Lista de waypoints */}
            <div className="space-y-3">
              {waypoints.map((wp, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                      ${idx === 0 ? "bg-indigo-500 border-indigo-400 text-white" :
                        idx === waypoints.length - 1 ? "bg-emerald-500 border-emerald-400 text-white" :
                        "bg-slate-700 border-slate-600 text-slate-400"}`}>
                      {idx + 1}
                    </div>
                    {idx < waypoints.length - 1 && <div className="w-0.5 h-4 bg-white/10 mt-1" />}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="text-xs text-slate-500 mb-1 block">
                        {idx === 0 ? "🟣 Origen" : idx === waypoints.length - 1 ? "🟢 Destino" : "📍 Parada intermedia"}
                      </label>
                      <select value={wp.stationId} onChange={e => updateWaypoint(idx, "stationId", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                        <option value="">Selecciona estación</option>
                        {filteredStations.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Duración al siguiente (min)</label>
                      <input type="number" value={wp.estimatedDurationMins} onChange={e => updateWaypoint(idx, "estimatedDurationMins", +e.target.value)}
                        disabled={idx === waypoints.length - 1}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-40" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Precio base del tramo (S/)</label>
                      <input type="number" step="0.50" value={wp.basePrice} onChange={e => updateWaypoint(idx, "basePrice", +e.target.value)}
                        disabled={idx === 0}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-40" />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeWaypoint(idx)} disabled={waypoints.length <= 2}
                    className="text-slate-600 hover:text-red-400 disabled:opacity-20 mt-1 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Resumen precio */}
            {waypoints.length >= 2 && waypoints[0].stationId && waypoints[waypoints.length - 1].stationId && (
              <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{getStationName(waypoints[0].stationId)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span>{getStationName(waypoints[waypoints.length - 1].stationId)}</span>
                </div>
                <p className="text-white font-bold">
                  S/ {waypoints.reduce((sum, wp, i) => i > 0 ? sum + Number(wp.basePrice) : sum, 0).toFixed(2)} total
                </p>
              </div>
            )}
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
                <><Plus className="w-4 h-4" /> Crear Ruta</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── Lista de rutas ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5">
            <Route className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No hay rutas registradas</p>
          <p className="text-slate-600 text-sm">Haz clic en "Nueva Ruta" para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map(r => (
            <div key={r.id}
              className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.waypoints?.length || 0} paradas ·{" "}
                    <span className="text-slate-400">{r.serviceMode === "INTERPROVINCIAL" ? "Interprovincial" : "Local"}</span>
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              </div>
              {r.waypoints && r.waypoints.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto pb-1">
                  {r.waypoints
                    .sort((a, b) => a.stopOrder - b.stopOrder)
                    .map((w: any, i: number) => (
                      <span key={w.id} className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-slate-300">{w.station?.name || w.locationName}</span>
                        {i < r.waypoints.length - 1 && <ArrowRight className="w-3 h-3 flex-shrink-0" />}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
