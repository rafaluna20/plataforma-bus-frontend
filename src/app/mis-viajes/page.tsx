"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMyBookings, useCancelMyBooking } from "@/lib/queries/bookings";
import {
  Map, Users, History, Wallet, User as UserIcon, Bus, FileText,
  AlertCircle, Loader2, MapPin, ArrowRight, Clock, ChevronLeft, ChevronRight, X, Banknote, CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const paymentStatusLabel: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_CASH:    { label: "Pago al abordar", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  PENDING_DIGITAL: { label: "Pago pendiente",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  PAID_DIGITAL:    { label: "Pagado digital",  color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  PAID:            { label: "Pagado",          color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  CANCELLED:       { label: "Cancelada",       color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  FAILED:          { label: "Fallida",         color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  REFUNDED:        { label: "Reembolsada",     color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const CANCELLABLE_STATUSES = ["PENDING_CASH", "PENDING_DIGITAL", "PAID_DIGITAL", "PAID"];

// ─── Tarjeta de una reserva ────────────────────────────────────────────────────
function BookingCard({ booking, onCancelled }: { booking: any; onCancelled: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const cancelMutation = useCancelMyBooking();

  const trip = booking.trip;
  const company = trip?.route?.company;
  const departure = trip ? new Date(trip.departureTime) : null;
  const isPast = departure ? departure.getTime() < Date.now() : false;
  const st = paymentStatusLabel[booking.paymentStatus] || { label: booking.paymentStatus, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  const canCancel = CANCELLABLE_STATUSES.includes(booking.paymentStatus) && !isPast;

  async function handleCancel() {
    setError("");
    try {
      await cancelMutation.mutateAsync(booking.id);
      setConfirming(false);
      onCancelled();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="min-w-0">
          <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2" style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
          <h3 className="text-lg font-bold text-white flex items-center gap-1.5 flex-wrap">
            <span>{booking.startWaypoint?.station?.name || "—"}</span>
            <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <span>{booking.endWaypoint?.station?.name || "—"}</span>
          </h3>
          {company?.tradeName && (
            <p className="text-sm text-slate-500 mt-0.5">{company.tradeName}</p>
          )}
        </div>
        <div className="p-3 bg-slate-800 rounded-xl flex-shrink-0">
          <Bus className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4 flex-shrink-0" />
          {departure ? departure.toLocaleString("es-PE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-slate-500">Asiento</span>
          <span className="text-white font-bold">{booking.seatId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Total pagado</span>
          <span className="text-white font-bold">S/ {Number(booking.totalPrice).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Método</span>
          <span className="text-slate-300 flex items-center gap-1.5">
            {booking.paymentMethod === "CASH" ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
            {booking.paymentMethod === "CASH" ? "Efectivo" : booking.paymentMethod || "—"}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-400 p-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {canCancel && (
        confirming ? (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <p className="text-xs text-red-300">¿Confirmas cancelar esta reserva?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors">
                No, volver
              </button>
              <button onClick={handleCancel} disabled={cancelMutation.isPending}
                className="flex-1 py-2 rounded-lg font-bold text-white text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sí, cancelar"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="w-full mt-4 pt-4 border-t border-slate-800 text-xs font-medium text-red-400 hover:text-red-300 flex items-center justify-center gap-1.5 transition-colors">
            <X className="w-3.5 h-3.5" /> Cancelar reserva
          </button>
        )
      )}
    </div>
  );
}

export default function MisViajesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("mis_viajes");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useMyBookings(page, 10, !!user && activeTab === "mis_viajes");

  // Si no hay usuario, mandarlo al login o mostrar un mensaje
  if (typeof window !== "undefined" && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión</h2>
        <p className="text-slate-400 mb-8">Debes iniciar sesión para acceder a tu billetera y panel de control.</p>
        <button 
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
        >
          Ir al Login
        </button>
      </div>
    );
  }

  const navItems = [
    { id: "mis_viajes", label: "Mis Viajes", icon: Map },
    { id: "pasajeros", label: "Mis Pasajeros", icon: Users },
    { id: "historial", label: "Historial", icon: History },
    { id: "depositos", label: "Depósitos", icon: Wallet },
    { id: "perfil", label: "Mi Perfil", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {user?.name?.[0] || "U"}
            </div>
            <h2 className="text-xl font-bold text-white">{user?.name || "Usuario"}</h2>
            <p className="text-sm text-blue-400 font-medium">{user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'DRIVER' ? 'Conductor' : 'Pasajero'}</p>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Saldo Disponible</div>
              <div className="text-2xl font-black text-white">S/ {user?.balance?.toFixed(2) || "0.00"}</div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === "mis_viajes" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold text-white mb-2">Mis Viajes</h1>
              <p className="text-slate-400 mb-8">Tus reservas de pasajes, pasadas y por venir.</p>

              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              )}

              {!isLoading && error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {(error as Error).message}
                </div>
              )}

              {!isLoading && !error && (!data?.data || data.data.length === 0) && (
                <div className="text-center py-20">
                  <Map className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Aún no tienes reservas</h2>
                  <p className="text-slate-500 mb-6">Busca un viaje y reserva tu primer pasaje.</p>
                  <Link href="/buscar" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
                    <MapPin className="w-4 h-4" /> Buscar viajes
                  </Link>
                </div>
              )}

              {!isLoading && !error && data?.data && data.data.length > 0 && (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {data.data.map((booking: any) => (
                      <BookingCard key={booking.id} booking={booking} onCancelled={refetch} />
                    ))}
                  </div>

                  {data.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                        className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-slate-400">Página {data.page} de {data.totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                        className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}



          {activeTab === "pasajeros" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold text-white mb-2">Lista de Pasajeros</h1>
              <p className="text-slate-400 mb-8">Gestión de usuarios que han reservado en tus viajes.</p>
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Pasajero</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Viaje</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Asientos</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">JP</div>
                          <span className="text-white font-medium">Juan Perez</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">Lima → Trujillo</td>
                      <td className="p-4 text-slate-300">2</td>
                      <td className="p-4"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-md">Confirmado</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === "historial" || activeTab === "depositos" || activeTab === "perfil") && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
              <FileText className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sección en Construcción</h2>
              <p className="text-slate-500">Estamos trabajando para habilitar esta funcionalidad muy pronto.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
