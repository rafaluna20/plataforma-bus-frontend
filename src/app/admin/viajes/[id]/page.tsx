"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Bus, Clock, CheckCircle2, Play, MapPin, AlertCircle, Navigation } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const STATUS_FLOW: Record<string, { next: string; label: string; btnLabel: string; btnColor: string }> = {
  SCHEDULED: { next: "BOARDING", label: "Programado", btnLabel: "Iniciar Abordaje", btnColor: "bg-yellow-500 hover:bg-yellow-600" },
  BOARDING: { next: "IN_TRANSIT", label: "Abordando", btnLabel: "Iniciar Viaje", btnColor: "bg-indigo-500 hover:bg-indigo-600" },
  IN_TRANSIT: { next: "COMPLETED", label: "En Tránsito", btnLabel: "Marcar Completado", btnColor: "bg-emerald-500 hover:bg-emerald-600" },
  COMPLETED: { next: "", label: "Completado", btnLabel: "", btnColor: "" },
  CANCELLED: { next: "", label: "Cancelado", btnLabel: "", btnColor: "" },
};

export default function TripDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [manifest, setManifest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [id]);

  async function loadTrip() {
    setLoading(true);
    try {
      const [tripRes, manifestRes] = await Promise.all([
        authFetch(`${API}/api/v1/management/trips/${id}`),
        authFetch(`${API}/api/v1/management/trips/${id}/manifest`),
      ]);
      const tripData = await tripRes.json();
      const manifestData = await manifestRes.json();
      setTrip(tripData);
      setManifest(manifestData.passengers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function advanceStatus() {
    if (!trip) return;
    const flow = STATUS_FLOW[trip.status];
    if (!flow?.next) return;
    setUpdating(true);
    try {
      const res = await authFetch(`${API}/api/v1/management/trips/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: flow.next }),
      });
      if (res.ok) loadTrip();
    } finally { setUpdating(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!trip) return (
    <div className="text-center py-16">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <p className="text-white font-semibold">Viaje no encontrado</p>
      <button onClick={() => router.push("/admin")} className="mt-4 text-indigo-400 hover:text-indigo-300">← Volver</button>
    </div>
  );

  const flow = STATUS_FLOW[trip.status];
  const waypoints = trip.route?.waypoints?.sort((a: any, b: any) => a.stopOrder - b.stopOrder) || [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin")} className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{trip.route?.name || "Detalle de Viaje"}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date(trip.departureTime).toLocaleString("es-PE", { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>
        {flow?.btnLabel && (
          <button onClick={advanceStatus} disabled={updating}
            className={`${flow.btnColor} px-5 py-2 rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-colors`}>
            <Play className="w-4 h-4" />
            {updating ? "Actualizando..." : flow.btnLabel}
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Bus className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-slate-400 text-sm">Vehículo</p>
          </div>
          <p className="text-white font-bold text-lg">{trip.vehicle?.plateNumber}</p>
          <p className="text-slate-500 text-sm">{trip.vehicle?.vehicleType} · {trip.vehicle?.capacity} asientos</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-sm">Pasajeros</p>
          </div>
          <p className="text-white font-bold text-lg">{manifest.length} / {trip.vehicle?.capacity}</p>
          <p className="text-slate-500 text-sm">{trip.vehicle?.capacity - manifest.length} asientos libres</p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Clock className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-slate-400 text-sm">Estado Actual</p>
          </div>
          <p className="text-white font-bold text-lg">{flow?.label || trip.status}</p>
          {flow?.next && <p className="text-slate-500 text-sm">Siguiente: {STATUS_FLOW[flow.next]?.label}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Route Waypoints */}
        <div className="glass-card p-6">
          <h2 className="font-bold text-white mb-5 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" /> Paradas de la Ruta
          </h2>
          <div className="relative">
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-white/10" />
            <div className="space-y-5">
              {waypoints.map((wp: any, i: number) => (
                <div key={wp.id} className="flex items-start gap-3 relative">
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 z-10 mt-0.5
                    ${i === 0 ? "bg-indigo-500 border-indigo-400" :
                      i === waypoints.length - 1 ? "bg-emerald-500 border-emerald-400" :
                      "bg-slate-800 border-slate-600"}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{wp.station?.name || "Parada"}</p>
                    <p className="text-xs text-slate-500">{wp.station?.city}</p>
                    {wp.basePrice > 0 && <p className="text-xs text-cyan-400 mt-0.5">+S/ {Number(wp.basePrice).toFixed(2)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Passenger Manifest */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Manifiesto de Pasajeros
            </h2>
            <button onClick={() => router.push(`/driver?trip=${id}`)} className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <Navigation className="w-4 h-4" /> Vista del Chofer
            </button>
          </div>

          {manifest.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No hay pasajeros registrados aún</p>
              <p className="text-slate-600 text-xs mt-1">Las reservas aparecerán aquí al completar el pago</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-medium">Asiento</th>
                    <th className="pb-3 font-medium">Pasajero</th>
                    <th className="pb-3 font-medium">Tramo</th>
                    <th className="pb-3 font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {manifest.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{p.seatId}</span>
                      </td>
                      <td className="py-3">
                        <p className="text-white font-medium">{p.name}</p>
                        <p className="text-slate-500 text-xs">{p.document}</p>
                      </td>
                      <td className="py-3">
                        <p className="text-slate-300 text-xs">{p.origin}</p>
                        <p className="text-slate-500 text-xs flex items-center gap-1"><ArrowLeft className="w-3 h-3 rotate-180" />{p.destination}</p>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.paymentStatus === "PAID_DIGITAL" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          p.paymentStatus === "PENDING_CASH" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}>
                          {p.paymentStatus === "PAID_DIGITAL" ? "Pagado" :
                           p.paymentStatus === "PENDING_CASH" ? "Efectivo" : p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
