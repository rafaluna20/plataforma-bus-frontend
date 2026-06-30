"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Trash2, MapPin, ArrowRight, AlertCircle, CheckCircle2,
  RefreshCw, Route, Map, Pencil, X, Save, Loader2
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900/50 flex items-center justify-center text-xs text-slate-500 min-h-[250px]">
      Cargando mapa interactivo...
    </div>
  )
});

const PERU_CITIES: Record<string, { lat: number; lng: number }> = {
  lima: { lat: -12.0464, lng: -77.0428 },
  huancayo: { lat: -12.0651, lng: -75.2048 },
  arequipa: { lat: -16.4090, lng: -71.5375 },
  cusco: { lat: -13.5320, lng: -71.9675 },
  trujillo: { lat: -8.1160, lng: -79.0300 },
  chiclayo: { lat: -6.7714, lng: -79.8441 },
  chimbote: { lat: -9.0853, lng: -78.5783 },
  piura: { lat: -5.1945, lng: -80.6328 },
  ica: { lat: -14.0678, lng: -75.7286 },
  puno: { lat: -15.8402, lng: -70.0219 },
  tacna: { lat: -18.0169, lng: -70.2502 },
  cajamarca: { lat: -7.1638, lng: -78.5003 },
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Station = { id: string; name: string; city: string };
type Waypoint = { id?: string; stationId: string; stopOrder: number; estimatedDurationMins: number; basePrice: number; basePriceFloor1?: number | null };
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

  // Formulario nueva / editar ruta
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [serviceMode, setServiceMode] = useState("INTERPROVINCIAL");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { stationId: "", stopOrder: 1, estimatedDurationMins: 0, basePrice: 0, basePriceFloor1: null },
    { stationId: "", stopOrder: 2, estimatedDurationMins: 60, basePrice: 45, basePriceFloor1: null },
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Confirmación eliminar
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estaciones
  const [stations, setStations] = useState<Station[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);

  // Nueva estación
  const [showStationForm, setShowStationForm] = useState(false);
  const [stationForm, setStationForm] = useState({ name: "", city: "", address: "", latitude: "", longitude: "" });
  const [stationSaving, setStationSaving] = useState(false);

  // Mapa de ubicación de estación
  const [mapMarker, setMapMarker] = useState({ lat: -12.0464, lng: -77.0428 });
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Sincronizar coordenadas desde el arrastre del mapa
  const handleMapMarkerChange = useCallback((coords: { lat: number; lng: number }) => {
    setMapMarker(coords);
    setStationForm(f => ({
      ...f,
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6)
    }));
  }, []);

  // Sincronizar coordenadas cuando se escribe en los inputs de lat/lon
  const handleLatLonInput = (field: "latitude" | "longitude", val: string) => {
    setStationForm(f => {
      const next = { ...f, [field]: val };
      const latVal = parseFloat(next.latitude);
      const lngVal = parseFloat(next.longitude);
      if (!isNaN(latVal) && !isNaN(lngVal) && latVal >= -90 && latVal <= 90 && lngVal >= -180 && lngVal <= 180) {
        setMapMarker({ lat: latVal, lng: lngVal });
        setFlyToCoords({ lat: latVal, lng: lngVal });
      }
      return next;
    });
  };

  // Al escribir el nombre de la ciudad, centrar el mapa si es conocida
  const handleCityInput = (val: string) => {
    setStationForm(f => ({ ...f, city: val }));
    const cleanCity = val.trim().toLowerCase();
    const match = PERU_CITIES[cleanCity];
    if (match) {
      setMapMarker(match);
      setFlyToCoords(match);
      setStationForm(f => ({
        ...f,
        latitude: match.lat.toFixed(6),
        longitude: match.lng.toFixed(6)
      }));
    }
  };

  // Al abrir el formulario de nueva estación, reiniciar marcador del mapa
  useEffect(() => {
    if (showStationForm) {
      const latVal = parseFloat(stationForm.latitude) || -12.0464;
      const lngVal = parseFloat(stationForm.longitude) || -77.0428;
      setMapMarker({ lat: latVal, lng: lngVal });
      setFlyToCoords({ lat: latVal, lng: lngVal });
    }
  }, [showStationForm]);

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

  function openCreate() {
    setEditingId(null);
    setRouteName("");
    setServiceMode("INTERPROVINCIAL");
    setWaypoints([
      { stationId: "", stopOrder: 1, estimatedDurationMins: 0, basePrice: 0, basePriceFloor1: null },
      { stationId: "", stopOrder: 2, estimatedDurationMins: 60, basePrice: 45, basePriceFloor1: null },
    ]);
    setFormError("");
    setShowForm(true);
    setTimeout(() => document.getElementById("route-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function openEdit(route: RouteItem) {
    setEditingId(route.id);
    setRouteName(route.name);
    setServiceMode(route.serviceMode);
    if (route.waypoints && route.waypoints.length > 0) {
      const sortedWp = [...route.waypoints].sort((a, b) => a.stopOrder - b.stopOrder);
      setWaypoints(sortedWp.map(w => ({
        id: w.id,                                // ← preservar ID para upsert inteligente
        stationId: w.station?.id || w.stationId,
        stopOrder: w.stopOrder,
        estimatedDurationMins: w.estimatedDurationMins,
        basePrice: parseFloat(w.basePrice),
        basePriceFloor1: w.basePriceFloor1 != null ? parseFloat(w.basePriceFloor1) : null,
      })));
    } else {
      setWaypoints([
        { stationId: "", stopOrder: 1, estimatedDurationMins: 0, basePrice: 0, basePriceFloor1: null },
        { stationId: "", stopOrder: 2, estimatedDurationMins: 60, basePrice: 45, basePriceFloor1: null },
      ]);
    }
    setFormError("");
    setShowForm(true);
    setTimeout(() => document.getElementById("route-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  function addWaypoint() {
    setWaypoints(wps => [...wps, { stationId: "", stopOrder: wps.length + 1, estimatedDurationMins: 60, basePrice: 10, basePriceFloor1: null }]);
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
      const payload = { companyId, name: routeName, serviceMode, waypoints };
      let res, data;
      
      if (editingId) {
        res = await authFetch(`${API}/api/v1/routes/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al actualizar ruta");
        setSuccess("✅ Ruta actualizada exitosamente");
      } else {
        res = await authFetch(`${API}/api/v1/routes`, { method: "POST", body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al crear ruta");
        setSuccess("✅ Ruta creada exitosamente");
      }
      
      closeForm();
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRoute(id: string) {
    setDeleting(true);
    try {
      const res = await authFetch(`${API}/api/v1/routes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar ruta");
      }
      setSuccess("✅ Ruta eliminada.");
      setDeleteConfirm(null);
      loadData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
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
            onClick={openCreate}
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
          <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Modal de confirmación eliminar ──────────────────────────────────── */}
      {deleteConfirm && (() => {
        const route = routes.find(r => r.id === deleteConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Eliminar ruta</h3>
                  <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                ¿Confirmas que deseas eliminar la ruta <span className="font-bold text-white">{route?.name}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button onClick={() => deleteRoute(deleteConfirm)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Formulario nueva/editar ruta ──────────────────────────────────── */}
      {showForm && (
        <form id="route-form" onSubmit={saveRoute}
          className="bg-slate-900/80 border rounded-2xl p-6 space-y-5"
          style={{ borderColor: editingId ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)" }}>
          
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-lg flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
              {editingId ? "Editar Ruta" : "Crear Nueva Ruta"}
            </h2>
            <button type="button" onClick={closeForm}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/70 rounded-xl border border-white/10">
                {/* Formulario de entradas */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white">Registrar Nueva Estación / Paradero</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Nombre de Estación</label>
                      <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Terminal Yerbateros" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Ciudad</label>
                        <input value={stationForm.city} onChange={e => handleCityInput(e.target.value)} placeholder="Ej: Huancayo" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Dirección (opcional)</label>
                        <input value={stationForm.address} onChange={e => setStationForm(f => ({ ...f, address: e.target.value }))} placeholder="Ej: Av. Principal 123" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Latitud</label>
                        <input value={stationForm.latitude} onChange={e => handleLatLonInput("latitude", e.target.value)} placeholder="-12.0464" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Longitud</label>
                        <input value={stationForm.longitude} onChange={e => handleLatLonInput("longitude", e.target.value)} placeholder="-77.0428" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setShowStationForm(false)} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10">Cancelar</button>
                    <button type="button" onClick={createStation} disabled={stationSaving} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50">
                      {stationSaving ? "Guardando..." : "Crear Estación"}
                    </button>
                  </div>
                </div>

                {/* Mapa interactivo */}
                <div className="h-64 md:h-auto min-h-[250px] rounded-xl overflow-hidden border border-slate-700 relative">
                  <LocationPicker
                    marker={mapMarker}
                    setMarker={handleMapMarkerChange}
                    flyTo={flyToCoords}
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-white/10 px-2.5 py-1 rounded text-[10px] text-slate-300 pointer-events-none z-[400]">
                    📍 Arrastra el mapa para ubicar la estación
                  </div>
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
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
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
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">S/ Piso 2 / Único</label>
                        <input type="number" step="0.50" value={wp.basePrice} onChange={e => updateWaypoint(idx, "basePrice", +e.target.value)}
                          disabled={idx === 0}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-40" />
                      </div>
                      <div>
                        <label className="text-xs text-amber-500/80 mb-1 block">S/ Piso 1 / VIP (opcional)</label>
                        <input
                          type="number" step="0.50"
                          placeholder="Igual que Piso 2"
                          value={wp.basePriceFloor1 ?? ""}
                          onChange={e => updateWaypoint(idx, "basePriceFloor1", e.target.value === "" ? null : +e.target.value)}
                          disabled={idx === 0}
                          className="w-full bg-slate-800 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-300 text-sm placeholder:text-slate-600 disabled:opacity-40" />
                      </div>
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

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeForm}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                : editingId
                  ? <><Save className="w-4 h-4" /> Guardar Cambios</>
                  : <><Plus className="w-4 h-4" /> Crear Ruta</>
              }
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
              className="bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col hover:border-indigo-500/30 transition-all group overflow-hidden">
              <div className="p-5 flex items-start justify-between gap-3">
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
                <div className="px-5 pb-4 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto">
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
              {/* Barra de acciones */}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-white/5 bg-slate-900/40 mt-auto">
                <button
                  onClick={() => openEdit(r)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-indigo-500/15 hover:border-indigo-500/30 border border-transparent transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => setDeleteConfirm(r.id)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
