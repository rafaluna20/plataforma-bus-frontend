"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, MapPin, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Station = { id: string; name: string; city: string };
type Waypoint = { stationId: string; stopOrder: number; estimatedDurationMins: number; basePrice: number };

export default function NewRoutePage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);

  const [routeName, setRouteName] = useState("");
  const [serviceMode, setServiceMode] = useState("INTERPROVINCIAL");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { stationId: "", stopOrder: 1, estimatedDurationMins: 0, basePrice: 0 },
    { stationId: "", stopOrder: 2, estimatedDurationMins: 60, basePrice: 45 },
  ]);

  // New station form
  const [showStationForm, setShowStationForm] = useState(false);
  const [stationForm, setStationForm] = useState({ name: "", city: "", address: "", latitude: "", longitude: "" });
  const [stationSaving, setStationSaving] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (cityFilter) {
      setFilteredStations(stations.filter(s => s.city.toLowerCase().includes(cityFilter.toLowerCase())));
    } else {
      setFilteredStations(stations);
    }
  }, [cityFilter, stations]);

  async function loadInitial() {
    try {
      // Usar authFetch para endpoints protegidos
      const compRes = await authFetch(`${API}/api/v1/companies`);
      const compData = await compRes.json();
      const cid = compData.companies?.[0]?.id;
      setCompanyId(cid || "");

      // Fetch stations from common cities (endpoint protegido)
      const cities = ["Lima", "Huancayo", "Chosica", "La Oroya", "Ayacucho", "Ica", "Piura", "Trujillo", "Arequipa", "Cusco"];
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
    } catch (e) { console.error(e); }
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

  async function saveRoute() {
    setError("");
    if (!routeName.trim()) { setError("Ingresa un nombre para la ruta"); return; }
    if (waypoints.some(w => !w.stationId)) { setError("Selecciona una estación para cada parada"); return; }

    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/routes`, {
        method: "POST",
        body: JSON.stringify({ companyId, name: routeName, serviceMode, waypoints }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear ruta");
      setSuccess(true);
      setTimeout(() => router.push("/admin"), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (success) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
      <h2 className="text-2xl font-bold text-white">¡Ruta creada!</h2>
      <p className="text-slate-400">Redirigiendo al panel...</p>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin")} className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Crear Nueva Ruta</h1>
          <p className="text-slate-400 text-sm mt-0.5">Define el recorrido y los precios por tramo</p>
        </div>
      </div>

      {/* Route Info */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-white">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nombre de la Ruta *</label>
            <input value={routeName} onChange={e => setRouteName(e.target.value)}
              placeholder="Ej: Lima → Huancayo (Ruta Central)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tipo de Servicio</label>
            <select value={serviceMode} onChange={e => setServiceMode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="INTERPROVINCIAL">Interprovincial</option>
              <option value="LOCAL">Local / Urbano</option>
            </select>
          </div>
        </div>
      </div>

      {/* Waypoints */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Paradas del Recorrido</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowStationForm(v => !v)} className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
              + Nueva Estación
            </button>
            <button onClick={addWaypoint} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar Parada
            </button>
          </div>
        </div>

        {/* New Station Form */}
        {showStationForm && (
          <div className="p-4 bg-slate-900/70 rounded-xl border border-white/10 space-y-3">
            <p className="text-sm font-medium text-white">Registrar Nueva Estación / Paradero</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre (Ej: Terminal Norte)" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm col-span-2 md:col-span-1" />
              <input value={stationForm.city} onChange={e => setStationForm(f => ({ ...f, city: e.target.value }))} placeholder="Ciudad" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input value={stationForm.address} onChange={e => setStationForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección (opcional)" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input value={stationForm.latitude} onChange={e => setStationForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitud (Ej: -12.065)" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
              <input value={stationForm.longitude} onChange={e => setStationForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitud (Ej: -77.032)" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowStationForm(false)} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10">Cancelar</button>
              <button onClick={createStation} disabled={stationSaving} className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50">
                {stationSaving ? "Guardando..." : "Crear Estación"}
              </button>
            </div>
          </div>
        )}

        {/* City filter */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500">Filtrar estaciones por ciudad:</label>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs">
            <option value="">Todas las ciudades</option>
            {allCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Waypoint list */}
        <div className="space-y-3">
          {waypoints.map((wp, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  ${idx === 0 ? "bg-indigo-500 border-indigo-400 text-white" :
                    idx === waypoints.length - 1 ? "bg-emerald-500 border-emerald-400 text-white" :
                    "bg-slate-800 border-slate-600 text-slate-400"}`}>
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
              <button onClick={() => removeWaypoint(idx)} disabled={waypoints.length <= 2}
                className="text-slate-600 hover:text-red-400 disabled:opacity-20 mt-1 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Price summary */}
        {waypoints.length >= 2 && waypoints[0].stationId && waypoints[waypoints.length-1].stationId && (
          <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>{getStationName(waypoints[0].stationId)}</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span>{getStationName(waypoints[waypoints.length-1].stationId)}</span>
            </div>
            <p className="text-white font-bold">
              S/ {waypoints.reduce((sum, wp, i) => i > 0 ? sum + Number(wp.basePrice) : sum, 0).toFixed(2)} total
            </p>
          </div>
        )}
      </div>

      {/* Error / Save */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-4 justify-end">
        <button onClick={() => router.push("/admin")} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={saveRoute} disabled={saving}
          className="gradient-btn px-6 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 flex items-center gap-2">
          {saving ? "Guardando..." : "Crear Ruta"}
        </button>
      </div>
    </div>
  );
}
