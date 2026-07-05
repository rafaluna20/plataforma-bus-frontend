"use client";

/**
 * MapaInteractivo.tsx
 * Este archivo NUNCA debe ser importado con SSR.
 * Siempre usar: dynamic(() => import('./MapaInteractivo'), { ssr: false })
 *
 * Modos:
 *  - 'live'   → Marcadores de vehículos / viajes (seguimiento en tiempo real)
 *  - 'routes' → Polilíneas de rutas + marcadores de estaciones
 */

import { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, useMap, CircleMarker, Tooltip,
} from 'react-leaflet';
import { Icon } from 'leaflet';
import Link from 'next/link';
import { ExternalLink, Radio, Map } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// ─── Tipos públicos ────────────────────────────────────────────────────────────
export interface Coordenadas { lat: number; lng: number; }

export interface ViajeMapa {
  id: string;
  origen: string;
  destino: string;
  conductor: string;
  categoria: string;
  estado: boolean;
  coordenadas: Coordenadas;
  precio: number;
  urlimagen?: string;
  pasajerosRestantes?: number;
}

export interface EstacionRuta {
  nombre: string;
  lat: number;
  lng: number;
  stopOrder: number;
}

export interface RutaMapa {
  id: string;
  nombre: string;
  estaciones: EstacionRuta[];
  color?: string; // color de línea personalizado (opcional)
}

