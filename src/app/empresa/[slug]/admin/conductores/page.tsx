"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Truck, AlertCircle, CheckCircle2, RefreshCw,
  X, Phone, FileText, ToggleLeft, ToggleRight, Loader2,
  Mail, IdCard, User
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Driver = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  docType?: string;
  docNum?: string;
  phone?: string;
  company?: { id: string; tradeName: string } | null;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  docType: "DNI",
  docNum: "",
  phone: "",
};

export default function AdminConductoresPage() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [slugStr]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Obtener empresa
      let compRes = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      let compData = await compRes.json();
      if (!compRes.ok) {
        compRes = await fetch(`${API}/api/v1/branding/id/${slugStr}`);
        compData = await compRes.json();
        if (!compRes.ok) throw new Error("Empresa no encontrada");
      }
      const cid = compData.company?.id;
      setCompanyId(cid);

      // Cargar conductores de la empresa
      const usersRes = await authFetch(`${API}/api/v1/admin/users?companyId=${cid}&role=DRIVER&limit=100`);
      const usersData = await usersRes.json();
      setDrivers(usersData.data || []);

    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  function openForm() {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  }

  async function saveDriver(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("Nombre, correo y contraseña son obligatorios.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: form.name,
        email: form.email,
        password: form.password,
        companyId,
      };
      if (form.docType) body.docType = form.docType;
      if (form.docNum) body.docNum = form.docNum;
      if (form.phone) body.phone = form.phone;

      const res = await authFetch(`${API}/api/v1/admin/users/driver`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear conductor");

      setSuccess(`✅ Conductor ${data.user.name} creado exitosamente.`);
      setShowForm(false);
      setForm(emptyForm);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDriver(driver: Driver) {
    setToggling(driver.id);
    try {
      const res = await authFetch(`${API}/api/v1/admin/users/${driver.id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !driver.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cambiar estado");
      }
      const updated = !driver.isActive;
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, isActive: updated } : d));
      setSuccess(`✅ Conductor ${driver.name} ${updated ? "activado" : "desactivado"}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToggling(null);
    }
  }

  const activeDrivers = drivers.filter(d => d.isActive);
  const inactiveDrivers = drivers.filter(d => !d.isActive);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-cyan-400" />
            Conductores
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${drivers.length} conductor${drivers.length !== 1 ? "es" : ""} registrado${drivers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={openForm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
            <Plus className="w-4 h-4" /> Nuevo Conductor
          </button>
        </div>
      </div>

      {/* Alertas */}
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

      {/* Formulario */}
      {showForm && (
        <form onSubmit={saveDriver}
          className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" /> Registrar Conductor
            </h2>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <User className="w-3 h-3 inline mr-1" />Nombre completo *
              </label>
              <input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Carlos Mendoza"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <Mail className="w-3 h-3 inline mr-1" />Correo electrónico (Login) *
              </label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="conductor@empresa.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Contraseña inicial *</label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 8 caracteres"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <Phone className="w-3 h-3 inline mr-1" />Teléfono
              </label>
              <input value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+51 999 000 111"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <IdCard className="w-3 h-3 inline mr-1" />Tipo de Documento
              </label>
              <select value={form.docType}
                onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                {["DNI", "CE", "PASAPORTE", "RUC"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <FileText className="w-3 h-3 inline mr-1" />N° Documento
              </label>
              <input value={form.docNum}
                onChange={e => setForm(f => ({ ...f, docNum: e.target.value }))}
                placeholder="12345678"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : <><Plus className="w-4 h-4" /> Crear Conductor</>}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-white/5">
          <Truck className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No hay conductores registrados</p>
          <p className="text-slate-600 text-sm mt-1">Haz clic en &quot;Nuevo Conductor&quot; para empezar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Activos */}
          {activeDrivers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Activos ({activeDrivers.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDrivers.map(driver => (
                  <DriverCard key={driver.id} driver={driver} toggling={toggling} onToggle={toggleDriver} />
                ))}
              </div>
            </div>
          )}
          {/* Inactivos */}
          {inactiveDrivers.length > 0 && (
            <div className="space-y-3 opacity-70">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Inactivos ({inactiveDrivers.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveDrivers.map(driver => (
                  <DriverCard key={driver.id} driver={driver} toggling={toggling} onToggle={toggleDriver} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DriverCard({
  driver, toggling, onToggle
}: {
  driver: Driver;
  toggling: string | null;
  onToggle: (d: Driver) => void;
}) {
  const isToggling = toggling === driver.id;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/20 transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">{driver.name}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{driver.email}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${
            driver.isActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
              : "bg-slate-500/20 text-slate-500 border border-slate-500/20"
          }`}>
            {driver.isActive ? "ACTIVO" : "INACTIVO"}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          {driver.docNum && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/60 rounded-lg">
              <IdCard className="w-3.5 h-3.5 text-slate-500" />
              {driver.docType}: {driver.docNum}
            </span>
          )}
          {driver.phone && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/60 rounded-lg">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              {driver.phone}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/5 bg-slate-900/40 flex">
        <button
          onClick={() => onToggle(driver)}
          disabled={isToggling}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-all disabled:opacity-50 ${
            driver.isActive
              ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20"
              : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20"
          }`}>
          {isToggling
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : driver.isActive
              ? <><ToggleRight className="w-3.5 h-3.5" /> Desactivar</>
              : <><ToggleLeft className="w-3.5 h-3.5" /> Activar</>
          }
        </button>
      </div>
    </div>
  );
}
