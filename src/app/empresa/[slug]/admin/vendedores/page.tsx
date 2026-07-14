"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Users, AlertCircle, CheckCircle2, RefreshCw,
  X, MapPin, ToggleLeft, ToggleRight, Loader2, Pencil, Save
} from "lucide-react";
import { getCompanyBySlug, getCompanyById } from "@/lib/api/branding";
import { getUsers, createSeller, updateUserProfile, toggleUser } from "@/lib/api/admin";
import { getAllStations } from "@/lib/api/routes";

type Seller = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  docType?: string;
  docNum?: string;
  phone?: string;
  station?: { id: string; name: string; city: string } | null;
};

type Station = { id: string; name: string; city: string };

const emptyForm = {
  name: "",
  email: "",
  password: "",
  stationId: "",
  docType: "DNI",
  docNum: "",
  phone: "",
};

export default function AdminVendedoresPage() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = creando
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
      let compData: any;
      try {
        compData = await getCompanyBySlug<any>(slugStr as string);
      } catch {
        compData = await getCompanyById<any>(slugStr as string);
      }
      const cid = compData.company?.id;
      setCompanyId(cid);

      // Cargar vendedores de la empresa
      const usersData = await getUsers<any>({ companyId: cid, role: "AGENCY_SELLER", limit: 100 });
      setSellers(usersData.data || []);

      // Cargar todas las estaciones (sin filtro de ciudad)
      const stData = await getAllStations<any>();
      setStations(stData.stations || []);

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

  function openEdit(seller: Seller) {
    setEditingId(seller.id);
    setForm({
      name: seller.name,
      email: seller.email,
      password: "",
      stationId: seller.station?.id || "",
      docType: seller.docType || "DNI",
      docNum: seller.docNum || "",
      phone: seller.phone || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function saveSeller(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    if (!editingId) {
      if (!form.email.trim() || !form.password.trim() || !form.stationId) {
        setFormError("Correo, contraseña y paradero son obligatorios.");
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
        const data = await updateUserProfile<any>(editingId, {
          name: form.name,
          docType: form.docType,
          docNum: form.docNum,
          phone: form.phone,
          stationId: form.stationId || null,
        });
        setSuccess(`✅ Vendedor ${data.user.name} actualizado exitosamente.`);
      } else {
        const data = await createSeller<any>({ ...form, companyId });
        setSuccess(`✅ Vendedor ${data.user.name} creado exitosamente.`);
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

  async function toggleSeller(seller: Seller) {
    setToggling(seller.id);
    try {
      await toggleUser(seller.id, !seller.isActive);
      const updated = !seller.isActive;
      setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, isActive: updated } : s));
      setSuccess(`✅ Vendedor ${seller.name} ${updated ? "activado" : "desactivado"}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToggling(null);
    }
  }

  const activeSellers = sellers.filter(s => s.isActive);
  const inactiveSellers = sellers.filter(s => !s.isActive);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Personal de Ventas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${sellers.length} vendedor${sellers.length !== 1 ? "es" : ""} registrado${sellers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={openForm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Plus className="w-4 h-4" /> Nuevo Vendedor
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
        <form onSubmit={saveSeller}
          className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> {editingId ? "Editar Vendedor" : "Crear Cuenta de Vendedor"}
            </h2>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nombre completo *</label>
              <input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Juan Pérez"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Correo electrónico (Login) {editingId ? "" : "*"}</label>
              <input type="email" value={form.email}
                disabled={!!editingId}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="vendedor@empresa.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
              {editingId && <p className="text-[11px] text-slate-600 mt-1">El correo de acceso no se puede cambiar desde aquí.</p>}
            </div>
            {!editingId && (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Contraseña inicial *</label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mín. 8 caracteres"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors" />
            </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Asignar Paradero / Estación {editingId ? "" : "*"}</label>
              <select value={form.stationId}
                onChange={e => setForm(f => ({ ...f, stationId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
                <option value="">Selecciona un punto de venta...</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Tipo de Doc.</label>
              <select value={form.docType}
                onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
                {["DNI", "CE", "PASAPORTE", "RUC"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">N° Documento</label>
              <input value={form.docNum}
                onChange={e => setForm(f => ({ ...f, docNum: e.target.value }))}
                placeholder="12345678"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Teléfono</label>
              <input value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+51 999 000 111"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors" />
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
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {editingId ? "Guardando..." : "Creando..."}</>
                : editingId ? <><Save className="w-4 h-4" /> Guardar Cambios</> : <><Plus className="w-4 h-4" /> Crear Vendedor</>}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : sellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-white/5">
          <Users className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No hay vendedores registrados</p>
          <p className="text-slate-600 text-sm mt-1">Haz clic en "Nuevo Vendedor" para empezar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Activos */}
          {activeSellers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Activos ({activeSellers.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSellers.map(seller => (
                  <SellerCard key={seller.id} seller={seller} toggling={toggling} onToggle={toggleSeller} onEdit={openEdit} />
                ))}
              </div>
            </div>
          )}
          {/* Inactivos */}
          {inactiveSellers.length > 0 && (
            <div className="space-y-3 opacity-70">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Inactivos ({inactiveSellers.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveSellers.map(seller => (
                  <SellerCard key={seller.id} seller={seller} toggling={toggling} onToggle={toggleSeller} onEdit={openEdit} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SellerCard({
  seller, toggling, onToggle, onEdit
}: {
  seller: Seller;
  toggling: string | null;
  onToggle: (s: Seller) => void;
  onEdit: (s: Seller) => void;
}) {
  const isToggling = toggling === seller.id;

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-white">{seller.name}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{seller.email}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${
            seller.isActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
              : "bg-slate-500/20 text-slate-500 border border-slate-500/20"
          }`}>
            {seller.isActive ? "ACTIVO" : "INACTIVO"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 py-2.5 px-3 bg-slate-800/60 rounded-xl">
          <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>
            Punto de venta:{" "}
            <span className="text-white font-semibold">
              {seller.station ? `${seller.station.name} — ${seller.station.city}` : "No asignado"}
            </span>
          </span>
        </div>

        {(seller.docNum || seller.phone) && (
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            {seller.docNum && <span>{seller.docType}: {seller.docNum}</span>}
            {seller.phone && <span>📱 {seller.phone}</span>}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-white/5 bg-slate-900/40 flex items-center gap-1">
        <button
          onClick={() => onEdit(seller)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={() => onToggle(seller)}
          disabled={isToggling}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition-all disabled:opacity-50 ${
            seller.isActive
              ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20"
              : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20"
          }`}>
          {isToggling
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : seller.isActive
              ? <><ToggleRight className="w-3.5 h-3.5" /> Desactivar</>
              : <><ToggleLeft className="w-3.5 h-3.5" /> Activar</>
          }
        </button>
      </div>
    </div>
  );
}
