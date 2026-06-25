"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Bus, Plus, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth";
import ImageUploader from "@/components/ui/ImageUploader";
import SeatConfigEditor, { SeatTemplate } from "@/components/ui/SeatConfigEditor";

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
  seatTemplate?: any[];
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
  MINIVAN: "🚐", BUS_1P: "🚌", BUS_2P: "🚍", AUTO: "🚗",
};

export default function EmpresaAdminVehiculosPage() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    plateNumber: "",
    vehicleType: "MINIVAN",
    serviceMode: "INTERPROVINCIAL",
    capacity: 12,
    imageUrl: "",
  });
  const [seatTemplate, setSeatTemplate] = useState<SeatTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSeatConfigChange = useCallback((template: SeatTemplate, capacity: number) => {
    setSeatTemplate(template);
    setForm(f => ({ ...f, capacity }));
  }, []);

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

      const vRes = await authFetch(`${API}/api/v1/vehicles/company/${cid}`);
      const vData = await vRes.json();
      setVehicles(vData.vehicles || []);
    } catch (e: any) {
      setError(e.message || "Error al cargar vehículos");
    } finally {
      setLoading(false);
    }
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.plateNumber.trim()) { setFormError("La placa es obligatoria."); return; }
    if (form.capacity < 1 || form.capacity > 100) { setFormError("La capacidad debe estar entre 1 y 100."); return; }

    setSaving(true);
    try {
      const payload: any = { companyId, ...form };
      if (seatTemplate) payload.seatTemplate = seatTemplate;

      const res = await authFetch(`${API}/api/v1/vehicles`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar vehículo");

      setSuccess(`✅ Vehículo ${data.vehicle?.plateNumber || form.plateNumber} registrado exitosamente.`);
      setForm({ plateNumber: "", vehicleType: "MINIVAN", serviceMode: "INTERPROVINCIAL", capacity: 12, imageUrl: "" });
      setSeatTemplate(null);
      setShowForm(false);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const activeVehicles = vehicles.filter(v => v.isActive);
  const inactiveVehicles = vehicles.filter(v => !v.isActive);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-indigo-400" />
            Gestión de Flota
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${vehicles.length} vehículo${vehicles.length !== 1 ? "s" : ""} registrado${vehicles.length !== 1 ? "s" : ""}`}
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
            <Plus className="w-5 h-5" /> Agregar Vehículo
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

      {/* ─── Formulario nuevo vehículo ─────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={createVehicle}
          className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
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
          <ImageUploader
            label="Foto del Vehículo"
            hint="Se redimensionará a 800×400px y se convertirá a WebP. Recomendado: foto lateral del bus."
            value={form.imageUrl}
            onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
            maxWidth={800}
            maxHeight={400}
            quality={0.85}
            fit="contain"
            folder="vehiculos"
          />

          {/* Configurador visual de asientos */}
          <div className="border-t border-white/5 pt-4">
            <SeatConfigEditor
              vehicleType={form.vehicleType}
              onChange={handleSeatConfigChange}
            />
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
                <><Plus className="w-4 h-4" /> Registrar Vehículo</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── Lista de vehículos ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
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
          {activeVehicles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Activos ({activeVehicles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeVehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
              </div>
            </div>
          )}
          {inactiveVehicles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Inactivos ({inactiveVehicles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {inactiveVehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
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
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
      <div className="flex items-stretch">
        {/* Imagen */}
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
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-indigo-400 font-bold text-base">{vehicle.capacity}</span>
              asientos
            </div>
            {Array.isArray(vehicle.seatTemplate) && vehicle.seatTemplate.length > 0 && (
              <span className="text-xs text-slate-500">
                ({vehicle.seatTemplate.length} asientos configurados)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            Registrado: {new Date(vehicle.createdAt).toLocaleDateString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  );
}