interface MapaInteractivoProps {
  viajes: ViajeMapa[];
  seleccionado: ViajeMapa | null;
  onSeleccionar: (v: ViajeMapa) => void;
  rutas?: RutaMapa[];
  rutaSeleccionada?: RutaMapa | null;
  onSeleccionarRuta?: (r: RutaMapa) => void;
  defaultMode?: 'live' | 'routes';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSoles = (v: number) =>
  `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Paleta de colores para múltiples rutas
const ROUTE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

// ─── Íconos de vehículos ──────────────────────────────────────────────────────
const iconoActivo = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const iconoLiquidado = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const iconoSeleccionado = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 48], iconAnchor: [15, 48], popupAnchor: [1, -40], shadowSize: [41, 41],
});
const iconoEstacionInicio = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [22, 36], iconAnchor: [11, 36], popupAnchor: [1, -30], shadowSize: [41, 41],
});
const iconoEstacionFin = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [22, 36], iconAnchor: [11, 36], popupAnchor: [1, -30], shadowSize: [41, 41],
});

// ─── FlyTo Controller para vehículos ──────────────────────────────────────────
function FlyToController({ seleccionado }: { seleccionado: ViajeMapa | null }) {
  const map = useMap();
  useEffect(() => {
    if (!seleccionado?.coordenadas) return;
    const { lat, lng } = seleccionado.coordenadas;
    const point = map.project([lat, lng], 14);
    point.y -= 160;
    map.flyTo(map.unproject(point, 14), 14, { duration: 1.2 });
  }, [seleccionado, map]);
  return null;
}

// ─── FlyTo Controller para rutas ──────────────────────────────────────────────
function FlyToRutaController({ ruta }: { ruta: RutaMapa | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!ruta || ruta.estaciones.length === 0) return;
    const validas = ruta.estaciones.filter(e => e.lat && e.lng);
    if (validas.length === 0) return;
    if (validas.length === 1) {
      map.flyTo([validas[0].lat, validas[0].lng], 13, { duration: 1.2 });
      return;
    }
    const lats = validas.map(e => e.lat);
    const lngs = validas.map(e => e.lng);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    map.flyToBounds(bounds, { padding: [60, 60], duration: 1.4 });
  }, [ruta, map]);
  return null;
}

// ─── Estilos globales del mapa ────────────────────────────────────────────────
const popupStyles = `
  .leaflet-popup-content-wrapper {
    background: rgb(15 23 42) !important;
    border: 1px solid rgba(59,130,246,0.2) !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 50px rgba(0,0,0,0.9), 0 0 0 1px rgba(59,130,246,0.1) !important;
    color: white !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-content { margin: 0 !important; width: 280px !important; }
  .leaflet-popup-tip-container { display: none !important; }
  .leaflet-popup-close-button {
    color: rgb(100 116 139) !important;
    top: 8px !important; right: 8px !important;
    font-size: 20px !important; width: 24px !important; height: 24px !important; z-index: 10 !important;
  }
  .leaflet-popup-close-button:hover { color: white !important; }
  .leaflet-container { background: rgb(2 6 23) !important; font-family: inherit !important; }
  .leaflet-control-zoom a {
    background: rgb(15 23 42) !important;
    color: rgb(148 163 184) !important;
    border-color: rgba(255,255,255,0.1) !important;
  }
  .leaflet-control-zoom a:hover { background: rgb(30 41 59) !important; color: white !important; }
  .leaflet-control-attribution {
    background: rgba(2,6,23,0.8) !important;
    color: rgb(71 85 105) !important; font-size: 9px !important;
  }
  .leaflet-control-attribution a { color: rgb(99 102 241) !important; }
  .leaflet-tooltip {
    background: rgba(15,23,42,0.95) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    color: white !important;
    border-radius: 8px !important;
    padding: 4px 10px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
  }
  .leaflet-tooltip-bottom::before { border-bottom-color: rgba(255,255,255,0.1) !important; }
`;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MapaInteractivo({
  viajes,
  seleccionado,
  onSeleccionar,
  rutas = [],
  rutaSeleccionada,
  onSeleccionarRuta,
  defaultMode = 'live',
}: MapaInteractivoProps) {
  const [viewMode, setViewMode] = useState<'live' | 'routes'>(defaultMode);
  const centerDefault: [number, number] = [-12.0464, -77.0428];

  // ─── Modo LIVE: Marcadores de vehículos ────────────────────────────────────
  const renderLiveMarkers = () =>
    viajes.map((v) => {
      const coords = v.coordenadas;
      if (!coords) return null;
      const estaFinalizado = !v.estado;
      const isSelected = seleccionado?.id === v.id;
      const icono = isSelected ? iconoSeleccionado : estaFinalizado ? iconoLiquidado : iconoActivo;

      return (
        <Marker
          key={v.id}
          position={[coords.lat, coords.lng]}
          icon={icono}
          eventHandlers={{ click: () => onSeleccionar(v) }}
        >
          <Popup minWidth={280} maxWidth={280} closeButton={true}>
            <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgb(15 23 42)' }}>
              {v.urlimagen && (
                <div style={{ width: '100%', height: 130, overflow: 'hidden', position: 'relative' }}>
                  <img src={v.urlimagen} alt={v.origen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(15,23,42,1), transparent)' }} />
                </div>
              )}
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: estaFinalizado ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                    color: estaFinalizado ? '#94a3b8' : '#60a5fa',
                    border: `1px solid ${estaFinalizado ? 'rgba(100,116,139,0.3)' : 'rgba(59,130,246,0.3)'}`,
                  }}>
                    {estaFinalizado ? 'Finalizado' : '🟢 En Ruta'}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.3)', textTransform: 'capitalize',
                  }}>
                    {v.categoria}
                  </span>
                </div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginBottom: 2 }}>
                  {v.origen} → {v.destino}
                </p>
                <p style={{ color: 'rgb(100,116,139)', fontSize: 11, marginBottom: 10 }}>Por: {v.conductor}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px' }}>
                    <p style={{ color: 'rgb(100,116,139)', fontSize: 9, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Precio Asiento</p>
                    <p style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{formatSoles(v.precio)}</p>
                  </div>
                  {v.pasajerosRestantes !== undefined && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px' }}>
                      <p style={{ color: 'rgb(100,116,139)', fontSize: 9, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Asientos Disp.</p>
                      <p style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{v.pasajerosRestantes}</p>
                    </div>
                  )}
                </div>
                <Link
                  href={`/buscar/${v.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, width: '100%', padding: '8px 0',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    color: 'white', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <ExternalLink className="w-3 h-3" /> Ver Viaje
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });

