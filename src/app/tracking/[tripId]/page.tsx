"use client";

import { useEffect, useState, use } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { io, Socket } from "socket.io-client";
import { Bus, Navigation, Clock, Activity, DoorOpen, X } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function TrackingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.tripId;

  // Estado del Vehículo (Posición Inicial por defecto: Lima)
  const [vehicleLocation, setVehicleLocation] = useState({
    lat: -12.046374,
    lng: -77.042793,
    speed: 0,
    updatedAt: new Date().toISOString()
  });

  const [isConnected, setIsConnected] = useState(false);

  // Aviso de "el vehículo está abordando" — llega por socket en el momento en que el
  // vendedor/admin marca el viaje como BOARDING desde el terminal (ver TripManagementService).
  const [boardingAlert, setBoardingAlert] = useState<{ message: string; departureTime: string } | null>(null);

  useEffect(() => {
    // 1. Conectar al WebSocket
    const socket: Socket = io(SOCKET_URL);

    socket.on("connect", () => {
      setIsConnected(true);
      // 2. Unirse a la sala del viaje específico
      socket.emit("join_trip", tripId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // 3. Escuchar las actualizaciones de GPS en tiempo real
    socket.on("location_updated", (data: any) => {
      console.log("Nueva ubicación GPS:", data);
      setVehicleLocation({
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        updatedAt: data.timestamp
      });
    });

    // 4. Escuchar el aviso de abordaje (el bus está por salir)
    socket.on("boarding_started", (data: { message: string; departureTime: string }) => {
      setBoardingAlert(data);
    });

    return () => {
      socket.emit("leave_trip", tripId);
      socket.disconnect();
    };
  }, [tripId]);

  return (
    <div className="w-full h-[calc(100vh-8rem)] min-h-[600px] flex flex-col gap-4">

      {/* Aviso: el vehículo está abordando pasajeros */}
      {boardingAlert && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <DoorOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 font-bold text-sm">¡Tu bus está abordando!</p>
            <p className="text-amber-200/80 text-xs">{boardingAlert.message}</p>
          </div>
          <button
            onClick={() => setBoardingAlert(null)}
            className="p-1.5 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10 transition-colors flex-shrink-0"
            title="Cerrar aviso">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-full flex-1 flex flex-col md:flex-row gap-6 min-h-0">

      {/* Sidebar: Trip Info */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="glass-card p-6 flex-1 flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Rastreo GPS</h2>
            <p className="text-slate-400 text-sm">Viaje #{tripId.substring(0, 8)}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-slate-300">
              {isConnected ? 'Conexión Establecida (En vivo)' : 'Desconectado'}
            </span>
          </div>

          <div className="space-y-4 mt-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-slate-400 mb-1">
                <Activity className="w-4 h-4" /> Velocidad
              </div>
              <p className="text-2xl font-bold text-white">{vehicleLocation.speed} <span className="text-sm text-slate-500 font-normal">km/h</span></p>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 text-slate-400 mb-1">
                <Clock className="w-4 h-4" /> Última Actualización
              </div>
              <p className="text-sm font-medium text-white">
                {new Date(vehicleLocation.updatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: vehicleLocation.lng,
            latitude: vehicleLocation.lat,
            zoom: 14,
            pitch: 45
          }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        >
          <NavigationControl position="bottom-right" />
          
          <Marker 
            longitude={vehicleLocation.lng} 
            latitude={vehicleLocation.lat} 
            anchor="bottom"
          >
            <div className="relative flex flex-col items-center group">
              <div className="absolute -top-10 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {vehicleLocation.speed} km/h
              </div>
              <div className="bg-indigo-500 p-2 rounded-full shadow-lg shadow-indigo-500/50 pulse-glow border-2 border-white">
                <Navigation className="w-5 h-5 text-white" />
              </div>
            </div>
          </Marker>
        </Map>
      </div>

      </div>
    </div>
  );
}
