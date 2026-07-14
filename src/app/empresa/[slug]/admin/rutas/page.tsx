"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Trash2, MapPin, ArrowRight, AlertCircle, CheckCircle2,
  RefreshCw, Route, Map, Pencil, X, Save, Loader2, Search,
  ChevronUp, ChevronDown, Info, Clock, DollarSign, Percent
} from "lucide-react";
import FareRulesModal from "@/components/routes/FareRulesModal";
import { getCompanyBySlug, getCompanyById } from "@/lib/api/branding";
import {
  getRoutesByCompany, getAllStations,
  createStation as createStationApi, updateStation, deleteStation as deleteStationApi,
  createRoute, updateRoute, deleteRoute as deleteRouteApi,
} from "@/lib/api/routes";
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
  ayacucho: { lat: -13.1588, lng: -74.2236 },
  huancavelica: { lat: -12.7869, lng: -74.9758 },
  pucallpa: { lat: -8.3791, lng: -74.5539 },
  iquitos: { lat: -3.7491, lng: -73.2538 },
  huaraz: { lat: -9.5270, lng: -77.5278 },
  moquegua: { lat: -17.1933, lng: -70.9350 },
};

type Station = { id: string; name: string; city: string; address?: string; latitude?: number; longitude?: number };
type Waypoint = {
  id?: string;
  stationId: string;
  stopOrder: number;
  estimatedDurationMins: number;
  basePrice: number;
  basePriceFloor1?: number | null;
};
type RouteItem = { id: string; name: string; serviceMode: string; waypoints: any[] };

// ── Notificación inline (reemplaza alert()) ──────────────────────────────────
type ToastType = "success" | "error" | "info";
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const show = useCallback((msg: string, type: ToastType = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, show };
}

