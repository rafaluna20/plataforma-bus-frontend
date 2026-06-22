"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Play, Square, Users, MapPin, Activity, Navigation } from "lucide-react";

export default function DriverPanel() {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number, lng: number, speed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manifest, setManifest] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const TRIP_ID = "11111111-1111-1111-1111-111111111111";

  // Fetch Manifest
  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/v1/trips/${TRIP_ID}/manifest`);
        if (res.ok) {
          const data = await res.json();
          setManifest(data.passengers);
        }
      } catch (err) {
        console.error("Error fetching manifest", err);
      }
    };
    fetchManifest();
  }, []);

  // Connect Socket
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    socketRef.current = io(apiUrl);
    
    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => setIsConnected(false));

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const startTrip = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Tu dispositivo no soporta GPS.");
      return;
    }

    setErrorMsg('');
    setIsTransmitting(true);

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        
        // Convertir m/s a km/h
        const speedKmH = speed ? Math.round(speed * 3.6) : 0;

        setGpsData({ lat: latitude, lng: longitude, speed: speedKmH });

        // Emitir a Socket (La frecuencia la regula el navegador, pero podemos controlarlo si emite muy seguido)
        // Para este MVP el navegador envía cuando hay cambios significativos
        if (socketRef.current?.connected) {
          socketRef.current.emit("driver_update_location", {
            tripId: TRIP_ID,
            lat: latitude,
            lng: longitude,
            speed: speedKmH,
            bearing: heading || 0
          });
        }
      },
      (error) => {
        setErrorMsg("Error GPS: " + error.message + ". Asegúrate de dar permisos de ubicación.");
        setIsTransmitting(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Emit frequency concept (every 10s max age)
        timeout: 10000
      }
    );
  };

  const stopTrip = () => {
    setIsTransmitting(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#0f172a] text-white flex flex-col">
      {/* App Bar */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold">Modo Conductor</h1>
          <p className="text-xs text-slate-400">Viaje #{TRIP_ID.substring(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium">{isConnected ? 'En Línea' : 'Desconectado'}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="p-6 flex-1 flex flex-col gap-6">
        
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
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
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
            <span className="text-slate-400 text-sm flex items-center gap-2 mb-2"><Activity className="w-4 h-4"/> Velocidad</span>
            <span className="text-3xl font-bold">{gpsData?.speed || 0} <span className="text-sm font-normal text-slate-500">km/h</span></span>
          </div>
          <div className="glass-card p-4 flex flex-col">
            <span className="text-slate-400 text-sm flex items-center gap-2 mb-2"><Users className="w-4 h-4"/> Pasajeros</span>
            <span className="text-3xl font-bold">{manifest.length}</span>
          </div>
        </div>

        {/* Passenger Manifest */}
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

      </div>
    </div>
  );
}
