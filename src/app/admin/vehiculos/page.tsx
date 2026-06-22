"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bus, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Vehicle = {
  id: string;
  plateNumber: string;
  vehicleType: string;
  serviceMode: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  imageUrl?: string | null;
  seatTemplate?: { id: string }[];
};

const VEHICLE_TYPES = [
  { value: "MINIVAN",  label: "Minivan" },
  { value: "BUS_1P",   label: "Bus 1 Piso" },
  { value: "BUS_2P",   label: "Bus 2 Pisos" },
  { value: "AUTO",     label: "Auto" },
];

const SERVICE_MODES = [
  { value: "INTERPROVINCIAL", label: "Interprovincial" },
  { value: "LOCAL",           label: "Local / Urbano" },
];

const typeIcon: Record<string, string> = {
  MINIVAN: "🚐",
  BUS_1P:  "🚌",
  BUS_2P:  "🚍",
  AUTO:    "🚗",
};

export default function VehiculosPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    plateNumber: "",
    vehicleType: "MINIVAN",
    serviceMode: "INTERPROVINCIAL",
    capacity: 12,
    imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Usar /auth/me para obtener el companyId del usuario logueado (igual que el panel admin)
      const profileRes = await authFetch(`${API}/api/v1/auth/me`);
      const profileData = await profileRes.json();
      const cid = profileData.company?.id || profileData.companyId;
      if (!cid) { setError("No se encontró empresa asociada a tu cuenta."); setLoading(false); return; }

      setCompanyId(cid);

      const vRes = await authFetch(`${API}/api/v1/vehicles/company/${cid}`);
      const vData = await vRes.json();
      setVehicles(vData.vehicles || []);
    } catch (e) {
      setError("Error al cargar los vehículos.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.plateNumber.trim()) { setFormError("La placa es obligatoria."); return; }
    if (form.capacity < 1 || form.capacity > 100) { setFormError("La capacidad debe estar entre 1 y 100."); return; }

    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/vehicles`, {
        method: "POST",
        body: JSON.stringify({ companyId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar vehículo");

      setFormSuccess(`Vehículo ${data.vehicle?.plateNumber || form.plateNumber} registrado exitosamente.`);
      setForm({ plateNumber: "", vehicleType: "MINIVAN", serviceMode: "INTERPROVINCIAL", capacity: 12, imageUrl: "" });
      setShowForm(false);
      loadData();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const activeVehicles = vehicles.filter(v => v.isActive);
  const inactiveVehicles = vehicles.filter(v => !v.isActive);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin")}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Gestión de Flota</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {loading ? "Cargando..." : `${vehicles.length} vehículo${vehicles.length !== 1 ? "s" : ""} registrado${vehicles.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => { setShowForm(v => !v); setFormError(""); setFormSuccess(""); }}
            className="gradient-btn flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white">
            <Plus className="w-5 h-5" /> Agregar Vehículo
          </button>
        </div>
      </div>

      {/* Mensaje de éxito global */}
      {formSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {formSuccess}
        </div>
      )}

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Formulario de nuevo vehículo ─────────────────────────────────── */}
      {showForm && (
        <form onSubmit={createVehicle}
          className="glass-card p-6 space-y-5 border border-indigo-500/30">
          <h2 className="font-semibold text-white text-lg">Registrar Nuevo Vehículo</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Placa */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Placa *</label>
              <input
                value={form.plateNumber}
                onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))}
                placeholder="Ej: ABC-456"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Tipo de vehículo */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tipo de Vehículo *</label>
              <select
                value={form.vehicleType}
                onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
                {VEHICLE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{typeIcon[t.value]} {t.label}</option>
                ))}
              </select>
            </div>

            {/* Modo de servicio */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tipo de Servicio *</label>
              <select
                value={form.serviceMode}
                onChange={e => setForm(f => ({ ...f, serviceMode: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
                {SERVICE_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Capacidad */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Capacidad (asientos) *</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Imagen del vehículo */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">
              Imagen del Vehículo <span className="text-slate-600">(URL de foto o imagen similar)</span>
            </label>
            <div className="flex gap-3 items-start">
              <input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://ejemplo.com/foto-bus.jpg"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              />
              {form.imageUrl && (
                <div className="w-20 h-14 rounded-xl border border-white/10 overflow-hidden bg-slate-800 flex-shrink-0">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain p-1"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              💡 Puedes usar una URL de imagen de internet o subir a Imgur/Cloudinary y pegar el enlace.
            </p>
          </div>

          {/* Preview de asientos */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 md:col-span-2">
            <p className="text-xs text-slate-500 mb-2">Vista previa de asientos ({form.capacity} asientos)</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: Math.min(form.capacity, 50) }).map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-md bg-slate-700 border border-slate-600 flex items-center justify-center text-xs text-slate-400">
                  {i + 1}
                </div>
              ))}
              {form.capacity > 50 && (
                <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                  +{form.capacity - 50}
                </div>
              )}
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setFormError(""); }}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="gradient-btn px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Plus className="w-4 h-4" /> Registrar Vehículo</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── Lista de vehículos ────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="p-5 bg-slate-800/50 rounded-2xl border border-white/5">
            <Bus className="w-12 h-12 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No hay vehículos registrados</p>
          <p className="text-slate-600 text-sm">Haz clic en "Agregar Vehículo" para comenzar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Activos */}
          {activeVehicles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Activos ({activeVehicles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeVehicles.map(v => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            </div>
          )}

          {/* Inactivos */}
          {inactiveVehicles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Inactivos ({inactiveVehicles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {inactiveVehicles.map(v => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const emoji = typeIcon[vehicle.vehicleType] || "🚌";
  const typeLabel = VEHICLE_TYPES.find(t => t.value === vehicle.vehicleType)?.label || vehicle.vehicleType;
  const modeLabel = SERVICE_MODES.find(m => m.value === vehicle.serviceMode)?.label || vehicle.serviceMode;

  return (
    <div className="glass-card overflow-hidden hover:border-indigo-500/30 transition-all">
      <div className="flex items-stretch">
        {/* Imagen del vehículo */}
        <div className="w-32 flex-shrink-0 bg-slate-800/60 flex items-center justify-center p-3 border-r border-white/5">
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={vehicle.plateNumber}
              className="w-full h-20 object-contain drop-shadow-lg"
              onError={e => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) parent.innerHTML = `<span class="text-4xl">${emoji}</span>`;
              }}
            />
          ) : (
            <span className="text-4xl">{emoji}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white text-base">{vehicle.plateNumber}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              vehicle.isActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}>
              {vehicle.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{typeLabel} · {modeLabel}</p>

          {/* Asientos */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-indigo-400 font-bold text-base">{vehicle.capacity}</span>
              asientos
            </div>
            <div className="flex flex-wrap gap-1 max-w-[160px]">
              {Array.isArray(vehicle.seatTemplate) && vehicle.seatTemplate.slice(0, 10).map((s, idx) => (
                <div key={typeof s === "object" && s !== null ? (s as any).id ?? idx : idx}
                  className="w-4 h-4 rounded bg-slate-700 border border-slate-600 flex items-center justify-center text-[8px] text-slate-400">
                  {idx + 1}
                </div>
              ))}
              {Array.isArray(vehicle.seatTemplate) && vehicle.seatTemplate.length > 10 && (
                <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-500">
                  +{vehicle.seatTemplate.length - 10}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-1.5">
            Registrado: {new Date(vehicle.createdAt).toLocaleDateString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  );
}
