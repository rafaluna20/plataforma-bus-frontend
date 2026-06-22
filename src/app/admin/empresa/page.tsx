"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Palette, Phone, Globe, MapPin, Mail,
  Save, CheckCircle2, AlertCircle, RefreshCw, Eye, Upload
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import ImageUploader from "@/components/ui/ImageUploader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type CompanyBranding = {
  id: string;
  tradeName: string;
  legalName: string;
  ruc: string;
  slug: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  bannerUrl: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
  contactEmail: string | null;
};

export default function EmpresaBrandingPage() {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"identidad" | "contacto" | "preview">("identidad");

  const [form, setForm] = useState({
    slug: "",
    logoUrl: "",
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    bannerUrl: "",
    phone: "",
    address: "",
    city: "",
    website: "",
    description: "",
    contactEmail: "",
  });

  useEffect(() => {
    loadBranding();
  }, []);

  async function loadBranding() {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/v1/branding/me`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar branding");
      const c: CompanyBranding = data.company;
      setCompany(c);
      setForm({
        slug: c.slug || "",
        logoUrl: c.logoUrl || "",
        primaryColor: c.primaryColor || "#6366f1",
        secondaryColor: c.secondaryColor || "#8b5cf6",
        bannerUrl: c.bannerUrl || "",
        phone: c.phone || "",
        address: c.address || "",
        city: c.city || "",
        website: c.website || "",
        description: c.description || "",
        contactEmail: c.contactEmail || "",
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    // Validaciones
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) {
      setError("El slug solo puede contener letras minúsculas, números y guiones (-)");
      return;
    }
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(form.primaryColor)) {
      setError("El color primario debe ser un código hex válido (ej: #6366f1)");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/v1/branding/me`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setCompany(data.company);
      setSuccess("✅ Branding actualizado exitosamente");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin")}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Perfil de Empresa
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {company?.tradeName} — Personaliza la identidad visual y datos de contacto
          </p>
        </div>
        <button onClick={loadBranding}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5 w-fit">
        {(["identidad", "contacto", "preview"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
            }`}>
            {tab === "identidad" ? "🎨 Identidad Visual" : tab === "contacto" ? "📞 Contacto" : "👁️ Vista Previa"}
          </button>
        ))}
      </div>

      <form onSubmit={saveBranding}>

        {/* ─── TAB: IDENTIDAD VISUAL ─────────────────────────────────────── */}
        {activeTab === "identidad" && (
          <div className="glass-card p-6 space-y-6">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-400" /> Identidad Visual
            </h2>

            {/* Slug */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                URL Amigable (slug) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm bg-slate-800 border border-slate-700 rounded-l-xl px-3 py-2.5 border-r-0">
                  transporte.pe/empresa/
                </span>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="transportes-flash"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-r-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">Solo letras minúsculas, números y guiones. Ej: transportes-flash</p>
            </div>

            {/* Logo — ImageUploader */}
            <ImageUploader
              label="Logo de la Empresa"
              value={form.logoUrl}
              onChange={url => setForm(f => ({ ...f, logoUrl: url }))}
              maxWidth={400}
              maxHeight={400}
              quality={0.88}
              fit="contain"
              hint="Recomendado: fondo transparente. Se procesará a 400×400px WebP."
            />

            {/* Colores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Color Primario</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    className="w-12 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-1"
                  />
                  <input
                    value={form.primaryColor}
                    onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    placeholder="#6366f1"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">Botones, acentos, elementos principales</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Color Secundario</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
                    className="w-12 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-1"
                  />
                  <input
                    value={form.secondaryColor}
                    onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
                    placeholder="#8b5cf6"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">Gradientes, hover states, elementos secundarios</p>
              </div>
            </div>

            {/* Banner — ImageUploader */}
            <ImageUploader
              label="Banner / Cabecera de la Empresa"
              value={form.bannerUrl}
              onChange={url => setForm(f => ({ ...f, bannerUrl: url }))}
              maxWidth={1200}
              maxHeight={300}
              quality={0.80}
              fit="cover"
              hint="Recomendado: 1200×300px. Se recortará automáticamente al centro. Máx ~150KB."
            />

            {/* Descripción */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Descripción de la Empresa</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Empresa de transporte interprovincial con más de 10 años de experiencia..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none resize-none"
              />
              <p className="text-xs text-slate-600 mt-1">{form.description.length}/300 caracteres</p>
            </div>
          </div>
        )}

        {/* ─── TAB: CONTACTO ─────────────────────────────────────────────── */}
        {activeTab === "contacto" && (
          <div className="glass-card p-6 space-y-6">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-400" /> Datos de Contacto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  <Phone className="w-3 h-3 inline mr-1" /> Teléfono Principal
                </label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+51 1 234-5678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  <Mail className="w-3 h-3 inline mr-1" /> Email de Contacto
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="contacto@transportesflash.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  <MapPin className="w-3 h-3 inline mr-1" /> Ciudad Principal
                </label>
                <input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Lima"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  <Globe className="w-3 h-3 inline mr-1" /> Sitio Web
                </label>
                <input
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://transportesflash.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                <MapPin className="w-3 h-3 inline mr-1" /> Dirección Física
              </label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Av. Javier Prado Este 1234, San Isidro, Lima"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Info de la empresa (solo lectura) */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Datos Registrales (solo lectura)</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Razón Social</p>
                  <p className="text-white font-medium">{company?.legalName}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">RUC</p>
                  <p className="text-white font-medium">{company?.ruc}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PREVIEW ──────────────────────────────────────────────── */}
        {activeTab === "preview" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Vista previa de cómo verán los pasajeros tu empresa en la plataforma:</p>

            {/* Tarjeta pública de empresa */}
            <div className="rounded-2xl overflow-hidden border border-white/10">
              {/* Banner */}
              <div className="h-32 relative"
                style={{ background: form.bannerUrl ? `url(${form.bannerUrl}) center/cover` : `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}>
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-4 left-4 flex items-center gap-3">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: form.primaryColor }}>
                      {company?.tradeName?.[0] || "T"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-lg">{company?.tradeName}</h3>
                    {form.city && <p className="text-white/70 text-xs">{form.city}</p>}
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="bg-slate-900 p-5 space-y-3">
                {form.description && <p className="text-slate-300 text-sm">{form.description}</p>}
                <div className="flex flex-wrap gap-4 text-sm">
                  {form.phone && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-4 h-4" style={{ color: form.primaryColor }} /> {form.phone}
                    </span>
                  )}
                  {form.contactEmail && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Mail className="w-4 h-4" style={{ color: form.primaryColor }} /> {form.contactEmail}
                    </span>
                  )}
                  {form.website && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Globe className="w-4 h-4" style={{ color: form.primaryColor }} /> {form.website}
                    </span>
                  )}
                </div>
                {form.slug && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-slate-600">URL pública: <span className="text-indigo-400">transporte.pe/empresa/{form.slug}</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botón guardar */}
        {activeTab !== "preview" && (
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="gradient-btn flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white disabled:opacity-50">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-5 h-5" /> Guardar Cambios</>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
