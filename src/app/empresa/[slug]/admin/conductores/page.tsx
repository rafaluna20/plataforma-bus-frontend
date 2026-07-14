"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Truck, AlertCircle, CheckCircle2, RefreshCw,
  X, Phone, FileText, ToggleLeft, ToggleRight, Loader2,
  Mail, IdCard, User, Pencil, Save, Trash2
} from "lucide-react";
import { getCompanyBySlug, getCompanyById } from "@/lib/api/branding";
import { getUsers, createDriver, updateUserProfile, toggleUser, deleteUser } from "@/lib/api/admin";

type Driver = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  docType?: string;
  docNum?: string;
  phone?: string;
  licenseNumber?: string | null;
  company?: { id: string; tradeName: string } | null;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  docType: "DNI",
  docNum: "",
  phone: "",
  licenseNumber: "",
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
  const [editingId, setEditingId] = useState<string | null>(null); // null = creando
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, [slugStr]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      // Obtener empresa
      let compData: any;
      try {
        compData = await getCompanyBySlug<any>(slugStr as string);
      } catch {
        compData = await getCompanyById<any>(slugStr as string);
      }
      const cid = compData.company?.id;
      setCompanyId(cid);

      // Cargar conductores de la empresa
      const usersData = await getUsers<any>({ companyId: cid, role: "DRIVER", limit: 100 });
      setDrivers(usersData.data || []);

    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  function openForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(driver: Driver) {
    setEditingId(driver.id);
    setForm({
      name: driver.name,
      email: driver.email,
      password: "",
      docType: driver.docType || "DNI",
      docNum: driver.docNum || "",
      phone: driver.phone || "",
      licenseNumber: driver.licenseNumber || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function saveDriver(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    if (!editingId) {
      if (!form.email.trim() || !form.password.trim()) {
        setFormError("Correo y contraseña son obligatorios.");
        return;
      }
      if (form.password.length < 8) {
        setFormError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        // EDITAR: solo datos de perfil (no email/password)
        const body: any = { name: form.name };
        if (form.docType) body.docType = form.docType;
        if (form.docNum) body.docNum = form.docNum;
        if (form.phone) body.phone = form.phone;
        body.licenseNumber = form.licenseNumber || null;

        const data = await updateUserProfile<any>(editingId, body);
        setSuccess(`✅ Conductor ${data.user.name} actualizado exitosamente.`);
      } else {
        // CREAR
        const body: any = {
          name: form.name,
          email: form.email,
          password: form.password,
          companyId,
        };
        if (form.docType) body.docType = form.docType;
        if (form.docNum) body.docNum = form.docNum;
        if (form.phone) body.phone = form.phone;
        if (form.licenseNumber) body.licenseNumber = form.licenseNumber;

        const data = await createDriver<any>(body);
        setSuccess(`✅ Conductor ${data.user.name} creado exitosamente.`);
      }

      setShowForm(false);
      setEditingId(null);
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
      await toggleUser(driver.id, !driver.isActive);
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

  async function deleteDriver(id: string) {
    setDeleting(true);
    try {
      await deleteUser(id);
      setSuccess("✅ Conductor eliminado.");
      setDeleteConfirm(null);
      loadData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
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

      {/* ── Modal de confirmación eliminar ──────────────────────────────────── */}
      {deleteConfirm && (() => {
        const driver = drivers.find(d => d.id === deleteConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Eliminar conductor</h3>
                  <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                ¿Confirmas que deseas eliminar a <span className="font-bold text-white">{driver?.name}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button onClick={() => deleteDriver(deleteConfirm)} disabled={deleting}
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

      {/* Formulario */}
      {showForm && (
        <form onSubmit={saveDriver}
          className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" /> {editingId ? "Editar Conductor" : "Registrar Conductor"}
            </h2>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
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
                <Mail className="w-3 h-3 inline mr-1" />Correo electrónico (Login) {editingId ? "" : "*"}
              </label>
              <input type="email" value={form.email}
                disabled={!!editingId}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="conductor@empresa.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
              {editingId && <p className="text-[11px] text-slate-600 mt-1">El correo de acceso no se puede cambiar desde aquí.</p>}
            </div>
            {!editingId && (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Contraseña inicial *</label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 8 caracteres"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
            )}
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
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <IdCard className="w-3 h-3 inline mr-1" />N° de Licencia de Conducir
              </label>
              <input value={form.licenseNumber}
                onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                placeholder="Para el Manifiesto de Pasajeros"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-cyan-500 focus:outline-none transition-colors" />
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {editingId ? "Guardando..." : "Creando..."}</>
                : editingId ? <><Save className="w-4 h-4" /> Guardar Cambios</> : <><Plus className="w-4 h-4" /> Crear Conductor</>}
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
                  <DriverCard key={driver.id} driver={driver} toggling={toggling} onToggle={toggleDriver} onEdit={openEdit} onDelete={setDeleteConfirm} />
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
                  <DriverCard key={driver.id} driver={driver} toggling={toggling} onToggle={toggleDriver} onEdit={openEdit} onDelete={setDeleteConfirm} />
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
  driver, toggling, onToggle, onEdit, onDelete
}: {
  driver: Driver;
  toggling: string | null;
  onToggle: (d: Driver) => void;
  onEdit: (d: Driver) => void;
  onDelete: (id: string) => void;
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
          {driver.licenseNumber && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/60 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Lic. {driver.licenseNumber}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/5 bg-slate-900/40 flex items-center gap-1">
        <button
          onClick={() => onEdit(driver)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
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
        <button
          onClick={() => onDelete(driver.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all ml-auto">
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
    </div>
  );
}