export default function EmpresaAdminRutasPage() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { toast, show: showToast } = useToast();

  // Búsqueda en lista de rutas
  const [routeSearch, setRouteSearch] = useState("");

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

  // Tarifas especiales (franja horaria / fecha) de una ruta
  const [fareRulesRoute, setFareRulesRoute] = useState<RouteItem | null>(null);

  // Estaciones
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [stationSearch, setStationSearch] = useState("");
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);

  // Nueva / editar estación
  const [showStationForm, setShowStationForm] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationForm, setStationForm] = useState({ name: "", city: "", address: "", latitude: "", longitude: "" });
  const [stationSaving, setStationSaving] = useState(false);
  const [deleteStationConfirm, setDeleteStationConfirm] = useState<string | null>(null);
  const [deletingStation, setDeletingStation] = useState(false);
  // Panel de gestión de estaciones
  const [showStationsPanel, setShowStationsPanel] = useState(false);

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

  // Filtrar estaciones por ciudad Y búsqueda de texto
  useEffect(() => {
    let result = stations;
    if (cityFilter) {
      result = result.filter(s => s.city.toLowerCase().includes(cityFilter.toLowerCase()));
    }
    if (stationSearch.trim()) {
      const q = stationSearch.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
      );
    }
    setFilteredStations(result);
  }, [cityFilter, stationSearch, stations]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Obtener empresa por slug (intentar slug primero, luego por ID/RUC)
      let compData: any;
      try {
        compData = await getCompanyBySlug<any>(slugStr as string);
      } catch {
        compData = await getCompanyById<any>(slugStr as string);
      }
      const cid = compData.company?.id;
      setCompanyId(cid);

      // Cargar rutas
      const routesData = await getRoutesByCompany<any>(cid);
      setRoutes(routesData.routes || []);

      // ✅ MEJORA #1: Cargar TODAS las estaciones en una sola llamada (sin hardcodear ciudades)
      await loadAllStations();
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function loadAllStations() {
    setStationsLoading(true);
    try {
      const data = await getAllStations<any>();
      const allStations: Station[] = data.stations || [];
      setStations(allStations);
      setFilteredStations(allStations);
      const uniqueCities = [...new Set(allStations.map(s => s.city))].sort();
      setAllCities(uniqueCities);
    } catch {
      // Silencioso — las estaciones son opcionales para cargar la página
    } finally {
      setStationsLoading(false);
    }
  }

  async function createStation() {
    if (!stationForm.name.trim() || !stationForm.city.trim() || !stationForm.latitude || !stationForm.longitude) {
      showToast("Completa todos los campos obligatorios: nombre, ciudad, latitud y longitud", "error");
      return;
    }
    setStationSaving(true);
    try {
      const data = await createStationApi<any>({
        companyId,
        name: stationForm.name.trim(),
        city: stationForm.city.trim(),
        address: stationForm.address.trim(),
        latitude: parseFloat(stationForm.latitude),
        longitude: parseFloat(stationForm.longitude),
      });
      // Agregar la nueva estación a la lista local
      setStations(s => [...s, data.station]);
      setShowStationForm(false);
      setStationForm({ name: "", city: "", address: "", latitude: "", longitude: "" });
      showToast(`✅ Estación "${data.station.name}" creada exitosamente`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setStationSaving(false);
    }
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
        id: w.id,
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
    setWaypoints(wps => [...wps, {
      stationId: "",
      stopOrder: wps.length + 1,
      estimatedDurationMins: 60,
      basePrice: 10,
      basePriceFloor1: null
    }]);
  }

  function removeWaypoint(idx: number) {
    if (waypoints.length <= 2) return;
    setWaypoints(wps => wps.filter((_, i) => i !== idx).map((wp, i) => ({ ...wp, stopOrder: i + 1 })));
  }

  // ✅ MEJORA: Mover parada hacia arriba/abajo
  function moveWaypoint(idx: number, direction: "up" | "down") {
    const newWps = [...waypoints];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newWps.length) return;
    [newWps[idx], newWps[targetIdx]] = [newWps[targetIdx], newWps[idx]];
    setWaypoints(newWps.map((wp, i) => ({ ...wp, stopOrder: i + 1 })));
  }

  function updateWaypoint(idx: number, field: keyof Waypoint, value: any) {
    setWaypoints(wps => wps.map((wp, i) => i === idx ? { ...wp, [field]: value } : wp));
  }

  function getStationName(id: string) {
    const s = stations.find(st => st.id === id);
    return s ? `${s.name} (${s.city})` : id;
  }

  // ✅ MEJORA #2: Validar estaciones duplicadas en waypoints
  function validateWaypoints(): string | null {
    const selectedIds = waypoints.map(w => w.stationId).filter(Boolean);
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      return "No puedes seleccionar la misma estación más de una vez en la misma ruta";
    }
    if (waypoints.some(w => !w.stationId)) {
      return "Selecciona una estación para cada parada";
    }
    if (waypoints.some((w, i) => i > 0 && Number(w.basePrice) <= 0)) {
      return "El precio de cada parada debe ser mayor a S/ 0.00";
    }
    if (waypoints.some((w, i) => i > 0 && i < waypoints.length - 1 && Number(w.estimatedDurationMins) <= 0)) {
      return "La duración estimada entre paradas debe ser mayor a 0 minutos";
    }
    return null;
  }

  // ✅ MEJORA #5: Advertir si el nombre de ruta ya existe
  function checkDuplicateName(name: string): boolean {
    return routes.some(r => r.name.toLowerCase().trim() === name.toLowerCase().trim() && r.id !== editingId);
  }

  async function saveRoute(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!routeName.trim()) { setFormError("Ingresa un nombre para la ruta"); return; }

    const wpError = validateWaypoints();
    if (wpError) { setFormError(wpError); return; }

    // ✅ MEJORA #5: Advertencia de nombre duplicado (no bloquea, solo avisa)
    if (checkDuplicateName(routeName)) {
      setFormError(`⚠️ Ya existe una ruta con el nombre "${routeName}". Considera usar un nombre diferente para evitar confusiones.`);
      return;
    }

    setSaving(true);
    try {
      const payload = { companyId, name: routeName.trim(), serviceMode, waypoints };

      if (editingId) {
        await updateRoute(editingId, payload);
        setSuccess("✅ Ruta actualizada exitosamente");
      } else {
        await createRoute(payload);
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
      await deleteRouteApi(id);
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

  // ✅ MEJORA: Calcular duración total de la ruta
  function getTotalDuration(): string {
    const totalMins = waypoints.slice(0, -1).reduce((sum, wp) => sum + Number(wp.estimatedDurationMins || 0), 0);
    if (totalMins === 0) return "";
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}` : `${m}m`;
  }

  // ── Funciones para editar/eliminar estaciones ────────────────────────────
  function openEditStation(station: Station) {
    setEditingStationId(station.id);
    setStationForm({
      name: station.name,
      city: station.city,
      address: station.address || "",
      latitude: station.latitude?.toString() || "",
      longitude: station.longitude?.toString() || "",
    });
    const lat = station.latitude || -12.0464;
    const lng = station.longitude || -77.0428;
    setMapMarker({ lat, lng });
    setFlyToCoords({ lat, lng });
    setShowStationsPanel(true);
    setShowStationForm(true);
  }

  async function saveStation() {
    if (!stationForm.name.trim() || !stationForm.city.trim()) {
      showToast("Nombre y ciudad son obligatorios", "error");
      return;
    }
    setStationSaving(true);
    try {
      if (editingStationId) {
        const data = await updateStation<any>(editingStationId, {
          name: stationForm.name.trim(),
          city: stationForm.city.trim(),
          address: stationForm.address.trim(),
          latitude: stationForm.latitude ? parseFloat(stationForm.latitude) : undefined,
          longitude: stationForm.longitude ? parseFloat(stationForm.longitude) : undefined,
        });
        setStations(s => s.map(st => st.id === editingStationId ? { ...st, ...data.station } : st));
        showToast(`✅ Estación "${data.station.name}" actualizada`, "success");
      } else {
        const data = await createStationApi<any>({
          companyId,
          name: stationForm.name.trim(),
          city: stationForm.city.trim(),
          address: stationForm.address.trim(),
          latitude: parseFloat(stationForm.latitude),
          longitude: parseFloat(stationForm.longitude),
        });
        setStations(s => [...s, data.station]);
        showToast(`✅ Estación "${data.station.name}" creada`, "success");
      }
      setShowStationForm(false);
      setEditingStationId(null);
      setStationForm({ name: "", city: "", address: "", latitude: "", longitude: "" });
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setStationSaving(false);
    }
  }

  async function deleteStation(id: string) {
    setDeletingStation(true);
    try {
      await deleteStationApi(id);
      setStations(s => s.filter(st => st.id !== id));
      setDeleteStationConfirm(null);
      showToast("✅ Estación eliminada", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setDeletingStation(false);
    }
  }

  // Rutas filtradas por búsqueda
  const filteredRoutes = routes.filter(r =>
    r.name.toLowerCase().includes(routeSearch.toLowerCase()) ||
    r.waypoints?.some((w: any) =>
      (w.station?.name || w.locationName || "").toLowerCase().includes(routeSearch.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">

      {/* ✅ MEJORA #3: Toast de notificación (reemplaza alert()) */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium max-w-sm animate-in slide-in-from-top-2 duration-300 ${
          toast.type === "success" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" :
          toast.type === "error" ? "bg-red-500/15 border-red-500/40 text-red-300" :
          "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> :
           toast.type === "error" ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> :
           <Info className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-indigo-400" />
            Gestión de Rutas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${routes.length} ruta${routes.length !== 1 ? "s" : ""} registrada${routes.length !== 1 ? "s" : ""}`}
            {stationsLoading && <span className="ml-2 text-slate-600">· cargando estaciones...</span>}
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

      {/* Mensajes globales */}
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
                ¿Confirmas que deseas eliminar la ruta <span className="font-bold text-white">"{route?.name}"</span>?
              </p>
              <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Los viajes programados en esta ruta podrían verse afectados.
                </p>
              </div>
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
              {/* ✅ MEJORA #5: Advertencia de nombre duplicado en tiempo real */}
              {routeName.trim() && checkDuplicateName(routeName) && (
                <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Ya existe una ruta con este nombre
                </p>
              )}
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
              <div>
                <h3 className="text-sm font-semibold text-white">Paradas del Recorrido</h3>
                {/* ✅ MEJORA: Duración total estimada */}
                {getTotalDuration() && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duración total estimada: <span className="text-indigo-400 font-medium">{getTotalDuration()}</span>
                  </p>
                )}
              </div>
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
                      <label className="text-xs text-slate-400 mb-1 block">Nombre de Estación *</label>
                      <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Terminal Yerbateros" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Ciudad *</label>
                        <input value={stationForm.city} onChange={e => handleCityInput(e.target.value)} placeholder="Ej: Huancayo" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Dirección (opcional)</label>
                        <input value={stationForm.address} onChange={e => setStationForm(f => ({ ...f, address: e.target.value }))} placeholder="Ej: Av. Principal 123" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Latitud *</label>
                        <input value={stationForm.latitude} onChange={e => handleLatLonInput("latitude", e.target.value)} placeholder="-12.0464" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Longitud *</label>
                        <input value={stationForm.longitude} onChange={e => handleLatLonInput("longitude", e.target.value)} placeholder="-77.0428" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setShowStationForm(false)} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10">Cancelar</button>
                    <button type="button" onClick={createStation} disabled={stationSaving}
                      className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1.5">
                      {stationSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : "Crear Estación"}
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
                    📍 Arrastra el marcador para ubicar la estación
                  </div>
                </div>
              </div>
            )}

            {/* ✅ MEJORA #1 + #4: Filtros de estación mejorados (búsqueda + ciudad) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={stationSearch}
                  onChange={e => setStationSearch(e.target.value)}
                  placeholder="Buscar estación..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Ciudad:</label>
                <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs">
                  <option value="">Todas ({stations.length})</option>
                  {allCities.map(c => (
                    <option key={c} value={c}>
                      {c} ({stations.filter(s => s.city === c).length})
                    </option>
                  ))}
                </select>
              </div>
              {(stationSearch || cityFilter) && (
                <button type="button" onClick={() => { setStationSearch(""); setCityFilter(""); }}
                  className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
              <span className="text-xs text-slate-600 ml-auto">
                {filteredStations.length} estación{filteredStations.length !== 1 ? "es" : ""}
              </span>
            </div>

            {/* Lista de waypoints */}
            <div className="space-y-3">
              {waypoints.map((wp, idx) => {
                const isDuplicate = wp.stationId && waypoints.some((w, i) => i !== idx && w.stationId === wp.stationId);
                return (
                  <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    isDuplicate ? "bg-red-500/5 border-red-500/30" : "bg-slate-800/50 border-white/5"
                  }`}>
                    {/* Indicador de parada + controles de orden */}
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                        ${idx === 0 ? "bg-indigo-500 border-indigo-400 text-white" :
                          idx === waypoints.length - 1 ? "bg-emerald-500 border-emerald-400 text-white" :
                          "bg-slate-700 border-slate-600 text-slate-400"}`}>
                        {idx + 1}
                      </div>
                      {/* ✅ MEJORA: Botones de reordenamiento */}
                      <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => moveWaypoint(idx, "up")}
                          disabled={idx === 0}
                          className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveWaypoint(idx, "down")}
                          disabled={idx === waypoints.length - 1}
                          className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {idx < waypoints.length - 1 && <div className="w-0.5 h-3 bg-white/10" />}
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-500 mb-1 block">
                          {idx === 0 ? "🟣 Origen" : idx === waypoints.length - 1 ? "🟢 Destino" : "📍 Parada intermedia"}
                        </label>
                        <select value={wp.stationId} onChange={e => updateWaypoint(idx, "stationId", e.target.value)}
                          className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-white text-sm ${
                            isDuplicate ? "border-red-500/50" : "border-slate-700"
                          }`}>
                          <option value="">Selecciona estación</option>
                          {filteredStations.map(s => (
                            <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                          ))}
                        </select>
                        {/* ✅ MEJORA #2: Advertencia de estación duplicada */}
                        {isDuplicate && (
                          <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Esta estación ya está en la ruta
                          </p>
                        )}
                      </div>

                      {/* Duración (ocultar en última parada) */}
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {idx < waypoints.length - 1 ? "Duración al siguiente (min)" : "—"}
                        </label>
                        <input type="number" min="0" value={wp.estimatedDurationMins}
                          onChange={e => updateWaypoint(idx, "estimatedDurationMins", +e.target.value)}
                          disabled={idx === waypoints.length - 1}
                          placeholder={idx === waypoints.length - 1 ? "Destino final" : "60"}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed" />
                      </div>

                      {/* Precios */}
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {idx === 0 ? "Precio (origen)" : "S/ Piso 2 / Único"}
                          </label>
                          <input type="number" step="0.50" min="0" value={wp.basePrice}
                            onChange={e => updateWaypoint(idx, "basePrice", +e.target.value)}
                            disabled={idx === 0}
                            placeholder="0.00"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed" />
                        </div>
                        {idx > 0 && (
                          <div>
                            <label className="text-xs text-amber-500/80 mb-1 block">S/ Piso 1 / VIP (opcional)</label>
                            <input
                              type="number" step="0.50" min="0"
                              placeholder="Igual que Piso 2"
                              value={wp.basePriceFloor1 ?? ""}
                              onChange={e => updateWaypoint(idx, "basePriceFloor1", e.target.value === "" ? null : +e.target.value)}
                              className="w-full bg-slate-800 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-300 text-sm placeholder:text-slate-600" />
                          </div>
                        )}
                      </div>
                    </div>

                    <button type="button" onClick={() => removeWaypoint(idx)} disabled={waypoints.length <= 2}
                      className="text-slate-600 hover:text-red-400 disabled:opacity-20 mt-1 transition-colors"
                      title="Eliminar parada">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ✅ MEJORA #6: Resumen mejorado con precio y duración */}
            {waypoints.length >= 2 && waypoints[0].stationId && waypoints[waypoints.length - 1].stationId && (
              <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium">{getStationName(waypoints[0].stationId)}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">{getStationName(waypoints[waypoints.length - 1].stationId)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {waypoints.length} paradas
                  </span>
                  {getTotalDuration() && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {getTotalDuration()} estimado
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 ml-auto">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-white font-bold text-sm">
                      S/ {waypoints[waypoints.length - 1].basePrice?.toFixed(2) || "0.00"}
                    </span>
                    <span className="text-slate-500">precio destino final</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="flex items-start gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {formError}
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

      {/* ✅ MEJORA #4: Búsqueda en lista de rutas */}
      {!loading && routes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={routeSearch}
            onChange={e => setRouteSearch(e.target.value)}
            placeholder="Buscar ruta por nombre o estación..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          {routeSearch && (
            <button onClick={() => setRouteSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ─── Panel de Gestión de Estaciones ────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-white/8 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowStationsPanel(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <p className="font-semibold text-white text-sm">Gestión de Estaciones / Paraderos</p>
              <p className="text-xs text-slate-500">{stations.length} estaciones registradas — haz clic para editar o eliminar</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showStationsPanel ? "rotate-180" : ""}`} />
        </button>

        {showStationsPanel && (
          <div className="border-t border-white/5 p-5 space-y-4">
            {/* Formulario editar/crear estación desde el panel */}
            {showStationForm && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/70 rounded-xl border border-indigo-500/20">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    {editingStationId ? <><Pencil className="w-4 h-4 text-indigo-400" /> Editar Estación</> : <><Plus className="w-4 h-4 text-indigo-400" /> Nueva Estación</>}
                  </p>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nombre *</label>
                    <input value={stationForm.name} onChange={e => setStationForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Terminal Yerbateros" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Ciudad *</label>
                      <input value={stationForm.city} onChange={e => handleCityInput(e.target.value)} placeholder="Ej: Lima" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Dirección</label>
                      <input value={stationForm.address} onChange={e => setStationForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Principal 123" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
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
                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={() => { setShowStationForm(false); setEditingStationId(null); setStationForm({ name: "", city: "", address: "", latitude: "", longitude: "" }); }}
                      className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10">Cancelar</button>
                    <button type="button" onClick={saveStation} disabled={stationSaving}
                      className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1.5">
                      {stationSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : editingStationId ? "Guardar Cambios" : "Crear Estación"}
                    </button>
                  </div>
                </div>
                <div className="h-64 rounded-xl overflow-hidden border border-slate-700 relative">
                  <LocationPicker marker={mapMarker} setMarker={handleMapMarkerChange} flyTo={flyToCoords} />
                  <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-white/10 px-2 py-1 rounded text-[10px] text-slate-300 pointer-events-none z-[400]">
                    📍 Arrastra el marcador
                  </div>
                </div>
              </div>
            )}

            {/* Modal confirmar eliminar estación */}
            {deleteStationConfirm && (() => {
              const st = stations.find(s => s.id === deleteStationConfirm);
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                  <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-500/10 rounded-xl"><Trash2 className="w-6 h-6 text-red-400" /></div>
                      <div>
                        <h3 className="font-bold text-white">Eliminar estación</h3>
                        <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm">
                      ¿Eliminar la estación <span className="font-bold text-white">"{st?.name}"</span> en {st?.city}?
                    </p>
                    <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg">
                      <p className="text-amber-400 text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Si la estación está en uso en alguna ruta, no podrá eliminarse.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setDeleteStationConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm">Cancelar</button>
                      <button onClick={() => deleteStation(deleteStationConfirm)} disabled={deletingStation}
                        className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                        {deletingStation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Barra de búsqueda + botón nueva estación */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input value={stationSearch} onChange={e => setStationSearch(e.target.value)} placeholder="Buscar estación..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Todas las ciudades</option>
                {allCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => { setEditingStationId(null); setStationForm({ name: "", city: "", address: "", latitude: "", longitude: "" }); setShowStationForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4" /> Nueva
              </button>
            </div>

            {/* Tabla de estaciones */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-800/50">
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Ciudad</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium hidden md:table-cell">Dirección</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStations.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-500 text-sm">No se encontraron estaciones</td></tr>
                  ) : filteredStations.map(s => (
                    <tr key={s.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">{s.city}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{s.address || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditStation(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition-all">
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button onClick={() => setDeleteStationConfirm(s.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
      ) : filteredRoutes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Search className="w-8 h-8 text-slate-600" />
          <p className="text-slate-400">No se encontraron rutas para "{routeSearch}"</p>
          <button onClick={() => setRouteSearch("")} className="text-indigo-400 text-sm hover:text-indigo-300">
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRoutes.map(r => {
            const sortedWps = [...(r.waypoints || [])].sort((a, b) => a.stopOrder - b.stopOrder);
            const totalDurationMins = sortedWps.slice(0, -1).reduce((sum: number, w: any) => sum + (w.estimatedDurationMins || 0), 0);
            const totalDurationStr = totalDurationMins > 0
              ? (Math.floor(totalDurationMins / 60) > 0
                ? `${Math.floor(totalDurationMins / 60)}h ${totalDurationMins % 60 > 0 ? (totalDurationMins % 60) + "m" : ""}`
                : `${totalDurationMins}m`)
              : null;
            const lastWp = sortedWps[sortedWps.length - 1];
            const maxPrice = lastWp ? parseFloat(lastWp.basePrice) : 0;

            return (
              <div key={r.id}
                className="bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col hover:border-indigo-500/30 transition-all group overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{r.name}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500">
                        {r.waypoints?.length || 0} paradas
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: r.serviceMode === "INTERPROVINCIAL" ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.15)",
                          color: r.serviceMode === "INTERPROVINCIAL" ? "#818cf8" : "#34d399",
                        }}>
                        {r.serviceMode === "INTERPROVINCIAL" ? "Interprovincial" : "Local"}
                      </span>
                      {totalDurationStr && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {totalDurationStr}
                        </span>
                      )}
                      {maxPrice > 0 && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> S/ {maxPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                </div>

                {/* Paradas del recorrido */}
                {sortedWps.length > 0 && (
                  <div className="px-5 pb-4 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto">
                    {sortedWps.map((w: any, i: number) => (
                      <span key={w.id || i} className="flex items-center gap-2 whitespace-nowrap">
                        <span className={`${i === 0 ? "text-indigo-300" : i === sortedWps.length - 1 ? "text-emerald-300" : "text-slate-300"}`}>
                          {w.station?.name || w.locationName}
                        </span>
                        {i < sortedWps.length - 1 && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            {w.estimatedDurationMins > 0 && (
                              <span className="text-[10px]">{w.estimatedDurationMins}m</span>
                            )}
                          </span>
                        )}
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
                    onClick={() => setFareRulesRoute(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 border border-transparent transition-all">
                    <Percent className="w-3.5 h-3.5" /> Tarifas
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(r.id)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fareRulesRoute && (
        <FareRulesModal route={fareRulesRoute} onClose={() => setFareRulesRoute(null)} />
      )}
    </div>
  );
}
