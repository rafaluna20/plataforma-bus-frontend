"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/config";
import { Navigation, Wifi, WifiOff, Loader2, MapPin, Gauge, Clock } from "lucide-react";

type LocationData = {
  tripId: string;
  lat: number;
  lng: number;
  speed: number;
  bearing: number;
  timestamp: string;
};

type Waypoint = {
  id: string;
  stopOrder: number;
  station: { id: string; name: string; city: string };
};

type LiveMapProps = {
  tripId: string;
  waypoints: Waypoint[];
  primaryColor: string;
  secondaryColor: string;
};

export default function LiveMap({ tripId, waypoints, primaryColor, secondaryColor }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!lastUpdate) {
      setSecondsElapsed(null);
      return;
    }
    const calcElapsed = () => Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    setSecondsElapsed(calcElapsed());

    const interval = setInterval(() => {
      setSecondsElapsed(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  const formatTimeElapsed = (seconds: number | null): string => {
    if (seconds === null) return "—";
    if (seconds < 60) return `hace ${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins === 1) return "hace 1 min";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `hace ${hours} h`;
  };

  // ─── Inicializar mapa Leaflet ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Leaflet solo funciona en el cliente
    import("leaflet").then((L) => {
      // Fix para los iconos de Leaflet en Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Centro inicial: primer waypoint o Perú por defecto
      const firstWp = waypoints[0];
      const lastWp = waypoints[waypoints.length - 1];
      const centerLat = -9.19; // Centro de Perú
      const centerLng = -75.01;

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLng],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layer CartoDB Dark Matter para modo oscuro premium
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // Dibujar la ruta entre waypoints si hay coordenadas disponibles
      // (Los waypoints no tienen lat/lng en este modelo, solo nombres de estaciones)
      // Mostrar marcadores de origen y destino con nombres
      if (waypoints.length >= 2) {
        // Marcador de origen (verde)
        const originIcon = L.divIcon({
          html: `<div style="
            background: ${primaryColor};
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          ">
            <span style="transform: rotate(45deg); font-size: 12px;">A</span>
          </div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const destIcon = L.divIcon({
          html: `<div style="
            background: ${secondaryColor};
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 28px; height: 28px;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          ">
            <span style="transform: rotate(45deg); font-size: 12px;">B</span>
          </div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        // Nota: sin coordenadas reales de estaciones, solo mostramos info
        // El mapa se centrará en la ubicación del bus cuando llegue
      }

      leafletMapRef.current = map;
      setMapReady(true);
    }).catch((err) => {
      setMapError("No se pudo cargar el mapa");
      console.error("Leaflet error:", err);
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Conectar Socket.io ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;

    const SOCKET_URL = API_URL.replace("/api/v1", "").replace("http://", "http://").replace("https://", "https://");
    // Extraer solo el host:port del API_URL
    const socketUrl = API_URL.includes("/api") ? API_URL.split("/api")[0] : API_URL;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      withCredentials: true, // envía la cookie httpOnly access_token en el handshake
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Unirse a la sala del viaje
      socket.emit("join_trip", tripId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", () => {
      setConnected(false);
    });

    // Recibir actualizaciones de ubicación del chofer
    socket.on("location_updated", (data: LocationData) => {
      if (data.tripId !== tripId) return;
      setLocation(data);
      setLastUpdate(new Date());
      updateMapMarker(data);
    });

    return () => {
      socket.emit("leave_trip", tripId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actualizar marcador en el mapa ──────────────────────────────────────
  const updateMapMarker = useCallback((data: LocationData) => {
    if (!leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      // Icono del bus animado
      const busIcon = L.divIcon({
        html: `<div style="
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          color: white;
          border-radius: 50%;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          transform: rotate(${data.bearing || 0}deg);
          transition: transform 0.5s ease;
          font-size: 18px;
        ">🚌</div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (markerRef.current) {
        // Mover marcador existente suavemente
        markerRef.current.setLatLng([data.lat, data.lng]);
        markerRef.current.setIcon(busIcon);
      } else {
        // Crear nuevo marcador
        markerRef.current = L.marker([data.lat, data.lng], { icon: busIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 160px;">
              <p style="font-weight: bold; margin: 0 0 4px;">🚌 Bus en ruta</p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                Velocidad: ${data.speed} km/h<br/>
                Actualizado: ${new Date(data.timestamp).toLocaleTimeString("es-PE")}
              </p>
            </div>
          `);
      }

      // Centrar mapa en la nueva posición
      map.setView([data.lat, data.lng], Math.max(map.getZoom(), 13), {
        animate: true,
        duration: 1,
      });
    });
  }, [primaryColor, secondaryColor]);



  return (
    <div className="space-y-4">
      {/* Header con estado de conexión */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Navigation className="w-5 h-5" style={{ color: primaryColor }} />
            Ubicación en Tiempo Real
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Transmitida desde el dispositivo del conductor
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!connected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <WifiOff className="w-3.5 h-3.5" />
              Desconectado
            </div>
          ) : secondsElapsed === null ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              <Clock className="w-3.5 h-3.5" />
              Esperando Chofer
            </div>
          ) : secondsElapsed < 45 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Wifi className="w-3.5 h-3.5" />
              Señal GPS Activa
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <WifiOff className="w-3.5 h-3.5" />
              Chofer Inactivo / Sin GPS
            </div>
          )}
        </div>
      </div>

      {/* Stats de ubicación */}
      {location && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Gauge className="w-4 h-4" />,
              label: "Velocidad",
              value: `${location.speed} km/h`,
              color: primaryColor,
            },
            {
              icon: <MapPin className="w-4 h-4" />,
              label: "Coordenadas",
              value: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
              color: "#94a3b8",
            },
            {
              icon: <Clock className="w-4 h-4" />,
              label: "Actualizado",
              value: formatTimeElapsed(secondsElapsed),
              color: secondsElapsed !== null && secondsElapsed < 45 
                ? "#10b981" 
                : secondsElapsed !== null && secondsElapsed < 180 
                  ? "#f59e0b" 
                  : "#ef4444",
            },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center mb-1" style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <p className="text-white font-bold text-xs">{stat.value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mapa */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10"
        style={{ height: 420 }}>

        {/* Leaflet CSS */}
        <style>{`
          @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
          .leaflet-container { background: #1e293b; }
          .leaflet-tile { filter: brightness(0.85) saturate(0.9); }
        `}</style>

        {/* Contenedor del mapa */}
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Overlay cuando no hay ubicación */}
        {!location && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[1000]"
            style={{ background: "rgba(8,13,26,0.85)", backdropFilter: "blur(4px)" }}>
            {connected ? (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: `${primaryColor}20`, border: `2px solid ${primaryColor}40` }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
                </div>
                <p className="text-white font-semibold text-sm">Esperando señal GPS...</p>
                <p className="text-slate-400 text-xs mt-1">
                  El conductor aún no ha iniciado la transmisión
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.3)" }}>
                  <WifiOff className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-white font-semibold text-sm">Sin conexión al servidor</p>
                <p className="text-slate-400 text-xs mt-1 text-center max-w-xs">
                  Verificando conexión con el servidor de rastreo...
                </p>
              </>
            )}
          </div>
        )}

        {/* Badge de ruta */}
        {waypoints.length >= 2 && (
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(8,13,26,0.9)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primaryColor }} />
            <span className="truncate max-w-[200px]">
              {waypoints[0].station.name} → {waypoints[waypoints.length - 1].station.name}
            </span>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-white/5"
        style={{ background: "rgba(255,255,255,0.03)" }}>
        <Navigation className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
        <div>
          <p className="text-xs text-slate-300 font-medium">Rastreo GPS en tiempo real</p>
          <p className="text-xs text-slate-500 mt-0.5">
            La ubicación se actualiza automáticamente cada vez que el conductor envía su posición desde la app móvil.
            La señal puede tener un retraso de 3-5 segundos.
          </p>
        </div>
      </div>
    </div>
  );
}
