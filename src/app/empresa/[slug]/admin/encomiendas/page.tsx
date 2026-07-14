"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Package, Plus, AlertCircle, CheckCircle2, RefreshCw,
  X, MapPin, User, Weight, Loader2, Send, ArrowRight
} from "lucide-react";
import { getCompanyBySlug, getCompanyById } from "@/lib/api/branding";
import { getPendingParcels, reassignParcel } from "@/lib/api/parcels";
import { getRoutesByCompany } from "@/lib/api/routes";
import { getTripsByCompany } from "@/lib/api/trips";
import PoolParcelModal from "@/components/trips/PoolParcelModal";

type Parcel = {
  id: string;
  senderName: string;
  receiverName: string;
  description: string | null;
  weightKg: number | null;
  totalPrice: number;
  status: string;
  createdAt: string;
  startWaypoint: { id: string; route?: { id: string }; station: { name: string; city: string } };
  endWaypoint: { id: string; station: { name: string; city: string } };
};

type Route = { id: string; name: string; waypoints: any[] };

type Trip = {
  id: string;
  departureTime: string;
  status: string;
  route: { id: string; name: string };
  vehicle: { plateNumber: string };
};

const ASSIGNABLE_STATUSES = ["SCHEDULED", "BOARDING"];

export default function AdminEncomiendasPage() {
  const { slug } = useParams();
  const slugStr = Array.isArray(slug) ? slug[0] : slug;

  const [companyId, setCompanyId] = useState("");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [assigningParcel, setAssigningParcel] = useState<Parcel | null>(null);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { loadData(); }, [slugStr]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      let compData: any;
      try {
        compData = await getCompanyBySlug<any>(slugStr as string);
      } catch {
        compData = await getCompanyById<any>(slugStr as string);
      }
      const cid = compData.company?.id;
      setCompanyId(cid);

      const [parcelsData, routesData, tripsData] = await Promise.all([
        getPendingParcels<any>(cid),
        getRoutesByCompany<any>(cid),
        getTripsByCompany<any>(cid),
      ]);
      setParcels(parcelsData.parcels || []);
      setRoutes(routesData.routes || []);
      setTrips(tripsData.trips || []);
    } catch (e: any) {
      setError(e.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  function openAssign(parcel: Parcel) {
    setAssigningParcel(parcel);
    setSelectedTripId("");
  }

  async function confirmAssign() {
    if (!assigningParcel || !selectedTripId) return;
    setAssigning(true);
    try {
      await reassignParcel(assigningParcel.id, selectedTripId);
      setSuccess(`✅ Encomienda de ${assigningParcel.senderName} asignada al viaje.`);
      setAssigningParcel(null);
      loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  }

  // Viajes que cubren la misma ruta que la encomienda a asignar, y que todavía pueden recibir carga
  const eligibleTrips = assigningParcel
    ? trips.filter(t =>
        ASSIGNABLE_STATUSES.includes(t.status) &&
        t.route?.id === assigningParcel.startWaypoint.route?.id
      )
    : [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            Bandeja de Encomiendas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? "Cargando..." : `${parcels.length} encomienda${parcels.length !== 1 ? "s" : ""} pendiente${parcels.length !== 1 ? "s" : ""} de asignar`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Plus className="w-4 h-4" /> Encomienda sin Viaje
          </button>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
        Esta bandeja reúne encomiendas registradas sin una unidad específica (por ejemplo, porque el bus asignado no tenía espacio). Asígnalas a cualquier viaje que cubra su misma ruta cuando esté por salir.
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

      {/* Modal: registrar encomienda sin viaje */}
      {showCreate && (
        <PoolParcelModal
          companyId={companyId}
          routes={routes}
          primaryColor="#f59e0b"
          secondaryColor="#d97706"
          onClose={() => setShowCreate(false)}
          onSuccess={loadData}
        />
      )}

      {/* Modal: asignar a viaje */}
      {assigningParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" /> Asignar a Viaje
              </h3>
              <button onClick={() => setAssigningParcel(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm">
              {assigningParcel.senderName} → {assigningParcel.receiverName} ({assigningParcel.startWaypoint.station.name} → {assigningParcel.endWaypoint.station.name})
            </p>

            {eligibleTrips.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
                No hay viajes programados o abordando que cubran esta misma ruta ahora mismo.
              </div>
            ) : (
              <select value={selectedTripId} onChange={e => setSelectedTripId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none">
                <option value="">Selecciona un viaje...</option>
                {eligibleTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    {new Date(t.departureTime).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} — {t.vehicle.plateNumber}
                  </option>
                ))}
              </select>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setAssigningParcel(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={confirmAssign} disabled={assigning || !selectedTripId}
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : parcels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-white/5">
          <Package className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No hay encomiendas pendientes de asignar</p>
          <p className="text-slate-600 text-sm mt-1">Las encomiendas que no quepan en su unidad, o que registres sin viaje, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parcels.map(parcel => (
            <div key={parcel.id} className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-white font-semibold">{parcel.senderName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-white font-semibold">{parcel.receiverName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2 px-3 bg-slate-800/60 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-white font-medium">{parcel.startWaypoint.station.name}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="text-white font-medium">{parcel.endWaypoint.station.name}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {parcel.weightKg && (
                    <span className="flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> {parcel.weightKg} kg</span>
                  )}
                  <span className="font-bold text-amber-400">S/ {Number(parcel.totalPrice).toFixed(2)}</span>
                  {parcel.description && <span className="truncate">{parcel.description}</span>}
                </div>
              </div>
              <div className="px-3 py-2 border-t border-white/5 bg-slate-900/40">
                <button onClick={() => openAssign(parcel)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all">
                  <Send className="w-3.5 h-3.5" /> Asignar a Viaje
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