  // ─── Modo ROUTES: Polilíneas + Estaciones ─────────────────────────────────
  const renderRoutes = () =>
    rutas.map((ruta, ri) => {
      const color = ruta.color || ROUTE_COLORS[ri % ROUTE_COLORS.length];
      const estaciones = [...ruta.estaciones].sort((a, b) => a.stopOrder - b.stopOrder);
      const validas = estaciones.filter(e => e.lat && e.lng);
      if (validas.length < 2) return null;
      const positions: [number, number][] = validas.map(e => [e.lat, e.lng]);
      const isSelected = rutaSeleccionada?.id === ruta.id;

      return (
        <span key={ruta.id}>
          {/* Línea de la ruta */}
          <Polyline
            positions={positions}
            pathOptions={{
              color,
              weight: isSelected ? 6 : 3,
              opacity: isSelected ? 1 : 0.6,
              dashArray: isSelected ? undefined : '8 5',
            }}
            eventHandlers={{ click: () => onSeleccionarRuta?.(ruta) }}
          />

          {/* Marcadores de estaciones */}
          {validas.map((est, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === validas.length - 1;
            const isIntermediate = !isFirst && !isLast;

            if (isIntermediate) {
              return (
                <CircleMarker
                  key={`${ruta.id}-est-${idx}`}
                  center={[est.lat, est.lng]}
                  radius={5}
                  pathOptions={{
                    color: '#0f172a',
                    fillColor: color,
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => onSeleccionarRuta?.(ruta) }}
                >
                  <Tooltip direction="top" permanent={false}>
                    <span>🔘 {est.nombre}</span>
                  </Tooltip>
                </CircleMarker>
              );
            }

            return (
              <Marker
                key={`${ruta.id}-est-${idx}`}
                position={[est.lat, est.lng]}
                icon={isFirst ? iconoEstacionInicio : iconoEstacionFin}
                eventHandlers={{ click: () => onSeleccionarRuta?.(ruta) }}
              >
                <Popup minWidth={220} maxWidth={220} closeButton>
                  <div style={{ padding: '12px 14px', background: 'rgb(15 23 42)', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 18,
                        background: isFirst ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isFirst ? '🟢' : '🔴'}
                      </span>
                      <div>
                        <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>{est.nombre}</p>
                        <p style={{ color: 'rgb(100,116,139)', fontSize: 10, margin: 0 }}>
                          {isFirst ? 'Origen' : 'Destino'}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                      borderRadius: 8, padding: '6px 10px',
                    }}>
                      <p style={{ color: 'rgb(148,163,184)', fontSize: 10, margin: 0 }}>Ruta</p>
                      <p style={{ color: 'white', fontWeight: 600, fontSize: 12, margin: 0 }}>{ruta.nombre}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </span>
      );
    });

  // ─── Toggle UI flotante sobre el mapa ────────────────────────────────────
  const ToggleControl = () => (
    <div style={{
      position: 'absolute',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14,
      padding: 4,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <button
        onClick={() => setViewMode('live')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 18px', borderRadius: 10,
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          transition: 'all 0.25s ease',
          background: viewMode === 'live'
            ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
            : 'transparent',
          color: viewMode === 'live' ? 'white' : 'rgb(100,116,139)',
          boxShadow: viewMode === 'live' ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
        }}
      >
        <Radio style={{ width: 13, height: 13 }} />
        Unidades en Vivo
        {viewMode === 'live' && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#34d399', animation: 'pulse 1.5s infinite',
            display: 'inline-block', marginLeft: 2,
          }} />
        )}
      </button>

      <button
        onClick={() => setViewMode('routes')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 18px', borderRadius: 10,
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          transition: 'all 0.25s ease',
          background: viewMode === 'routes'
            ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
            : 'transparent',
          color: viewMode === 'routes' ? 'white' : 'rgb(100,116,139)',
          boxShadow: viewMode === 'routes' ? '0 4px 14px rgba(139,92,246,0.4)' : 'none',
        }}
      >
        <Map style={{ width: 13, height: 13 }} />
        Red de Rutas
      </button>
    </div>
  );

  // ─── Modo sin rutas cargadas ───────────────────────────────────────────────
  const NoRoutesOverlay = () =>
    viewMode === 'routes' && rutas.length === 0 ? (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(4px)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Sin rutas disponibles</p>
          <p style={{ color: 'rgb(100,116,139)', fontSize: 13 }}>
            Esta empresa aún no tiene rutas con estaciones georreferenciadas.
          </p>
        </div>
      </div>
    ) : null;

  return (
    <>
      <style>{popupStyles}</style>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Toggle flotante */}
        <ToggleControl />

        {/* Overlay "sin rutas" */}
        <NoRoutesOverlay />

        <MapContainer
          center={centerDefault}
          zoom={6}
          style={{ height: '100%', width: '100%', zIndex: 0, background: 'rgb(2 6 23)' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/" style="color:#6366f1">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Controllers */}
          {viewMode === 'live' && <FlyToController seleccionado={seleccionado} />}
          {viewMode === 'routes' && <FlyToRutaController ruta={rutaSeleccionada} />}

          {/* Contenido por modo */}
          {viewMode === 'live' && renderLiveMarkers()}
          {viewMode === 'routes' && renderRoutes()}
        </MapContainer>
      </div>
    </>
  );
}
