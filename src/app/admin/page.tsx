"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bus, Map, Plus, Activity, Users, ArrowRight, RefreshCw, Clock, CheckCircle2, AlertCircle, Ticket } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Trip = {
  id: string;
  status: string;
  departureTime: string;
  route: { name: string };
  vehicle: { plateNumber: string; capacity: number };
};

type Route = { id: string; name: string; waypoints: any[] };
type Vehicle = { id: string; plateNumber: string; vehicleType: string; capacity: number };

function statusLabel(s: string) {
  const map: Record<string, { label: string; color: string }> = {
    SCHEDULED: { label: "Programado", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
    BOARDING: { label: "Abordando", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
    IN_TRANSIT: { label: "En Tránsito", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
    COMPLETED: { label: "Completado", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    CANCELLED: { label: "Cancelado", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  };
  return map[s] || { label: s, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trips" | "routes" | "vehicles">("trips");

  // --- NEW TRIP FORM ---
  const [showTripForm, setShowTripForm] = useState(false);
  const [tripForm, setTripForm] = useState({ routeId: "", vehicleId: "", departureTime: "" });
  const [tripSaving, setTripSaving] = useState(false);
  const [tripError, setTripError] = useState("");

  // --- NEW VEHICLE FORM ---
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ plateNumber: "", vehicleType: "MINIVAN", serviceMode: "INTERPROVINCIAL", capacity: 12 });
  const [vehicleSaving, setVehicleSaving] = useState(false);

  useEffect(() => {
    loadCompanyData();
  }, []);

  async function loadCompanyData(forceCid?: string) {
    setLoading(true);
    try {
      // Siempre obtener el perfil actualizado del servidor para tener el companyId correcto
      const profileRes = await authFetch(`${API}/api/v1/auth/me`);
      const profileData = await profileRes.json();
      const resolvedCid = forceCid || profileData.company?.id || profileData.companyId || user?.companyId;

      if (!resolvedCid) {
        console.error("No se pudo obtener el companyId del usuario");
        setLoading(false);
        return;
      }

      setCompanyId(resolvedCid);

      const [tripsRes, routesRes, vehiclesRes] = await Promise.all([
        authFetch(`${API}/api/v1/management/trips/company/${resolvedCid}`),
        authFetch(`${API}/api/v1/routes/company/${resolvedCid}`),
        authFetch(`${API}/api/v1/vehicles/company/${resolvedCid}`),
      ]);

      const [tripsData, routesData, vehiclesData] = await Promise.all([
        tripsRes.json(), routesRes.json(), vehiclesRes.json()
      ]);

      setTrips(tripsData.trips || []);
      setRoutes(routesData.routes || []);
      setVehicles(vehiclesData.vehicles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createTrip() {
    setTripError("");

    // Validaciones en el frontend antes de enviar
    if (!tripForm.routeId) { setTripError("⚠️ Selecciona una ruta."); return; }
    if (!tripForm.vehicleId) { setTripError("⚠️ Selecciona un vehículo."); return; }
    if (!tripForm.departureTime) { setTripError("⚠️ Selecciona la fecha y hora de salida."); return; }

    const selectedDate = new Date(tripForm.departureTime);
    const now = new Date();
    const diffMinutes = (selectedDate.getTime() - now.getTime()) / 60000;

    if (selectedDate <= now) {
      setTripError("📅 La fecha de salida debe ser en el futuro. Selecciona una fecha y hora posterior a ahora.");
      return;
    }
    if (diffMinutes < 30) {
      setTripError("⏰ La salida debe programarse con al menos 30 minutos de anticipación.");
      return;
    }

    setTripSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips`, {
        method: "POST",
        body: JSON.stringify({ routeId: tripForm.routeId, vehicleId: tripForm.vehicleId, departureTime: tripForm.departureTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Mapear mensajes del backend a mensajes amigables
        const msg = data.error || "";
        if (msg.includes("futuro") || msg.includes("fecha")) {
          setTripError("📅 La fecha de salida debe ser en el futuro.");
        } else if (msg.includes("programado") || msg.includes("conflicto")) {
          setTripError("🚌 Este vehículo ya tiene un viaje programado para esa fecha. Elige otro vehículo u otra fecha.");
        } else if (msg.includes("inactivo")) {
          setTripError("🔴 El vehículo seleccionado está inactivo. Elige otro vehículo.");
        } else if (msg.includes("empresa")) {
          setTripError("🏢 El vehículo y la ruta deben pertenecer a la misma empresa.");
        } else {
          setTripError(`❌ ${msg || "Error al programar el viaje. Intenta nuevamente."}`);
        }
        return;
      }
      setShowTripForm(false);
      setTripForm({ routeId: "", vehicleId: "", departureTime: "" });
      loadCompanyData();
    } catch (e: any) {
      setTripError("❌ Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setTripSaving(false);
    }
  }

  async function createVehicle() {
    setVehicleSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/vehicles`, {
        method: "POST",
        body: JSON.stringify({ companyId, ...vehicleForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear vehículo");
      setShowVehicleForm(false);
      loadCompanyData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setVehicleSaving(false);
    }
  }

  const todayTrips = trips.filter(t => {
    const d = new Date(t.departureTime);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const activeTrips = trips.filter(t => t.status === "IN_TRANSIT" || t.status === "BOARDING");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Panel de Operaciones B2B</h1>
          <p className="text-slate-400 mt-1">Transportes Flash — Gestión completa de flota y viajes</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => loadCompanyData()} className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => { setShowTripForm(true); setActiveTab("trips"); }} className="gradient-btn flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white">
            <Plus className="w-5 h-5" /> Programar Viaje
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Viajes Hoy" value={loading ? "..." : String(todayTrips.length)} icon={<Clock className="w-5 h-5 text-indigo-400" />} />
        <StatCard title="En Tránsito" value={loading ? "..." : String(activeTrips.length)} icon={<Activity className="w-5 h-5 text-cyan-400" />} />
        <StatCard title="Rutas" value={loading ? "..." : String(routes.length)} icon={<Map className="w-5 h-5 text-emerald-400" />} />
        <StatCard title="Flota" value={loading ? "..." : String(vehicles.length)} icon={<Bus className="w-5 h-5 text-yellow-400" />} />
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Venta de Pasajes",
            desc: "Registrar venta en mostrador",
            icon: <Ticket className="w-5 h-5" />,
            href: "/admin/venta-pasajes",
            color: "from-indigo-500 to-purple-600",
            highlight: true,
          },
          {
            label: "Perfil de Empresa",
            desc: "Logo, colores y datos",
            icon: <Map className="w-5 h-5" />,
            href: "/admin/empresa",
            color: "from-slate-700 to-slate-800",
            highlight: false,
          },
          {
            label: "Gestión de Flota",
            desc: "Vehículos y capacidades",
            icon: <Bus className="w-5 h-5" />,
            href: "/admin/vehiculos",
            color: "from-slate-700 to-slate-800",
            highlight: false,
          },
          {
            label: "Nueva Ruta",
            desc: "Crear ruta con paradas",
            icon: <Plus className="w-5 h-5" />,
            href: "/admin/rutas/nueva",
            color: "from-slate-700 to-slate-800",
            highlight: false,
          },
        ].map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left hover:scale-[1.02] ${
              item.highlight
                ? "border-indigo-500/40 bg-gradient-to-br from-indigo-500/20 to-purple-600/10 hover:border-indigo-400/60"
                : "border-white/8 bg-slate-900/60 hover:border-white/15"
            }`}
          >
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} text-white flex-shrink-0`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm ${item.highlight ? "text-indigo-300" : "text-white"}`}>
                {item.label}
              </p>
              <p className="text-xs text-slate-500 truncate">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 w-fit">
        {(["trips", "routes", "vehicles"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}>
            {tab === "trips" ? "Viajes" : tab === "routes" ? "Rutas" : "Flota"}
          </button>
        ))}
      </div>

      {/* -------- VIAJES -------- */}
      {activeTab === "trips" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Todos los Viajes</h2>
            <button onClick={() => setShowTripForm(true)} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Nuevo Viaje
            </button>
          </div>

          {/* NEW TRIP FORM */}
          {showTripForm && (
            <div className="mb-6 p-5 bg-slate-900/70 rounded-xl border border-indigo-500/30 space-y-4">
              <h3 className="font-semibold text-white">Programar Nuevo Viaje</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ruta</label>
                  <select value={tripForm.routeId} onChange={e => setTripForm(f => ({ ...f, routeId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Selecciona una ruta</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Vehículo</label>
                  <select value={tripForm.vehicleId} onChange={e => setTripForm(f => ({ ...f, vehicleId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Selecciona un vehículo</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} ({v.vehicleType} · {v.capacity} asientos)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Fecha y Hora de Salida</label>
                  <input type="datetime-local" value={tripForm.departureTime} onChange={e => setTripForm(f => ({ ...f, departureTime: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              {tripError && <p className="text-red-400 text-sm">{tripError}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowTripForm(false); setTripError(""); }} className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm">Cancelar</button>
                <button onClick={createTrip} disabled={tripSaving} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
                  {tripSaving ? "Guardando..." : "Programar Viaje"}
                </button>
              </div>
            </div>
          )}

          {loading ? <LoadingRows /> : trips.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay viajes programados. Crea uno con el botón de arriba.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium">Ruta</th>
                    <th className="pb-3 font-medium">Vehículo</th>
                    <th className="pb-3 font-medium">Salida</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {trips.map(t => {
                    const { label, color } = statusLabel(t.status);
                    return (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 text-white font-medium">{t.route?.name || "—"}</td>
                        <td className="py-4 text-slate-300">{t.vehicle?.plateNumber} <span className="text-slate-500">({t.vehicle?.capacity} asientos)</span></td>
                        <td className="py-4 text-slate-300">{new Date(t.departureTime).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${color}`}>{label}</span>
                        </td>
                        <td className="py-4">
                          <button onClick={() => router.push(`/admin/viajes/${t.id}`)} className="text-cyan-400 hover:text-cyan-300 text-xs font-medium flex items-center gap-1">
                            Ver detalle <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------- RUTAS -------- */}
      {activeTab === "routes" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Rutas de la Empresa</h2>
            <button onClick={() => router.push("/admin/rutas/nueva")} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Nueva Ruta
            </button>
          </div>
          {loading ? <LoadingRows /> : routes.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay rutas creadas.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map(r => (
                <div key={r.id} className="bg-slate-900/60 rounded-xl border border-white/5 p-4 hover:border-indigo-500/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">{r.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{r.waypoints?.length || 0} paradas · ID: {r.id.slice(0,8)}…</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  </div>
                  {r.waypoints && r.waypoints.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto">
                      {r.waypoints.sort((a,b)=>a.stopOrder-b.stopOrder).map((w: any, i: number) => (
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
      )}

      {/* -------- FLOTA -------- */}
      {activeTab === "vehicles" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Flota de Vehículos</h2>
            <button onClick={() => setShowVehicleForm(v => !v)} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar Vehículo
            </button>
          </div>

          {/* NEW VEHICLE FORM */}
          {showVehicleForm && (
            <div className="mb-6 p-5 bg-slate-900/70 rounded-xl border border-indigo-500/30 space-y-4">
              <h3 className="font-semibold text-white">Registrar Nuevo Vehículo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Placa</label>
                  <input value={vehicleForm.plateNumber} onChange={e => setVehicleForm(f => ({ ...f, plateNumber: e.target.value }))}
                    placeholder="ABC-456" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                  <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm(f => ({ ...f, vehicleType: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="MINIVAN">Minivan</option>
                    <option value="BUS_1P">Bus 1 Piso</option>
                    <option value="BUS_2P">Bus 2 Pisos</option>
                    <option value="AUTO">Auto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Servicio</label>
                  <select value={vehicleForm.serviceMode} onChange={e => setVehicleForm(f => ({ ...f, serviceMode: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="INTERPROVINCIAL">Interprovincial</option>
                    <option value="LOCAL">Local</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Capacidad</label>
                  <input type="number" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: +e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowVehicleForm(false)} className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm">Cancelar</button>
                <button onClick={createVehicle} disabled={vehicleSaving} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
                  {vehicleSaving ? "Guardando..." : "Registrar Vehículo"}
                </button>
              </div>
            </div>
          )}

          {loading ? <LoadingRows /> : vehicles.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay vehículos registrados.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(v => (
                <div key={v.id} className="bg-slate-900/60 rounded-xl border border-white/5 p-4 flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Bus className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{v.plateNumber}</p>
                    <p className="text-slate-400 text-sm">{v.vehicleType} · {v.capacity} asientos</p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Activo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="glass-card p-5 hover-lift">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">{icon}</div>
      </div>
      <p className="text-slate-400 text-xs font-medium">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
    </div>
  );
}
