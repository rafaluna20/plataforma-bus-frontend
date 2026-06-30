"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  Bus, Plus, AlertCircle, CheckCircle2, RefreshCw,
  Pencil, Trash2, ToggleLeft, ToggleRight, X, Save, Loader2
} from "lucide-react";
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

const emptyForm = {
  plateNumber: "",
  vehicleType: "MINIVAN",
  serviceMode: "INTERPROVINCIAL",
  capacity: 12,
  imageUrl: "",
};

export default function EmpresaAdminVehiculosPage() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const { data: companyData } = useQuery<{ company?: { id: string } }>({
    queryKey: ["companyBranding", slugStr],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      if (!res.ok) throw new Error("Empresa no encontrada");
      return res.json();
    },
    enabled: !!slugStr,
  });
  const companyId = companyData?.company?.id || "";

  const { data: vehiclesData, isLoading: loading, error: queryError, refetch: refetchVehicles } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ["vehicles", companyId],
    queryFn: async () => {
      const res = await authFetch(`${API}/api/v1/vehicles/company/${companyId}`);
      if (!res.ok) throw new Error("Error al cargar vehículos");
      return res.json();
    },
    enabled: !!companyId,
  });
  const vehicles = vehiclesData?.vehicles || [];

  // Formulario (crear / editar)
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null); // null = crear
  const [form, setForm]               = useState(emptyForm);
  const [seatTemplate, setSeatTemplate] = useState<SeatTemplate | null>(null);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");

  // Confirmación eliminar
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const handleSeatConfigChange = useCallback((template: SeatTemplate, capacity: number) => {
    setSeatTemplate(template);
    setForm(f => ({ ...f, capacity }));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSeatTemplate(null);
    setFormError("");
    setShowForm(true);
    setTimeout(() => document.getElementById("vehicle-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function openEdit(v: Vehicle) {
    setEditingId(v.id);
    setForm({
      plateNumber:  v.plateNumber,
      vehicleType:  v.vehicleType,
      serviceMode:  v.serviceMode,
      capacity:     v.capacity,
      imageUrl:     v.imageUrl || "",
    });
    // Cargar el seatTemplate existente para mostrarlo en el editor visual
    setSeatTemplate(v.seatTemplate as unknown as SeatTemplate || null);
    setFormError("");
    setShowForm(true);
    setTimeout(() => document.getElementById("vehicle-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  async function saveVehicle(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.plateNumber.trim()) { setFormError("La placa es obligatoria."); return; }
    if (form.capacity < 1 || form.capacity > 100) { setFormError("La capacidad debe estar entre 1 y 100."); return; }

    setSaving(true);
    try {
      const payload: any = { companyId, ...form };
      if (seatTemplate) payload.seatTemplate = seatTemplate;

      let res, data;
      if (editingId) {
        // EDITAR
        res  = await authFetch(`${API}/api/v1/vehicles/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al actualizar vehículo");
        setSuccess(`✅ Vehículo ${form.plateNumber} actualizado exitosamente.`);
      } else {
        // CREAR
        res  = await authFetch(`${API}/api/v1/vehicles`, { method: "POST", body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al registrar vehículo");
        setSuccess(`✅ Vehículo ${data.vehicle?.plateNumber || form.plateNumber} registrado exitosamente.`);
      }

      closeForm();
      refetchVehicles();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(v: Vehicle) {
    try {
      const res  = await authFetch(`${API}/api/v1/vehicles/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar estado");
      setSuccess(`✅ Vehículo ${v.plateNumber} ${!v.isActive ? "activado" : "desactivado"}.`);
      refetchVehicles();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteVehicle(id: string) {
    setDeleting(true);
    try {
      const res  = await authFetch(`${API}/api/v1/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar vehículo");
      }
      setSuccess("✅ Vehículo eliminado.");
      setDeleteConfirm(null);
      refetchVehicles();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const activeVehicles   = vehicles.filter(v => v.isActive);
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
          <button onClick={() => refetchVehicles()}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Plus className="w-5 h-5" /> Agregar Vehículo
          </button>
        </div>
      </div>

      {/* Mensajes globales */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {success}
        </div>
      )}
      {(error || queryError) && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error || (queryError as Error)?.message}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Modal de confirmación eliminar ──────────────────────────────────── */}
      {deleteConfirm && (() => {
        const veh = vehicles.find(v => v.id === deleteConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Eliminar vehículo</h3>
                  <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                ¿Confirmas que deseas eliminar el vehículo <span className="font-bold text-white">{veh?.plateNumber}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button onClick={() => deleteVehicle(deleteConfirm)} disabled={deleting}
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

      {/* ── Formulario crear / editar ────────────────────────────────────────── */}
      {showForm && (
        <form id="vehicle-form" onSubmit={saveVehicle}
          className="bg-slate-900/80 border rounded-2xl p-6 space-y-5"
          style={{ borderColor: editingId ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)" }}>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-lg flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
              {editingId ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
            </h2>
            <button type="button" onClick={closeForm}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

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
                type="number" min={1} max={100}
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
              value={seatTemplate}
            />
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
                  : <><Plus className="w-4 h-4" /> Registrar Vehículo</>
              }
            </button>
          </div>
        </form>
      )}

      {/* ── Lista de vehículos ───────────────────────────────────────────────── */}
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
                {activeVehicles.map(v => (
                  <VehicleCard
                    key={v.id} vehicle={v}
                    onEdit={() => openEdit(v)}
                    onToggle={() => toggleActive(v)}
                    onDelete={() => setDeleteConfirm(v.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {inactiveVehicles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Inactivos ({inactiveVehicles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
                {inactiveVehicles.map(v => (
                  <VehicleCard
                    key={v.id} vehicle={v}
                    onEdit={() => openEdit(v)}
                    onToggle={() => toggleActive(v)}
                    onDelete={() => setDeleteConfirm(v.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de vehículo con acciones ────────────────────────────────────────
function VehicleCard({
  vehicle, onEdit, onToggle, onDelete
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const emoji     = typeIcon[vehicle.vehicleType] || "🚌";
  const typeLabel = VEHICLE_TYPES.find(t => t.value === vehicle.vehicleType)?.label || vehicle.vehicleType;
  const modeLabel = SERVICE_MODES.find(m => m.value === vehicle.serviceMode)?.label || vehicle.serviceMode;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all group">
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
                ({vehicle.seatTemplate.length} configurados)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            Registrado: {new Date(vehicle.createdAt).toLocaleDateString("es-PE")}
          </p>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-white/5 bg-slate-900/40">
        {/* Editar */}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-indigo-500/15 hover:border-indigo-500/30 border border-transparent transition-all">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>

        {/* Activar / Desactivar */}
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-all ${
            vehicle.isActive
              ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20"
              : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20"
          }`}>
          {vehicle.isActive
            ? <><ToggleRight className="w-3.5 h-3.5" /> Desactivar</>
            : <><ToggleLeft className="w-3.5 h-3.5" /> Activar</>
          }
        </button>

        {/* Eliminar */}
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all">
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
    </div>
  );
}
