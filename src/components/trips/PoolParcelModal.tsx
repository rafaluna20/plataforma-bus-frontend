"use client";

import { useState, useEffect } from "react";
import {
  X, Package, User, Phone, MapPin, ArrowRight,
  DollarSign, Weight, FileText, Loader2, CheckCircle2
} from "lucide-react";
import { createParcel } from "@/lib/api/parcels";

type Waypoint = {
  id: string;
  stopOrder: number;
  station: { id: string; name: string; city: string };
};

type Route = {
  id: string;
  name: string;
  waypoints: Waypoint[];
};

interface PoolParcelModalProps {
  companyId: string;
  routes: Route[];
  primaryColor: string;
  secondaryColor: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo (pago al retiro)" },
  { value: "DIGITAL", label: "Pago digital (ya pagado)" },
];

/**
 * Registra una encomienda "pendiente de asignar" (sin viaje): solo se elige
 * la ruta (origen/destino), no una unidad ni horario concretos. Queda en la
 * bandeja de la empresa hasta que el personal la asigne a un viaje real al
 * momento del despacho.
 */
export default function PoolParcelModal({
  companyId,
  routes,
  primaryColor,
  secondaryColor,
  onClose,
  onSuccess,
}: PoolParcelModalProps) {
  const sortedWaypoints = (routeId: string) =>
    [...(routes.find((r) => r.id === routeId)?.waypoints || [])].sort((a, b) => a.stopOrder - b.stopOrder);

  const [form, setForm] = useState({
    routeId: routes[0]?.id ?? "",
    senderName: "",
    senderDoc: "",
    receiverName: "",
    receiverDoc: "",
    startWaypointId: "",
    endWaypointId: "",
    description: "",
    weightKg: "",
    totalPrice: "",
    paymentMethod: "CASH",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const waypoints = sortedWaypoints(form.routeId);

  // Inicializar/actualizar origen-destino cuando cambia la ruta seleccionada
  useEffect(() => {
    setForm((f) => ({
      ...f,
      startWaypointId: waypoints[0]?.id ?? "",
      endWaypointId: waypoints[waypoints.length - 1]?.id ?? "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.routeId]);

  const startWp = waypoints.find((w) => w.id === form.startWaypointId);
  const validEndWaypoints = waypoints.filter((w) => !startWp || w.stopOrder > startWp.stopOrder);

  useEffect(() => {
    const endWp = waypoints.find((w) => w.id === form.endWaypointId);
    if (startWp && endWp && endWp.stopOrder <= startWp.stopOrder) {
      const next = waypoints.find((w) => w.stopOrder > startWp.stopOrder);
      setForm((f) => ({ ...f, endWaypointId: next?.id ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startWaypointId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.routeId) return setError("Selecciona una ruta.");
    if (!form.senderName.trim() || !form.senderDoc.trim()) {
      return setError("Nombre y documento del remitente son obligatorios.");
    }
    if (!form.receiverName.trim() || !form.receiverDoc.trim()) {
      return setError("Nombre y documento del destinatario son obligatorios.");
    }
    if (!form.startWaypointId || !form.endWaypointId) {
      return setError("Selecciona el origen y destino de la encomienda.");
    }
    if (!form.totalPrice || parseFloat(form.totalPrice) <= 0) {
      return setError("El precio total debe ser mayor a S/ 0.00.");
    }

    setSaving(true);
    try {
      await createParcel({
        companyId,
        senderName:     form.senderName.trim(),
        senderDoc:      form.senderDoc.trim(),
        receiverName:   form.receiverName.trim(),
        receiverDoc:    form.receiverDoc.trim(),
        startWaypointId: form.startWaypointId,
        endWaypointId:   form.endWaypointId,
        description:    form.description.trim() || undefined,
        weightKg:       form.weightKg ? parseFloat(form.weightKg) : undefined,
        totalPrice:     parseFloat(form.totalPrice),
        paymentMethod:  form.paymentMethod,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-white/25 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5"
          style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}10)`, backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `${primaryColor}25` }}>
              <Package className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="font-bold text-white">Registrar Encomienda sin Viaje</h2>
              <p className="text-xs text-slate-400">Queda pendiente de asignar hasta el despacho</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-900/95">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: `${primaryColor}20` }}>
              <CheckCircle2 className="w-9 h-9" style={{ color: primaryColor }} />
            </div>
            <p className="font-bold text-white text-lg">¡Encomienda registrada!</p>
            <p className="text-slate-400 text-sm mt-1">Quedó en la bandeja, pendiente de asignar a un viaje.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ── Ruta ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Ruta
            </p>
            <select name="routeId" value={form.routeId} onChange={handleChange} className={inputCls}>
              {routes.length === 0 && <option value="">No hay rutas registradas</option>}
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* ── Remitente ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Remitente
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nombre completo *</label>
                <input name="senderName" value={form.senderName} onChange={handleChange} placeholder="Juan Pérez" className={inputCls} required />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">DNI / RUC *</label>
                <input name="senderDoc" value={form.senderDoc} onChange={handleChange} placeholder="12345678" className={inputCls} required />
              </div>
            </div>
          </div>

          {/* ── Destinatario ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Destinatario
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nombre completo *</label>
                <input name="receiverName" value={form.receiverName} onChange={handleChange} placeholder="María García" className={inputCls} required />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">DNI / RUC *</label>
                <input name="receiverDoc" value={form.receiverDoc} onChange={handleChange} placeholder="87654321" className={inputCls} required />
              </div>
            </div>
          </div>

          {/* ── Tramo ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Tramo de Envío
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Origen *</label>
                <select name="startWaypointId" value={form.startWaypointId} onChange={handleChange} className={inputCls}>
                  {waypoints.slice(0, -1).map((wp) => (
                    <option key={wp.id} value={wp.id}>{wp.station.name}</option>
                  ))}
                </select>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 flex-shrink-0 mt-5" />
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Destino *</label>
                <select name="endWaypointId" value={form.endWaypointId} onChange={handleChange} className={inputCls}>
                  {validEndWaypoints.map((wp) => (
                    <option key={wp.id} value={wp.id}>{wp.station.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Detalle del paquete ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Detalles del Paquete
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Descripción del contenido</label>
                <textarea
                  name="description" value={form.description} onChange={handleChange}
                  placeholder="Ej: Ropa, documentos, electrónico..." rows={2} className={`${inputCls} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                    <Weight className="w-3 h-3" /> Peso (kg)
                  </label>
                  <input
                    name="weightKg" type="number" step="0.1" min="0" value={form.weightKg}
                    onChange={handleChange} placeholder="0.5" className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Precio total S/ *
                  </label>
                  <input
                    name="totalPrice" type="number" step="0.01" min="0.01" value={form.totalPrice}
                    onChange={handleChange} placeholder="10.00" className={inputCls} required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Método de pago ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Pago
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value} type="button" onClick={() => setForm((f) => ({ ...f, paymentMethod: pm.value }))}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                    form.paymentMethod === pm.value ? "text-white" : "border-white/10 bg-slate-800/40 text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                  style={form.paymentMethod === pm.value ? {
                    background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}20)`,
                    borderColor: `${primaryColor}60`, color: primaryColor,
                  } : {}}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button
              type="submit" disabled={saving || routes.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : <><Package className="w-4 h-4" /> Registrar Encomienda</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
