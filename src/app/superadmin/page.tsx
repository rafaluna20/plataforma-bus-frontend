"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Users, Building2, Plus, RefreshCw, Search,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  UserCheck, UserX, Crown, Truck, User, Eye, EyeOff
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UserRole = "SUPER_ADMIN" | "ADMIN" | "DRIVER" | "PASSENGER";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  balance: string;
  createdAt: string;
  company?: { id: string; tradeName: string } | null;
};

type Company = {
  id: string;
  tradeName: string;
  legalName: string;
  ruc: string;
  isActive: boolean;
};

type Stats = {
  totalUsers: number;
  // El backend devuelve byRole: { ADMIN, SUPER_ADMIN, PASSENGER, DRIVER }
  byRole?: {
    ADMIN?: number;
    SUPER_ADMIN?: number;
    DRIVER?: number;
    PASSENGER?: number;
  };
  // Campos alternativos (por si el backend cambia)
  totalAdmins?: number;
  totalDrivers?: number;
  totalPassengers?: number;
  totalCompanies: number;
  activeUsers?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "text-purple-400 bg-purple-500/10 border-purple-500/30", icon: <Crown className="w-3 h-3" /> },
  ADMIN:       { label: "Admin",       color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: <Shield className="w-3 h-3" /> },
  DRIVER:      { label: "Conductor",   color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",       icon: <Truck className="w-3 h-3" /> },
  PASSENGER:   { label: "Pasajero",    color: "text-slate-400 bg-slate-500/10 border-slate-500/30",    icon: <User className="w-3 h-3" /> },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function SuperAdminPanel() {
  const router = useRouter();
  const { user, loading: authLoading, hasRole } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "create_admin" | "companies">("users");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ─── Formulario Crear ADMIN ───────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "", email: "", password: "", companyId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ─── Formulario Cambiar Rol ───────────────────────────────────────────────
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("PASSENGER");
  const [newCompanyId, setNewCompanyId] = useState("");

  // ─── Formulario Crear Empresa ─────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState({
    ruc: "", tradeName: "", legalName: "", commissionRate: "0",
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState("");

  // ─── Guardia de seguridad ─────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !hasRole("SUPER_ADMIN")) {
      router.replace("/?error=unauthorized");
    }
  }, [authLoading, hasRole, router]);

  // ─── Cargar datos ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes, statsRes] = await Promise.all([
        authFetch(`${API}/api/v1/admin/users?limit=100`),
        authFetch(`${API}/api/v1/companies`),
        authFetch(`${API}/api/v1/admin/stats`),
      ]);

      if (usersRes.ok) {
        const d = await usersRes.json();
        // El backend devuelve { data: [...], total, page, totalPages }
        setUsers(d.data || d.users || []);
      }
      if (companiesRes.ok) {
        const d = await companiesRes.json();
        setCompanies(d.companies || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && hasRole("SUPER_ADMIN")) {
      loadData();
    }
  }, [authLoading, hasRole, loadData]);

  // ─── Toast helper ─────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Crear ADMIN ──────────────────────────────────────────────────────────
  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || !form.password || !form.companyId) {
      setFormError("Todos los campos son obligatorios"); return;
    }
    if (form.password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres"); return;
    }
    setFormSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/admin/users/admin`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear ADMIN");
      setForm({ name: "", email: "", password: "", companyId: "" });
      showToast(`✅ ADMIN "${data.user.name}" creado exitosamente`, "success");
      setActiveTab("users");
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  }

  // ─── Cambiar Rol ──────────────────────────────────────────────────────────
  async function handleChangeRole(userId: string) {
    try {
      const body: any = { role: newRole };
      if (newRole === "ADMIN" || newRole === "DRIVER") {
        if (!newCompanyId) { showToast("Selecciona una empresa para este rol", "error"); return; }
        body.companyId = newCompanyId;
      }
      const res = await authFetch(`${API}/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar rol");
      showToast(`Rol actualizado a ${ROLE_CONFIG[newRole].label}`, "success");
      setChangingRole(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  // ─── Activar / Desactivar usuario ─────────────────────────────────────────
  async function handleToggleActive(userId: string, currentlyActive: boolean) {
    const endpoint = currentlyActive ? "deactivate" : "activate";
    try {
      const res = await authFetch(`${API}/api/v1/admin/users/${userId}/${endpoint}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      showToast(currentlyActive ? "Usuario desactivado" : "Usuario activado", "success");
      loadData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "ALL" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // ─── Guard: no renderizar si no es SUPER_ADMIN ────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasRole("SUPER_ADMIN")) return null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-3 transition-all
          ${toast.type === "success"
            ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-300"
            : "bg-red-900/90 border-red-500/40 text-red-300"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <Crown className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Panel Super Admin</h1>
            <p className="text-slate-400 mt-0.5">Gestión global de usuarios, roles y empresas</p>
          </div>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Usuarios" value={stats.totalUsers} color="text-white" />
          <StatCard title="Admins"         value={stats.byRole?.ADMIN      ?? stats.totalAdmins      ?? 0} color="text-indigo-400" />
          <StatCard title="Conductores"    value={stats.byRole?.DRIVER     ?? stats.totalDrivers     ?? 0} color="text-cyan-400" />
          <StatCard title="Pasajeros"      value={stats.byRole?.PASSENGER  ?? stats.totalPassengers  ?? 0} color="text-slate-300" />
          <StatCard title="Empresas"       value={stats.totalCompanies} color="text-emerald-400" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 w-fit">
        {([
          { key: "users", label: "👥 Usuarios" },
          { key: "create_admin", label: "➕ Crear ADMIN" },
          { key: "companies", label: "🏢 Empresas" },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
              ? "bg-purple-600 text-white"
              : "text-slate-400 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: USUARIOS ─────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            {/* Filtro por rol */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="ALL">Todos los roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="DRIVER">Conductor</option>
                <option value="PASSENGER">Pasajero</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {loading ? <LoadingRows /> : filteredUsers.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No se encontraron usuarios.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium">Usuario</th>
                    <th className="pb-3 font-medium">Rol</th>
                    <th className="pb-3 font-medium">Empresa</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map(u => {
                    const roleConf = ROLE_CONFIG[u.role];
                    const isChanging = changingRole === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4">
                          <p className="font-medium text-white">{u.name}</p>
                          <p className="text-slate-500 text-xs">{u.email}</p>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleConf.color}`}>
                            {roleConf.icon} {roleConf.label}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400 text-xs">
                          {u.company?.tradeName || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-4">
                          {u.isActive
                            ? <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Activo</span>
                            : <span className="text-red-400 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactivo</span>}
                        </td>
                        <td className="py-4">
                          {u.role !== "SUPER_ADMIN" && (
                            <div className="flex items-center gap-2">
                              {/* Cambiar rol */}
                              {!isChanging ? (
                                <button
                                  onClick={() => { setChangingRole(u.id); setNewRole(u.role); setNewCompanyId(u.company?.id || ""); }}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                  Cambiar rol
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}
                                    className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white">
                                    <option value="ADMIN">Admin</option>
                                    <option value="DRIVER">Conductor</option>
                                    <option value="PASSENGER">Pasajero</option>
                                  </select>
                                  {(newRole === "ADMIN" || newRole === "DRIVER") && (
                                    <select value={newCompanyId} onChange={e => setNewCompanyId(e.target.value)}
                                      className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white">
                                      <option value="">Empresa...</option>
                                      {companies.map(c => <option key={c.id} value={c.id}>{c.tradeName}</option>)}
                                    </select>
                                  )}
                                  <button onClick={() => handleChangeRole(u.id)}
                                    className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded font-bold">
                                    Guardar
                                  </button>
                                  <button onClick={() => setChangingRole(null)}
                                    className="text-xs text-slate-400 hover:text-white">
                                    ✕
                                  </button>
                                </div>
                              )}

                              {/* Activar / Desactivar */}
                              <button
                                onClick={() => handleToggleActive(u.id, u.isActive)}
                                className={`text-xs font-medium flex items-center gap-1 ${u.isActive ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"}`}>
                                {u.isActive ? <><UserX className="w-3 h-3" /> Desactivar</> : <><UserCheck className="w-3 h-3" /> Activar</>}
                              </button>
                            </div>
                          )}
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

      {/* ─── TAB: CREAR ADMIN ──────────────────────────────────────────────── */}
      {activeTab === "create_admin" && (
        <div className="glass-card p-8 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Crear nuevo ADMIN</h2>
              <p className="text-slate-400 text-sm">El ADMIN podrá gestionar viajes, rutas y vehículos de su empresa</p>
            </div>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nombre completo *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: María García"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Correo electrónico *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@empresa.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Usa mayúsculas, números y símbolos para mayor seguridad</p>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Empresa *</label>
              <select
                value={form.companyId}
                onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="">Selecciona la empresa del ADMIN</option>
                {companies.filter(c => c.isActive).map(c => (
                  <option key={c.id} value={c.id}>{c.tradeName} — RUC {c.ruc}</option>
                ))}
              </select>
              {companies.length === 0 && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> No hay empresas registradas. Crea una primero en la pestaña Empresas.
                </p>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={formSaving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {formSaving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Crear ADMIN</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setForm({ name: "", email: "", password: "", companyId: "" })}
                className="px-5 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB: EMPRESAS ─────────────────────────────────────────────────── */}
      {activeTab === "companies" && (
        <div className="space-y-6">

          {/* Formulario Crear Empresa */}
          <div className="glass-card p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Registrar nueva empresa</h2>
                <p className="text-slate-400 text-xs">Las empresas pueden tener ADMINs, conductores y rutas asignadas</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setCompanyError("");
              if (!companyForm.ruc || !companyForm.tradeName || !companyForm.legalName) {
                setCompanyError("RUC, nombre comercial y razón social son obligatorios"); return;
              }
              if (!/^\d{11}$/.test(companyForm.ruc)) {
                setCompanyError("El RUC debe tener exactamente 11 dígitos"); return;
              }
              setCompanySaving(true);
              try {
                const res = await authFetch(`${API}/api/v1/companies`, {
                  method: "POST",
                  body: JSON.stringify({
                    ruc: companyForm.ruc,
                    tradeName: companyForm.tradeName,
                    legalName: companyForm.legalName,
                    commissionRate: parseFloat(companyForm.commissionRate) || 0,
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Error al crear empresa");
                setCompanyForm({ ruc: "", tradeName: "", legalName: "", commissionRate: "0" });
                showToast(`✅ Empresa "${data.company.tradeName}" registrada exitosamente`, "success");
                loadData();
              } catch (err: any) {
                setCompanyError(err.message);
              } finally {
                setCompanySaving(false);
              }
            }} className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">RUC * (11 dígitos)</label>
                  <input
                    value={companyForm.ruc}
                    onChange={e => setCompanyForm(f => ({ ...f, ruc: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    placeholder="20123456789"
                    maxLength={11}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Comisión % (0-100)</label>
                  <input
                    type="number"
                    min="0" max="100" step="0.01"
                    value={companyForm.commissionRate}
                    onChange={e => setCompanyForm(f => ({ ...f, commissionRate: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nombre comercial *</label>
                <input
                  value={companyForm.tradeName}
                  onChange={e => setCompanyForm(f => ({ ...f, tradeName: e.target.value }))}
                  placeholder="Ej: Transportes Flash"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Razón social *</label>
                <input
                  value={companyForm.legalName}
                  onChange={e => setCompanyForm(f => ({ ...f, legalName: e.target.value }))}
                  placeholder="Ej: Transportes Flash S.A.C."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {companyError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {companyError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={companySaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {companySaving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Registrando...</>
                    : <><Plus className="w-4 h-4" /> Registrar Empresa</>}
                </button>
                <button type="button"
                  onClick={() => { setCompanyForm({ ruc: "", tradeName: "", legalName: "", commissionRate: "0" }); setCompanyError(""); }}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                  Limpiar
                </button>
              </div>
            </form>
          </div>

          {/* Lista de empresas */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Empresas Registradas</h2>
              <span className="text-slate-400 text-sm">{companies.length} empresa{companies.length !== 1 ? "s" : ""}</span>
            </div>
            {loading ? <LoadingRows /> : companies.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay empresas registradas aún.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map(c => (
                  <div key={c.id} className="bg-slate-900/60 rounded-xl border border-white/5 p-5 hover:border-emerald-500/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <Building2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{c.tradeName}</h3>
                          <p className="text-slate-400 text-xs">{c.legalName}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${c.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
                        {c.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-slate-500 text-xs">RUC: {c.ruc}</span>
                      <span className="text-slate-600 text-xs font-mono">{c.id.slice(0, 8)}…</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-slate-400 text-xs font-medium mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
