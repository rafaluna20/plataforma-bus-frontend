"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Undo2, Trash2 } from "lucide-react";

interface ReferencePoint {
  lat: number;
  lng: number;
  label: string;
}

interface RoutePolylineEditorProps {
  /** Paradas comerciales ya configuradas (origen/intermedias/destino), solo como referencia visual — no editables aquí. */
  referencePoints: ReferencePoint[];
  /** Puntos del trazado real (camino), en orden. */
  value: [number, number][];
  onChange: (points: [number, number][]) => void;
}

function ClickHandler({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onAddPoint(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/**
 * Editor de trazado real de una ruta: el admin hace clic sobre un mapa real
 * (calles/carreteras de fondo) para ir agregando puntos y así dibujar el
 * camino tal como es, en vez de que el mapa conecte las paradas comerciales
 * con una línea recta que corta por encima de cerros/edificios. Las paradas
 * comerciales se muestran como referencia (verde=origen, rojo=destino,
 * violeta=intermedias) pero no se editan desde aquí — eso se hace en la
 * lista de paradas de arriba.
 */
export default function RoutePolylineEditor({ referencePoints, value, onChange }: RoutePolylineEditorProps) {
  const center: [number, number] = referencePoints[0]
    ? [referencePoints[0].lat, referencePoints[0].lng]
    : [-12.0464, -77.0428];

  function addPoint(lat: number, lng: number) {
    onChange([...value, [lat, lng]]);
  }
  function undoLast() {
    onChange(value.slice(0, -1));
  }
  function clearAll() {
    onChange([]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Haz clic sobre el mapa, siguiendo la carretera real, para trazar el camino punto por punto.{" "}
          <span className="text-slate-300 font-medium">{value.length} punto{value.length !== 1 ? "s" : ""} trazado{value.length !== 1 ? "s" : ""}.</span>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={undoLast} disabled={value.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-xs disabled:opacity-40 transition-colors">
            <Undo2 className="w-3.5 h-3.5" /> Deshacer
          </button>
          <button type="button" onClick={clearAll} disabled={value.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 text-xs disabled:opacity-40 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Limpiar
          </button>
        </div>
      </div>

      <div style={{ height: 380 }} className="rounded-xl overflow-hidden border border-white/10">
        <MapContainer center={center} zoom={9} style={{ width: "100%", height: "100%", background: "#0f172a" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onAddPoint={addPoint} />

          {/* Paradas comerciales (referencia, no editable aquí) */}
          {referencePoints.map((p, i) => {
            const isFirst = i === 0;
            const isLast = i === referencePoints.length - 1;
            return (
              <CircleMarker
                key={`ref-${i}`}
                center={[p.lat, p.lng]}
                radius={7}
                pathOptions={{
                  color: "#0f172a",
                  weight: 2,
                  fillColor: isFirst ? "#10b981" : isLast ? "#ef4444" : "#8b5cf6",
                  fillOpacity: 1,
                }}
              />
            );
          })}

          {/* Trazado real dibujado a mano */}
          {value.length >= 2 && (
            <Polyline positions={value} pathOptions={{ color: "#f59e0b", weight: 4 }} />
          )}
          {value.map((pt, i) => (
            <CircleMarker key={`shape-${i}`} center={pt} radius={3}
              pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 1, weight: 1 }} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
