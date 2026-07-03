"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bus, Ticket, BarChart3, Settings, LogOut,
  Menu, X, ChevronRight, Home,
  Map, Building2, Truck, Users
} from "lucide-react";
import { getCurrentUser, logout, authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type CompanyPublic = {
  id: string;
  tradeName: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

export default function EmpresaAdminLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, [slugStr]);

  async function checkAuthAndLoad() {
    setLoading(true);
    try {
      // 1. Verificar que el usuario está autenticado y es ADMIN
      const user = getCurrentUser();
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        router.push(`/login?redirect=/empresa/${slugStr}/admin`);
        return;
      }

      // 2. Obtener datos de la empresa directamente desde el servidor con el token del admin.
      //    /branding/me ya valida que el usuario está autenticado y devuelve SU empresa.
      //    Esta es la fuente de verdad — no necesitamos validar nada más en el cliente.
      const meRes = await authFetch(`${API}/api/v1/branding/me`);
      if (!meRes.ok) {
        // Token inválido o usuario sin empresa
        router.push("/login?redirect=/admin");
        return;
      }
      const meData = await meRes.json();
      const companyData = meData.company;

      if (!companyData) {
        router.push("/login?redirect=/admin");
        return;
      }

      // 3. Si la URL no coincide con el slug canónico de la empresa del admin, redirigir a la
      //    URL correcta (cubre bookmarks viejos con RUC/UUID). No aplica a SUPER_ADMIN, que
      //    puede navegar al panel de cualquier empresa por su slug.
      //    Se compara directamente contra companyData.slug en vez de adivinar con un regex si
      //    la URL "parece" un slug amigable: un slug real puede ser puramente numérico (p.ej.
      //    "43160220", generado desde el RUC) y el regex anterior lo rechazaba, provocando un
      //    redirect a la MISMA url una y otra vez que nunca llegaba a marcar authorized=true
      //    → pantalla en negro permanente al entrar al panel admin de esas empresas.
      if (user.role !== "SUPER_ADMIN" && companyData.slug && companyData.slug !== slugStr) {
        router.replace(`/empresa/${companyData.slug}/admin`);
        return;
      }

      setCompany(companyData);
      setAuthorized(true);
    } catch {
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push(`/empresa/${slugStr}`);
  }

  const primaryColor = company?.primaryColor || "#6366f1";
  const secondaryColor = company?.secondaryColor || "#8b5cf6";

  const navItems = [
    {
      href: `/empresa/${slugStr}/admin`,
      label: "Dashboard",
      icon: <BarChart3 className="w-5 h-5" />,
      exact: true,
    },
    {
      href: `/empresa/${slugStr}/admin/venta`,
      label: "Venta de Pasajes",
      icon: <Ticket className="w-5 h-5" />,
      exact: false,
    },
    {
      href: `/empresa/${slugStr}/admin/viajes`,
      label: "Mis Viajes",
      icon: <Bus className="w-5 h-5" />,
      exact: false,
    },
    {
      href: `/empresa/${slugStr}/admin/rutas`,
      label: "Gestión de Rutas",
      icon: <Map className="w-5 h-5" />,
      exact: false,
    },
    {
      href: `/empresa/${slugStr}/admin/vehiculos`,
      label: "Flota de Vehículos",
      icon: <Bus className="w-5 h-5" />,
      exact: false,
    },
    {
      href: `/empresa/${slugStr}/admin/conductores`,
      label: "Conductores",
      icon: <Truck className="w-5 h-5" />,
      exact: false,
    },
    {
      href: `/empresa/${slugStr}/admin/vendedores`,
      label: "Vendedores",
      icon: <Users className="w-5 h-5" />,
      exact: false,
    },
    {
      href: `/empresa/${slugStr}/admin/perfil`,
      label: "Perfil de Empresa",
      icon: <Building2 className="w-5 h-5" />,
      exact: false,
    },
  ];

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${primaryColor} transparent transparent transparent` }} />
          <p className="text-slate-400 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!authorized || !company) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Fondo animado */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 65%)`, animationDuration: "5s" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{ background: `radial-gradient(circle, ${secondaryColor}10 0%, transparent 65%)`, animationDuration: "7s" }} />
      </div>

      {/* ─── TOPBAR ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-white/5 bg-slate-900/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">

          {/* Hamburger mobile */}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo + nombre empresa */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden border border-white/10 flex items-center justify-center font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
              {company.logoUrl
                ? <img src={company.logoUrl} alt={company.tradeName} className="w-full h-full object-contain p-1" />
                : company.tradeName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/empresa/${slugStr}`}
                  className="font-bold text-white text-sm hover:opacity-80 transition-opacity truncate">
                  {company.tradeName}
                </Link>
                <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${primaryColor}20`, color: primaryColor }}>
                  Panel Admin
                </span>
              </div>
            </div>
          </div>

          {/* Acciones header */}
          <div className="flex items-center gap-2">
            <Link href={`/empresa/${slugStr}`}
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg">
              <Home className="w-3.5 h-3.5" /> Ver página pública
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors border border-white/10 px-3 py-1.5 rounded-lg">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* ─── LAYOUT: SIDEBAR + CONTENIDO ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 gap-6">

        {/* ─── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className={`
          fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] lg:h-auto
          w-64 flex-shrink-0 z-30 lg:z-auto
          transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:flex flex-col gap-4
        `}>
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/60 lg:hidden z-[-1]" onClick={() => setSidebarOpen(false)} />
          )}

          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden h-full lg:h-auto">

            {/* Banner */}
            <div className="h-20 relative"
              style={{
                background: company.bannerUrl
                  ? `url(${company.bannerUrl}) center/cover`
                  : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-3 left-4">
                <p className="text-white font-bold text-sm">{company.tradeName}</p>
                <p className="text-white/60 text-xs">Panel de Administración</p>
              </div>
            </div>

            {/* Navegación */}
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 py-2">Operaciones</p>
              {navItems.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                    style={active ? {
                      background: `linear-gradient(135deg, ${primaryColor}25, ${secondaryColor}15)`,
                      borderLeft: `3px solid ${primaryColor}`,
                    } : {}}>
                    <span style={{ color: active ? primaryColor : undefined }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Separador */}
            <div className="mx-4 border-t border-white/5" />

            {/* Accesos rápidos */}
            <div className="p-3 space-y-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3 py-2">Accesos</p>
              <Link href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <Settings className="w-5 h-5" /> Panel Global
              </Link>
              <Link href={`/empresa/${slugStr}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <Home className="w-5 h-5" /> Página Pública
              </Link>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
              <p className="text-xs text-slate-600 text-center">
                Powered by{" "}
                <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Transporte PRO
                </Link>
              </p>
            </div>
          </div>
        </aside>

        {/* ─── CONTENIDO PRINCIPAL ─────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
