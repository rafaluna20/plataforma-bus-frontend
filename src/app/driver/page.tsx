"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { Play, Square, Users, MapPin, Activity, Navigation, Bus, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { getAccessToken, getCurrentUser, type AuthUser } from "@/lib/auth";
import { getMyDriverTrips, getTripManifest, updateTripStatus } from "@/lib/api/trips";

type AssignedTrip = {
  id: string;
  departureTime: string;
  status: string;
  route: { name: string; waypoints: { stopOrder: number; station: { name: string } }[] };
  vehicle: { plateNumber: string; vehicleType: string };
};

type Passenger = { name: string; seatId: string; origin: string; destination: string; paymentStatus: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const STATUS_FLOW: Record<string, { next: string; btnLabel: string; btnColor: string }> = {
  SCHEDULED:  { next: "BOARDING",   btnLabel: "Autorizar Abordaje", btnColor: "bg-yellow-500 hover:bg-yellow-600" },
  BOARDING:   { next: "IN_TRANSIT", btnLabel: "Iniciar Viaje",       btnColor: "bg-indigo-500 hover:bg-indigo-600" },
  IN_TRANSIT: { next: "COMPLETED",  btnLabel: "Confirmar Llegada",   btnColor: "bg-emerald-500 hover:bg-emerald-600" },
};

export default function DriverPanel() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [trips, setTrips] = useState<AssignedTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [isTransmitting, setIsTransmitting] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; speed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manifest, setManifest] = useState<Passenger[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // ── Autenticación ────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setAuthChecked(true);
  }, []);

  // ── Cargar mis viajes asignados ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoadingTrips(true);
      setTripsError("");
      try {
        const data = await getMyDriverTrips<any>();
        setTrips(data.trips || []);
        if ((data.trips || []).length === 1) setSelectedTripId(data.trips[0].id);
      } catch (e: any) {
        setTripsError(e.message || "Error al cargar tus viajes");
      } finally {
        setLoadingTrips(false);
      }
    })();
  }, [currentUser]);

  // ── Manifiesto del viaje seleccionado ────────────────────────────────────────
  useEffect(() => {
    if (!selectedTripId) { setManifest([]); return; }
    (async () => {
      try {
        const data = await getTripManifest<any>(selectedTripId);
        setManifest(data.passengers || []);
      } catch { /* silent */ }
    })();
  }, [selectedTripId]);

  // ── Socket ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(API_URL, { auth: { token: getAccessToken() } });
    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => setIsConnected(false));
    socketRef.current.on("error", (err: { message: string }) => {
      setErrorMsg(err?.message || "Error del servidor de ubicación");
      stopTrip();
    });
    return () => { socketRef.current?.disconnect(); };
  }, [currentUser]);

  const startTrip = () => {
    if (!selectedTripId) {
      setErrorMsg("Selecciona un viaje antes de iniciar.");
      return;
    }
    if (!navigator.geolocation) {
      setErrorMsg("Tu dispositivo no soporta GPS.");
      return;
    }

    setErrorMsg('');
    setIsTransmitting(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        const speedKmH = speed ? Math.round(speed * 3.6) : 0;
        setGpsData({ lat: latitude, lng: longitude, speed: speedKmH });

        const token = getAccessToken();
        if (socketRef.current?.connected && token) {
          socketRef.current.emit("driver_update_location", {
            tripId: selectedTripId,
            lat: latitude,
            lng: longitude,
            speed: speedKmH,
            bearing: heading || 0,
            token,
          });
        }
      },
      (error) => {
        setErrorMsg("Error GPS: " + error.message + ". Asegúrate de dar permisos de ubicación.");
        setIsTransmitting(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  };

  const stopTrip = () => {
    setIsTransmitting(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // ── Autorizar abordaje / iniciar viaje / confirmar llegada ──────────────────
  const advanceStatus = async () => {
    const trip = trips.find(t => t.id === selectedTripId);
    if (!trip) return;
    const flow = STATUS_FLOW[trip.status];
    if (!flow) return;
    setUpdatingStatus(true);
    setStatusError("");
    try {
      await updateTripStatus(trip.id, flow.next);
      setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status: flow.next } : t));
    } catch (e: any) {
      setStatusError(e.message || "Error al actualizar el estado del viaje");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Estados de carga / auth ──────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Navigation className="w-12 h-12 text-slate-600" />
        <h1 className="text-xl font-bold">Modo Conductor</h1>
        <p className="text-slate-400 text-sm">Debes iniciar sesión con tu cuenta de conductor.</p>
        <button onClick={() => router.push("/login")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold">
          Ir al Login
        </button>
      </div>
    );
  }

  if (currentUser.role !== "DRIVER" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Navigation className="w-12 h-12 text-slate-600" />
        <h1 className="text-xl font-bold">Modo Conductor</h1>
        <p className="text-slate-400 text-sm">Esta pantalla es solo para conductores.</p>
      </div>
    );
  }

  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#0f172a] text-white flex flex-col">
      {/* App Bar */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold">Modo Conductor</h1>
          <p className="text-xs text-slate-400">{currentUser.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium">{isConnected ? 'En Línea' : 'Desconectado'}</span>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6">

        {/* Selector de viaje asignado */}
        {loadingTrips ? (
          <div className="glass-card p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : tripsError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {tripsError}
          </div>
        ) : trips.length === 0 ? (
          <div className="glass-card p-6 flex flex-col items-center text-center gap-2">
            <Bus className="w-8 h-8 text-slate-600" />
            <p className="text-slate-300 font-semibold">No tienes viajes asignados</p>
            <p className="text-slate-500 text-xs">Cuando la empresa te asigne un viaje programado, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Tu viaje</p>
            {trips.map(trip => {
              const wps = trip.route.waypoints?.slice().sort((a, b) => a.stopOrder - b.stopOrder) || [];
              const orig = wps[0]?.station?.name || "—";
              const dest = wps[wps.length - 1]?.station?.name || "—";
              const isSelected = selectedTripId === trip.id;
              return (
                <button
                  key={trip.id}
                  onClick={() => !isTransmitting && setSelectedTripId(trip.id)}
                  disabled={isTransmitting}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 bg-slate-900/50"
                  } ${isTransmitting && !isSelected ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <span>{orig}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{dest}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {trip.vehicle.plateNumber} · {new Date(trip.departureTime).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Autorizar abordaje / iniciar viaje / confirmar llegada */}
        {selectedTrip && STATUS_FLOW[selectedTrip.status] && (
          <div className="space-y-2">
            {statusError && (
              <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg">{statusError}</p>
            )}
            <button
              onClick={advanceStatus}
              disabled={updatingStatus}
              className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${STATUS_FLOW[selectedTrip.status].btnColor}`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {updatingStatus ? "Actualizando..." : STATUS_FLOW[selectedTrip.status].btnLabel}
            </button>
          </div>
        )}

        {/* GPS Status Card */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isTransmitting ? 'bg-indigo-500 pulse-glow' : 'bg-slate-800'}`}>
            <Navigation className={`w-10 h-10 ${isTransmitting ? 'text-white' : 'text-slate-500'}`} />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-1">
              {isTransmitting ? 'Transmitiendo GPS' : 'GPS Apagado'}
            </h2>
            {isTransmitting && gpsData && (
              <p className="text-emerald-400 font-mono text-sm">
                Lat: {gpsData.lat.toFixed(5)} | Lng: {gpsData.lng.toFixed(5)}
              </p>
            )}
          </div>

          {errorMsg && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{errorMsg}</p>}

          {!isTransmitting ? (
            <button
              onClick={startTrip}
              disabled={!selectedTripId}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
            >
              <Play className="w-5 h-5 fill-current" /> INICIAR VIAJE
            </button>
          ) : (
            <button
              onClick={stopTrip}
              className="w-full py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/25"
            >
              <Square className="w-5 h-5 fill-current" /> DETENER VIAJE
            </button>
          )}
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 flex flex-col">
            <span className="text-slate-400 text-sm flex items-center gap-2 mb-2"><Activity className="w-4 h-4" /> Velocidad</span>
            <span className="text-3xl font-bold">{gpsData?.speed || 0} <span className="text-sm font-normal text-slate-500">km/h</span></span>
          </div>
          <div className="glass-card p-4 flex flex-col">
            <span className="text-slate-400 text-sm flex items-center gap-2 mb-2"><Users className="w-4 h-4" /> Pasajeros</span>
            <span className="text-3xl font-bold">{manifest.length}</span>
          </div>
        </div>

        {/* Passenger Manifest */}
        {selectedTrip && (
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> Manifiesto de Ruta</h3>
            <div className="space-y-3">
              {manifest.map((p, idx) => (
                <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-lg">{p.name}</span>
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-xs font-bold border border-indigo-500/50">
                      Asiento {p.seatId}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> Sube: {p.origin}
                    </div>
                    <div className="flex items-center gap-2 border-l-2 border-slate-700 ml-[3px] pl-[13px] py-1">
                      Baja: {p.destination}
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 self-start px-2 py-1 rounded">
                    {p.paymentStatus}
                  </div>
                </div>
              ))}

              {manifest.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  Aún no hay pasajeros confirmados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
