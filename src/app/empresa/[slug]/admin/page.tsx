"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bus, Ticket, BarChart3, Clock, Users, ArrowRight,
  RefreshCw, TrendingUp, CheckCircle2, AlertCircle, Activity
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Trip = {
  id: string;
  departureTime: string;
  status: string;
  route: { name: string; waypoints: any[] };
  vehicle: { plateNumber: string; vehicleType: string; capacity: number };
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Programado", cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  BOARDING:  { label: "Abordando",  cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  IN_TRANSIT:{ label: "En Tránsito",cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  COMPLETED: { label: "Completado", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  CANCELLED: { label: "Cancelado",  cls: "text-red-400 bg-red-500/10 border-red-500/20" },
};

const vehicleTypeLabel: Record<string, string> = {
  MINIVAN: "Minivan", BUS_1P: "Bus 1 Piso", BUS_2P: "Bus 2 Pisos", AUTO: "Auto",
};

export default function EmpresaAdminDashboard() {
  const { slug } = useParams();
  const router = useRouter();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [company, setCompany] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");

  useEffect(() => {
    loadData();
  }, [slugStr]);

  async function loadData() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) return;

      // Cargar empresa
      const companyRes = await fetch(`${API}/api/v1/branding/slug/${slugStr}`);
      const companyData = await companyRes.json();
      if (!companyRes.ok) return;
      setCompany(companyData.company);
      setPrimaryColor(companyData.company.primaryColor || "#6366f1");
      setSecondaryColor(companyData.company.secondaryColor || "#8b5cf6");

      // Cargar viajes usando endpoint público (accesible para todos los roles)
      const companyId = companyData.company.id;
      const tripsRes = await fetch(`${API}/api/v1/trips/search?companyId=${companyId}&limit=100`);
      const tripsData = await tripsRes.json();
      setTrips(tripsData.trips || tripsData.data || []);
    } catch { }
    finally { setLoading(false); }
  }

  const today = new Date();
  const todayTrips = trips.filter(t => new Date(t.departureTime).toDateString() === today.toDateString());
  const activeTrips = trips.filter(t => t.status === "IN_TRANSIT" || t.status === "BOARDING");
  const scheduledTrips = trips.filter(t => t.status === "SCHEDULED");
  const completedTrips = trips.filter(t => t.status === "COMPLETED");

  const stats = [
    { label: "Viajes Hoy", value: todayTrips.length, icon: <Clock className="w-5 h-5" />, color: primaryColor },
    { label: "En Tránsito", value: activeTrips.length, icon: <Activity className="w-5 h-5" />, color: "#06b6d4" },
    { label: "Programados", value: scheduledTrips.length, icon: <Bus className="w-5 h-5" />, color: "#f59e0b" },
    { label: "Completados", value: completedTrips.length, icon: <CheckCircle2 className="w-5 h-5" />, color: "#10b981" },
  ];

  const quickActions = [
    {
      label: "Venta de Pasajes",
      desc: "Registrar venta en mostrador",
      icon: <Ticket className="w-6 h-6" />,
      href: `/empresa/${slugStr}/admin/venta`,
      highlight: true,
    },
    {
      label: "Ver Todos los Viajes",
      desc: "Gestionar viajes programados",
      icon: <Bus className="w-6 h-6" />,
      href: `/empresa/${slugStr}/admin/viajes`,
      highlight: false,
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard — {company?.tradeName || "Mi Empresa"}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {today.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={loadData}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl" style={{ background: `${stat.color}15` }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-1">
              {loading ? "..." : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02] ${
                action.highlight
                  ? "border-transparent"
                  : "border-white/8 bg-slate-900/60 hover:border-white/15"
              }`}
              style={action.highlight ? {
                background: `linear-gradient(135deg, ${primaryColor}25, ${secondaryColor}15)`,
                borderColor: `${primaryColor}40`,
              } : {}}>
              <div className="p-3 rounded-xl flex-shrink-0"
                style={{ background: action.highlight ? `${primaryColor}30` : "rgba(255,255,255,0.05)" }}>
                <span style={{ color: action.highlight ? primaryColor : "#94a3b8" }}>{action.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold ${action.highlight ? "" : "text-white"}`}
                  style={action.highlight ? { color: primaryColor } : {}}>
                  {action.label}
                </p>
                <p className="text-slate-500 text-sm">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Viajes de hoy */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Viajes de Hoy</h2>
          <Link href={`/empresa/${slugStr}/admin/viajes`}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: primaryColor }}>
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : todayTrips.length === 0 ? (
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-8 text-center">
            <Bus className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No hay viajes programados para hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTrips.slice(0, 5).map(trip => {
              const wps = trip.route?.waypoints || [];
              const orig = wps[0]?.station?.name || trip.route?.name?.split(' - ')[0] || "—";
              const dest = wps[wps.length - 1]?.station?.name || trip.route?.name?.split(' - ')[1] || "—";
              const dep = new Date(trip.departureTime);
              const st = statusConfig[trip.status] || statusConfig.SCHEDULED;

              return (
                <div key={trip.id}
                  className="flex items-center gap-4 p-4 bg-slate-900/60 border border-white/5 rounded-xl hover:border-white/10 transition-all">
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${primaryColor}15` }}>
                    <Bus className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <span className="truncate">{orig}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                      <span className="truncate">{dest}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {trip.vehicle ? `${vehicleTypeLabel[trip.vehicle.vehicleType] || trip.vehicle.vehicleType} · ${trip.vehicle.plateNumber}` : "Vehículo no asignado"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">
                      {dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <Link href={`/empresa/${slugStr}/admin/venta?tripId=${trip.id}`}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: `${primaryColor}20`, color: primaryColor }}>
                    Vender
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
