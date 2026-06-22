"use client";

/**
 * MapaInteractivo.tsx
 * Este archivo NUNCA debe ser importado con SSR.
 * Siempre usar: dynamic(() => import('./MapaInteractivo'), { ssr: false })
 */

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Coordenadas { lat: number; lng: number; }

export interface ViajeMapa {
  id: string;
  origen: string;
  destino: string;
  conductor: string;
  categoria: string;
  estado: boolean; // true = En Ruta / Programado, false = Finalizado
  coordenadas: Coordenadas;
  precio: number;
  urlimagen?: string;
  pasajerosRestantes?: number;
}

interface MapaInteractivoProps {
  viajes: ViajeMapa[];
  seleccionado: ViajeMapa | null;
  onSeleccionar: (v: ViajeMapa) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSoles = (v: number) =>
  `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Íconos personalizados ────────────────────────────────────────────────────
const iconoActivo = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconoLiquidado = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconoSeleccionado = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [41, 41],
});

// ─── FlyTo Controller ─────────────────────────────────────────────────────────
function FlyToController({ seleccionado }: { seleccionado: ViajeMapa | null }) {
  const map = useMap();

  useEffect(() => {
    if (!seleccionado) return;
    const coords = seleccionado.coordenadas;
    if (!coords) return;

    const targetZoom = 15;
    const point = map.project([coords.lat, coords.lng], targetZoom);
    point.y -= 180; 
    const newCenter = map.unproject(point, targetZoom);
    map.flyTo(newCenter, targetZoom, { duration: 1.2 });
  }, [seleccionado, map]);

  return null;
}

// ─── Estilos del Popup ────────────────────────────────────────────────────────
const popupStyles = `
  .leaflet-popup-content-wrapper {
    background: rgb(15 23 42) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 50px rgba(0,0,0,0.8) !important;
    color: white !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
    width: 280px !important;
  }
  .leaflet-popup-tip-container { display: none !important; }
  .leaflet-popup-close-button {
    color: rgb(100 116 139) !important;
    top: 8px !important;
    right: 8px !important;
    font-size: 20px !important;
    width: 24px !important;
    height: 24px !important;
    z-index: 10 !important;
  }
  .leaflet-popup-close-button:hover { color: white !important; }
  .leaflet-container { background: rgb(2 6 23) !important; font-family: inherit !important; }
`;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MapaInteractivo({ viajes, seleccionado, onSeleccionar }: MapaInteractivoProps) {
  const centerDefault: [number, number] = [-12.0464, -77.0428]; // Centro de Lima, Perú

  return (
    <>
      <style>{popupStyles}</style>
      <MapContainer
        center={centerDefault}
        zoom={12}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <FlyToController seleccionado={seleccionado} />

        {viajes.map((v) => {
          const coords = v.coordenadas;
          if (!coords) return null;

          const estaFinalizado = v.estado === false;
          const isSelected = seleccionado?.id === v.id;
          const imagen = v.urlimagen;
          const icono = isSelected ? iconoSeleccionado : estaFinalizado ? iconoLiquidado : iconoActivo;

          return (
            <Marker
              key={v.id}
              position={[coords.lat, coords.lng]}
              icon={icono}
              eventHandlers={{
                click: () => onSeleccionar(v),
              }}
            >
              <Popup minWidth={280} maxWidth={280} closeButton={true}>
                <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgb(15 23 42)' }}>
                  {imagen && (
                    <div style={{ width: '100%', height: 130, overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={imagen}
                        alt={v.origen}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to top, rgba(15,23,42,1), transparent)' }} />
                    </div>
                  )}

                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        background: estaFinalizado ? 'rgba(100,116,139,0.15)' : 'rgba(59,130,246,0.15)',
                        color: estaFinalizado ? '#94a3b8' : '#60a5fa',
                        border: `1px solid ${estaFinalizado ? 'rgba(100,116,139,0.3)' : 'rgba(59,130,246,0.3)'}`,
                      }}>
                        {estaFinalizado ? 'Finalizado' : 'En Ruta / Programado'}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        background: 'rgba(99,102,241,0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99,102,241,0.3)',
                        textTransform: 'capitalize',
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
                      href={`/viajes/${v.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        width: '100%',
                        padding: '8px 0',
                        background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                        color: 'white',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver Viaje
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
