"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X, Percent, Plus, Trash2, Loader2, AlertCircle, Clock, CalendarDays,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  getFareRulesByRoute, createFareRule, updateFareRule, deleteFareRule,
} from "@/lib/api/fareRules";

type RouteItem = { id: string; name: string; waypoints: any[] };

type FareRule = {
  id: string;
  name: string;
  ruleType: "TIME_BAND" | "SPECIFIC_DATE";
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[] | null;
  startDate: string | null;
  endDate: string | null;
  priceMultiplier: number;
  isActive: boolean;
};

interface FareRulesModalProps {
  route: RouteItem;
  onClose: () => void;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const emptyForm = {
  name: "",
  ruleType: "TIME_BAND" as "TIME_BAND" | "SPECIFIC_DATE",
  startTime: "19:00",
  endTime: "23:59",
  daysOfWeek: [] as number[], // vacío = todos los días
  startDate: "",
  endDate: "",
  targetPrice: "",
};

/** Precio base de la ruta completa (primer a último punto), igual que calcTripPrice. */
function fullRouteBasePrice(waypoints: any[]): number {
  const sorted = [...waypoints].sort((a, b) => a.stopOrder - b.stopOrder);
  if (sorted.length < 2) return 0;
  const first = sorted[0];
  return sorted.reduce((acc, wp) => (wp.stopOrder > first.stopOrder ? acc + Number(wp.basePrice || 0) : acc), 0);
}

export default function FareRulesModal({ route, onClose }: FareRulesModalProps) {
  const [rules, setRules] = useState<FareRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const basePrice = useMemo(() => fullRouteBasePrice(route.waypoints), [route.waypoints]);

  useEffect(() => { loadRules(); }, [route.id]);

  async function loadRules() {
    setLoading(true);
    setError("");
    try {
      const data = await getFareRulesByRoute<any>(route.id);
      setRules(data.rules || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter(d => d !== day) : [...f.daysOfWeek, day],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Ponle un nombre a la regla (ej. \"Tarifa nocturna\").");
    if (form.ruleType === "TIME_BAND" && (!form.startTime || !form.endTime)) {
      return setError("Indica la hora de inicio y fin de la franja.");
    }
    if (form.ruleType === "SPECIFIC_DATE" && !form.startDate) {
      return setError("Indica la fecha (o el inicio del rango de fechas).");
    }
    const targetPrice = parseFloat(form.targetPrice);
    if (!targetPrice || targetPrice <= 0) return setError("Indica el precio para el tramo completo.");
    if (basePrice <= 0) return setError("Esta ruta no tiene un precio base configurado todavía.");

    const priceMultiplier = targetPrice / basePrice;

    setSaving(true);
    try {
      await createFareRule({
        routeId: route.id,
        name: form.name.trim(),
        ruleType: form.ruleType,
        startTime: form.ruleType === "TIME_BAND" ? form.startTime : undefined,
        endTime: form.ruleType === "TIME_BAND" ? form.endTime : undefined,
        daysOfWeek: form.ruleType === "TIME_BAND" && form.daysOfWeek.length ? form.daysOfWeek : undefined,
        startDate: form.ruleType === "SPECIFIC_DATE" ? form.startDate : undefined,
        endDate: form.ruleType === "SPECIFIC_DATE" ? (form.endDate || form.startDate) : undefined,
        priceMultiplier,
      });
      setShowForm(false);
      setForm(emptyForm);
      loadRules();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: FareRule) {
    setTogglingId(rule.id);
    try {
      await updateFareRule(rule.id, { isActive: !rule.isActive });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(ruleId: string) {
    setDeletingId(ruleId);
    try {
      await deleteFareRule(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15">
              <Percent className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Tarifas Especiales</h2>
              <p className="text-xs text-slate-400">{route.name} · Precio base tramo completo: S/ {Number(basePrice).toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            El precio de cada tramo se ajusta automáticamente según la franja horaria o fecha de salida del viaje — no hace falta tocar nada al momento de la venta. Si ninguna regla aplica, se usa el precio base normal de la ruta.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {rules.length === 0 && !showForm && (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                  <p className="text-sm text-slate-500">Sin reglas de tarifa — se usa siempre el precio base.</p>
                </div>
              )}
              {rules.map(rule => {
                const effectivePrice = basePrice * Number(rule.priceMultiplier);
                return (
                  <div key={rule.id} className={`p-3 rounded-xl border flex items-center gap-3 ${rule.isActive ? "border-white/10 bg-slate-800/40" : "border-white/5 bg-slate-800/10 opacity-60"}`}>
                    <div className={`p-2 rounded-lg ${rule.ruleType === "TIME_BAND" ? "bg-indigo-500/15" : "bg-amber-500/15"}`}>
                      {rule.ruleType === "TIME_BAND"
                        ? <Clock className="w-4 h-4 text-indigo-400" />
                        : <CalendarDays className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{rule.name}</p>
                      <p className="text-xs text-slate-500">
                        {rule.ruleType === "TIME_BAND"
                          ? `${rule.startTime}–${rule.endTime}${rule.daysOfWeek?.length ? ` · ${rule.daysOfWeek.map(d => DAY_LABELS[d]).join(", ")}` : " · todos los días"}`
                          : rule.endDate && rule.endDate !== rule.startDate
                            ? `${rule.startDate} a ${rule.endDate}`
                            : rule.startDate}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 flex-shrink-0">S/ {effectivePrice.toFixed(2)}</span>
                    <button onClick={() => toggleActive(rule)} disabled={togglingId === rule.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50" title={rule.isActive ? "Desactivar" : "Activar"}>
                      {togglingId === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : rule.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(rule.id)} disabled={deletingId === rule.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50" title="Eliminar">
                      {deletingId === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-sm font-medium transition-all">
              <Plus className="w-4 h-4" /> Nueva regla de tarifa
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Nueva regla</p>
                <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder='Ej: "Tarifa nocturna" o "Año Nuevo"' className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, ruleType: "TIME_BAND" }))}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${form.ruleType === "TIME_BAND" ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-slate-700 text-slate-400"}`}>
                  <Clock className="w-3.5 h-3.5" /> Franja horaria
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, ruleType: "SPECIFIC_DATE" }))}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${form.ruleType === "SPECIFIC_DATE" ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-slate-700 text-slate-400"}`}>
                  <CalendarDays className="w-3.5 h-3.5" /> Fecha especial
                </button>
              </div>

              {form.ruleType === "TIME_BAND" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Hora inicio</label>
                      <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Hora fin</label>
                      <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Días (vacío = todos los días)</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_LABELS.map((label, day) => (
                        <button key={day} type="button" onClick={() => toggleDay(day)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.daysOfWeek.includes(day) ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-slate-700 text-slate-500"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Fecha (o inicio del rango)</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Fin del rango (opcional)</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Precio para el tramo completo (S/) *
                </label>
                <input type="number" step="0.01" min="0.01" value={form.targetPrice}
                  onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))}
                  placeholder={basePrice > 0 ? `Ej: ${(basePrice * 1.2).toFixed(2)}` : "0.00"} className={inputCls} />
                <p className="text-[11px] text-slate-600 mt-1">
                  Los tramos parciales se ajustan en la misma proporción (ej. si esto sube 20%, cada tramo también sube 20%).
                </p>
              </div>

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear Regla
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
