"use client";

/**
 * SeatConfigEditor — Configurador visual de asientos para el formulario de vehículos.
 *
 * Usa el mismo layout visual que SeatMapModal (BusMap):
 *  - BUS_2P Piso 1: 3 filas × 4 cols (S1-S12), pasillo entre fila 1 y 2
 *  - BUS_2P Piso 2 / BUS_1P: 4 filas (A,B,C,D) × N cols, pasillo entre B y C
 *  - Conductor a la izquierda, Posterior a la derecha
 *  - Ruedas arriba y abajo
 */

import { useState, useCallback, useEffect, memo, useMemo } from "react";
import {
  Settings2, RotateCcw, ChevronDown, ChevronUp,
  Pencil, CheckCircle2, Layers,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SeatDef = {
  id: string;
  row: number;
  col: number;
  floor: number;
  label: string;
  type: "window" | "aisle" | "middle" | "copilot";
  active: boolean;
};

type SeatTemplate = {
  vehicleType: string;
  floors: number;
  totalSeats: number;
  seats: SeatDef[];
};

export type { SeatTemplate };

// ─── Helpers de construcción ──────────────────────────────────────────────────
function buildBus2P(floor2Seats: number): SeatTemplate {
  const seats: SeatDef[] = [];
  const cols = 4;

  // Piso 1: 12 asientos (3 filas × 4 cols)
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / cols) + 1;
    const col = (i % cols) + 1;
    seats.push({
      id: `S${i + 1}`, row, col, floor: 1,
      label: String(i + 1),
      type: col === 1 || col === 4 ? "window" : "aisle",
      active: true,
    });
  }

  // Piso 2: configurable (4 filas × N cols)
  for (let i = 0; i < floor2Seats; i++) {
    const row = (i % 4) + 1;          // fila A=1, B=2, C=3, D=4
    const col = Math.floor(i / 4) + 1; // columna visual
    seats.push({
      id: `S${12 + i + 1}`, row, col, floor: 2,
      label: String(12 + i + 1),
      type: row === 1 || row === 4 ? "window" : "aisle",
      active: true,
    });
  }

  return { vehicleType: "BUS_2P", floors: 2, totalSeats: 12 + floor2Seats, seats };
}

function buildBus1P(totalSeats: number): SeatTemplate {
  const seats: SeatDef[] = [];
  // 4 filas (A=1,B=2,C=3,D=4) × N cols
  for (let i = 0; i < totalSeats; i++) {
    const row = (i % 4) + 1;
    const col = Math.floor(i / 4) + 1;
    seats.push({
      id: `S${i + 1}`, row, col, floor: 1,
      label: String(i + 1),
      type: row === 1 || row === 4 ? "window" : "aisle",
      active: true,
    });
  }
  return { vehicleType: "BUS_1P", floors: 1, totalSeats, seats };
}

function buildMinivan(totalSeats: number): SeatTemplate {
  const seats: SeatDef[] = [];
  const cols = 3;
  for (let i = 0; i < totalSeats; i++) {
    const row = Math.floor(i / cols) + 1;
    const col = (i % cols) + 1;
    seats.push({
      id: `S${i + 1}`, row, col, floor: 1,
      label: String(i + 1),
      type: col === 1 || col === 3 ? "window" : "middle",
      active: true,
    });
  }
  return { vehicleType: "MINIVAN", floors: 1, totalSeats, seats };
}

function buildAuto(): SeatTemplate {
  return {
    vehicleType: "AUTO", floors: 1, totalSeats: 4,
    seats: [
      { id: "S1", row: 1, col: 2, floor: 1, label: "1", type: "copilot", active: true },
      { id: "S2", row: 2, col: 1, floor: 1, label: "2", type: "window", active: true },
      { id: "S3", row: 2, col: 2, floor: 1, label: "3", type: "middle", active: true },
      { id: "S4", row: 2, col: 3, floor: 1, label: "4", type: "window", active: true },
    ],
  };
}

// ─── Colores ──────────────────────────────────────────────────────────────────
const SEAT_COLORS: Record<string, string> = {
  window: "#22c55e",
  aisle: "#3b82f6",
  middle: "#8b5cf6",
  copilot: "#f59e0b",
};

// ─── SVG Rueda ────────────────────────────────────────────────────────────────
const Wheel = memo(function Wheel() {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#475569" strokeWidth="2.5" fill="#1e293b" />
      <circle cx="14" cy="14" r="5" stroke="#475569" strokeWidth="1.5" fill="#0f172a" />
      <line x1="14" y1="1" x2="14" y2="9" stroke="#475569" strokeWidth="1.5" />
      <line x1="14" y1="19" x2="14" y2="27" stroke="#475569" strokeWidth="1.5" />
      <line x1="1" y1="14" x2="9" y2="14" stroke="#475569" strokeWidth="1.5" />
      <line x1="19" y1="14" x2="27" y2="14" stroke="#475569" strokeWidth="1.5" />
    </svg>
  );
});

const WheelRow = memo(function WheelRow({ cols }: { cols: number }) {
  const totalW = cols * (44 + 4) - 4; // aprox ancho del contenido
  return (
    <div className="flex justify-between items-center px-14" style={{ minWidth: totalW + 75 + 34 }}>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
    </div>
  );
});

// ─── Columna conductor ────────────────────────────────────────────────────────
const DriverCol = memo(function DriverCol() {
  return (
    <div className="flex flex-col items-center justify-center border-r-2 border-slate-400/40 flex-shrink-0"
      style={{ background: "linear-gradient(90deg,#9ba8c0,#b0bbd0)", minWidth: 60, padding: "12px 8px" }}>
      <svg width={28} height={28} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="#64748b" strokeWidth="2.5" fill="none" />
        <circle cx="16" cy="16" r="4.5" fill="#64748b" />
        <line x1="16" y1="2" x2="16" y2="11.5" stroke="#64748b" strokeWidth="2" />
        <line x1="16" y1="20.5" x2="16" y2="30" stroke="#64748b" strokeWidth="2" />
        <line x1="2" y1="16" x2="11.5" y2="16" stroke="#64748b" strokeWidth="2" />
        <line x1="20.5" y1="16" x2="30" y2="16" stroke="#64748b" strokeWidth="2" />
      </svg>
      <span className="text-[7px] font-bold text-slate-600 uppercase tracking-wider mt-1"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        Conductor
      </span>
    </div>
  );
});

const PostCol = memo(function PostCol() {
  return (
    <div className="flex flex-col items-center justify-center border-l-2 border-slate-400/40 flex-shrink-0"
      style={{ background: "linear-gradient(90deg,#b0bbd0,#9ba8c0)", minWidth: 28, padding: "12px 4px" }}>
      <span className="text-[7px] font-bold text-slate-600 uppercase tracking-wider"
        style={{ writingMode: "vertical-rl" }}>Post.</span>
    </div>
  );
});

// ─── Celda de asiento ─────────────────────────────────────────────────────────
const SeatCell = memo(function SeatCell({
  seat,
  editingId,
  onToggle,
  onStartEdit,
  onLabelChange,
  onFinishEdit,
}: {
  seat: SeatDef;
  editingId: string | null;
  onToggle: (id: string) => void;
  onStartEdit: (id: string) => void;
  onLabelChange: (id: string, val: string) => void;
  onFinishEdit: () => void;
}) {
  const isEditing = editingId === seat.id;
  const color = seat.active ? SEAT_COLORS[seat.type] : "#475569";
  const SZ = 44;

  return (
    <div className="relative flex-shrink-0 group" style={{ width: SZ, height: SZ }}>
      <button
        type="button"
        onClick={() => !isEditing && onToggle(seat.id)}
        title={`Asiento ${seat.label} — ${seat.active ? "Activo (clic para desactivar)" : "Inactivo (clic para activar)"}`}
        className="w-full h-full rounded-lg border-2 flex items-center justify-center font-bold text-xs transition-all"
        style={{
          background: seat.active ? `${color}30` : "rgba(71,85,105,0.15)",
          borderColor: seat.active ? color : "#475569",
          color: seat.active ? color : "#64748b",
          opacity: seat.active ? 1 : 0.4,
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={seat.label}
            onChange={e => onLabelChange(seat.id, e.target.value)}
            onBlur={onFinishEdit}
            onKeyDown={e => e.key === "Enter" && onFinishEdit()}
            maxLength={4}
            className="w-full h-full bg-transparent text-center font-bold text-xs focus:outline-none"
            style={{ color: seat.active ? color : "#64748b" }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span>{seat.label}</span>
        )}
      </button>
      {!isEditing && seat.active && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onStartEdit(seat.id); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Editar etiqueta"
        >
          <Pencil className="w-2.5 h-2.5 text-black" />
        </button>
      )}
    </div>
  );
});

// ─── AutoMap — Vista de planta (top-down) horizontal, frente a la izquierda ──
function AutoMap({
  seats, editingId, onToggle, onStartEdit, onLabelChange, onFinishEdit,
}: {
  seats: SeatDef[];
  editingId: string | null;
  onToggle: (id: string) => void;
  onStartEdit: (id: string) => void;
  onLabelChange: (id: string, val: string) => void;
  onFinishEdit: () => void;
}) {
  const copilot = seats.find(s => s.type === "copilot");
  const backSeats = seats.filter(s => s.row === 2).sort((a, b) => a.col - b.col);

  function renderSeat(seat: SeatDef | undefined, key: string) {
    if (!seat) return <div key={key} style={{ width: 44, height: 44 }} className="flex-shrink-0" />;
    return (
      <SeatCell
        key={seat.id}
        seat={seat}
        editingId={editingId}
        onToggle={onToggle}
        onStartEdit={onStartEdit}
        onLabelChange={onLabelChange}
        onFinishEdit={onFinishEdit}
      />
    );
  }

  // Dimensiones del SVG: ancho=420, alto=200 (horizontal, frente a la izquierda)
  const W = 420, H = 200;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Contenedor del auto en planta */}
      <div className="relative" style={{ width: W, height: H }}>

        {/* ── SVG realista del auto en vista de planta (top-down) ── */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Gradiente carrocería */}
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            {/* Gradiente techo/cabina */}
            <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            {/* Gradiente capó */}
            <linearGradient id="hoodGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            {/* Gradiente maletero */}
            <linearGradient id="trunkGrad" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            {/* Gradiente rueda */}
            <radialGradient id="wheelGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            {/* Sombra suave */}
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* ── Ruedas (debajo de la carrocería) ── */}
          {/* Rueda delantera superior */}
          <g transform="translate(72, 14)">
            <rect x="-14" y="-8" width="28" height="36" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <rect x="-9" y="-3" width="18" height="26" rx="4" fill="url(#wheelGrad)" />
            <circle cx="0" cy="10" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-1" x2="0" y2="5" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="15" x2="0" y2="21" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="10" x2="-1" y2="10" stroke="#64748b" strokeWidth="1" />
            <line x1="1" y1="10" x2="6" y2="10" stroke="#64748b" strokeWidth="1" />
          </g>
          {/* Rueda delantera inferior */}
          <g transform="translate(72, 186)">
            <rect x="-14" y="-28" width="28" height="36" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <rect x="-9" y="-23" width="18" height="26" rx="4" fill="url(#wheelGrad)" />
            <circle cx="0" cy="-10" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-21" x2="0" y2="-15" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-5" x2="0" y2="1" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="-10" x2="-1" y2="-10" stroke="#64748b" strokeWidth="1" />
            <line x1="1" y1="-10" x2="6" y2="-10" stroke="#64748b" strokeWidth="1" />
          </g>
          {/* Rueda trasera superior */}
          <g transform="translate(348, 14)">
            <rect x="-14" y="-8" width="28" height="36" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <rect x="-9" y="-3" width="18" height="26" rx="4" fill="url(#wheelGrad)" />
            <circle cx="0" cy="10" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-1" x2="0" y2="5" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="15" x2="0" y2="21" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="10" x2="-1" y2="10" stroke="#64748b" strokeWidth="1" />
            <line x1="1" y1="10" x2="6" y2="10" stroke="#64748b" strokeWidth="1" />
          </g>
          {/* Rueda trasera inferior */}
          <g transform="translate(348, 186)">
            <rect x="-14" y="-28" width="28" height="36" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <rect x="-9" y="-23" width="18" height="26" rx="4" fill="url(#wheelGrad)" />
            <circle cx="0" cy="-10" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-21" x2="0" y2="-15" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="-5" x2="0" y2="1" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="-10" x2="-1" y2="-10" stroke="#64748b" strokeWidth="1" />
            <line x1="1" y1="-10" x2="6" y2="-10" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* ── Carrocería principal ── */}
          <path
            d="M38 30 Q20 30 14 50 L10 100 L14 150 Q20 170 38 170 L382 170 Q400 170 406 150 L410 100 L406 50 Q400 30 382 30 Z"
            fill="url(#bodyGrad)"
            stroke="#475569"
            strokeWidth="2"
            filter="url(#shadow)"
          />

          {/* ── Capó (frente, izquierda) ── */}
          <path
            d="M38 30 Q20 30 14 50 L10 100 L14 150 Q20 170 38 170 L100 170 L100 30 Z"
            fill="url(#hoodGrad)"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {/* Línea de pliegue del capó */}
          <line x1="55" y1="38" x2="55" y2="162" stroke="#64748b" strokeWidth="1" opacity="0.4" />
          <line x1="75" y1="34" x2="75" y2="166" stroke="#64748b" strokeWidth="0.8" opacity="0.3" />

          {/* ── Parabrisas delantero ── */}
          <path
            d="M100 38 L100 162 L130 155 L130 45 Z"
            fill="#1e3a5f"
            stroke="#334155"
            strokeWidth="1.5"
            opacity="0.85"
          />
          {/* Reflejo parabrisas */}
          <path d="M104 50 L104 90 L112 88 L112 52 Z" fill="white" opacity="0.06" />

          {/* ── Techo / cabina ── */}
          <rect x="130" y="30" width="160" height="140" rx="4" fill="url(#roofGrad)" stroke="#334155" strokeWidth="1" />
          {/* Línea central del techo */}
          <line x1="130" y1="100" x2="290" y2="100" stroke="#475569" strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />

          {/* ── Vidrio trasero ── */}
          <path
            d="M290 45 L290 155 L320 162 L320 38 Z"
            fill="#1e3a5f"
            stroke="#334155"
            strokeWidth="1.5"
            opacity="0.85"
          />
          {/* Reflejo vidrio trasero */}
          <path d="M294 55 L294 90 L302 88 L302 57 Z" fill="white" opacity="0.05" />

          {/* ── Maletero (atrás, derecha) ── */}
          <path
            d="M320 30 L382 30 Q400 30 406 50 L410 100 L406 150 Q400 170 382 170 L320 170 Z"
            fill="url(#trunkGrad)"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {/* Línea de pliegue del maletero */}
          <line x1="365" y1="38" x2="365" y2="162" stroke="#64748b" strokeWidth="1" opacity="0.4" />
          <line x1="345" y1="34" x2="345" y2="166" stroke="#64748b" strokeWidth="0.8" opacity="0.3" />

          {/* ── Faros delanteros (izquierda) ── */}
          {/* Faro superior */}
          <path d="M10 42 Q8 50 10 62 L22 58 L22 46 Z" fill="#fbbf24" opacity="0.9" />
          <path d="M10 42 Q8 50 10 62 L22 58 L22 46 Z" fill="none" stroke="#f59e0b" strokeWidth="1" />
          {/* Faro inferior */}
          <path d="M10 138 Q8 150 10 158 L22 154 L22 142 Z" fill="#fbbf24" opacity="0.9" />
          <path d="M10 138 Q8 150 10 158 L22 154 L22 142 Z" fill="none" stroke="#f59e0b" strokeWidth="1" />
          {/* Luz de posición delantera */}
          <rect x="10" y="68" width="12" height="64" rx="3" fill="#fef3c7" opacity="0.3" />

          {/* ── Faros traseros (derecha) ── */}
          {/* Faro superior */}
          <path d="M410 42 Q412 50 410 62 L398 58 L398 46 Z" fill="#ef4444" opacity="0.9" />
          <path d="M410 42 Q412 50 410 62 L398 58 L398 46 Z" fill="none" stroke="#dc2626" strokeWidth="1" />
          {/* Faro inferior */}
          <path d="M410 138 Q412 150 410 158 L398 154 L398 142 Z" fill="#ef4444" opacity="0.9" />
          <path d="M410 138 Q412 150 410 158 L398 154 L398 142 Z" fill="none" stroke="#dc2626" strokeWidth="1" />
          {/* Luz de posición trasera */}
          <rect x="398" y="68" width="12" height="64" rx="3" fill="#fecaca" opacity="0.3" />

          {/* ── Espejos retrovisores ── */}
          {/* Espejo superior */}
          <path d="M108 30 L108 22 Q118 18 128 22 L128 30 Z" fill="#334155" stroke="#475569" strokeWidth="1" />
          {/* Espejo inferior */}
          <path d="M108 170 L108 178 Q118 182 128 178 L128 170 Z" fill="#334155" stroke="#475569" strokeWidth="1" />

          {/* ── Líneas de puertas ── */}
          {/* Puerta delantera superior */}
          <path d="M130 32 L210 32" stroke="#64748b" strokeWidth="1" opacity="0.5" />
          <path d="M130 168 L210 168" stroke="#64748b" strokeWidth="1" opacity="0.5" />
          {/* Puerta trasera superior */}
          <path d="M210 32 L290 32" stroke="#64748b" strokeWidth="1" opacity="0.5" />
          <path d="M210 168 L290 168" stroke="#64748b" strokeWidth="1" opacity="0.5" />
          {/* Separador entre puertas */}
          <line x1="210" y1="30" x2="210" y2="170" stroke="#64748b" strokeWidth="1.5" opacity="0.5" />

          {/* ── Manijas de puertas ── */}
          {/* Manija puerta delantera superior */}
          <rect x="162" y="34" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />
          {/* Manija puerta delantera inferior */}
          <rect x="162" y="161" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />
          {/* Manija puerta trasera superior */}
          <rect x="240" y="34" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />
          {/* Manija puerta trasera inferior */}
          <rect x="240" y="161" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />

          {/* ── Detalle: antena ── */}
          <line x1="260" y1="30" x2="260" y2="18" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <circle cx="260" cy="17" r="2" fill="#64748b" opacity="0.6" />

          {/* ── Etiqueta frente/atrás ── */}
          <text x="18" y="12" fontSize="8" fill="#64748b" fontFamily="monospace" opacity="0.7">◄ FRENTE</text>
          <text x="360" y="12" fontSize="8" fill="#64748b" fontFamily="monospace" opacity="0.7">ATRÁS ►</text>
        </svg>

        {/* ── Asientos superpuestos sobre la cabina ── */}
        {/* La cabina ocupa x:130–290, y:30–170 en el SVG (160×140px) */}
        {/* Fila delantera: x≈138, Fila trasera: x≈218 */}

        {/* Fila delantera (izquierda de la cabina): Copiloto arriba + Chofer abajo */}
        <div className="absolute" style={{ left: 138, top: 38 }}>
          {/* Copiloto (arriba = lado pasajero) */}
          <div className="flex flex-col items-center gap-1 mb-2">
            {renderSeat(copilot, "copilot")}
            <span className="text-[8px] font-bold" style={{ color: SEAT_COLORS.copilot }}>Copiloto</span>
          </div>
          {/* Chofer (abajo = lado conductor, volante a la izquierda) */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-lg border-2 border-slate-500/60 flex flex-col items-center justify-center"
              style={{ background: "rgba(100,116,139,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" stroke="#64748b" strokeWidth="2.5" fill="none" />
                <circle cx="16" cy="16" r="4" fill="#64748b" />
                <line x1="16" y1="3" x2="16" y2="12" stroke="#64748b" strokeWidth="2" />
                <line x1="16" y1="20" x2="16" y2="29" stroke="#64748b" strokeWidth="2" />
                <line x1="3" y1="16" x2="12" y2="16" stroke="#64748b" strokeWidth="2" />
                <line x1="20" y1="16" x2="29" y2="16" stroke="#64748b" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide">Chofer</span>
          </div>
        </div>

        {/* Fila trasera (derecha de la cabina): 3 asientos en columna */}
        <div className="absolute" style={{ left: 218, top: 38 }}>
          {backSeats.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center gap-1 mb-1">
              {renderSeat(s, `back${i}`)}
              <span className="text-[8px] text-slate-500 font-medium">
                {i === 0 ? "Izq" : i === 1 ? "Cen" : "Der"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border inline-block" style={{ background: `${SEAT_COLORS.copilot}30`, borderColor: SEAT_COLORS.copilot }} />
          Copiloto
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border inline-block" style={{ background: `${SEAT_COLORS.window}30`, borderColor: SEAT_COLORS.window }} />
          Ventana
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border inline-block" style={{ background: `${SEAT_COLORS.middle}30`, borderColor: SEAT_COLORS.middle }} />
          Central
        </span>
      </div>
    </div>
  );
}

// ─── BusMap — replica exacta del layout de SeatMapModal ──────────────────────
function BusMap({
  seats, floor, vehicleType, editingId, onToggle, onStartEdit, onLabelChange, onFinishEdit,
}: {
  seats: SeatDef[];
  floor: number;
  vehicleType: string;
  editingId: string | null;
  onToggle: (id: string) => void;
  onStartEdit: (id: string) => void;
  onLabelChange: (id: string, val: string) => void;
  onFinishEdit: () => void;
}) {
  const floorSeats = seats.filter(s => s.floor === floor);
  if (floorSeats.length === 0) return null;

  // ── AUTO: usar layout realista de sedan ───────────────────────────────────
  if (vehicleType === "AUTO") {
    return (
      <AutoMap
        seats={seats}
        editingId={editingId}
        onToggle={onToggle}
        onStartEdit={onStartEdit}
        onLabelChange={onLabelChange}
        onFinishEdit={onFinishEdit}
      />
    );
  }

  const isTwoDeck = vehicleType === "BUS_2P";

  function renderSeat(seat: SeatDef | undefined, key: string) {
    if (!seat) return <div key={key} style={{ width: 44, height: 44 }} className="flex-shrink-0" />;
    return (
      <SeatCell
        key={seat.id}
        seat={seat}
        editingId={editingId}
        onToggle={onToggle}
        onStartEdit={onStartEdit}
        onLabelChange={onLabelChange}
        onFinishEdit={onFinishEdit}
      />
    );
  }

  // ── Piso 1 del BUS_2P: 3 filas × 4 cols (igual que SeatMapModal) ──────────
  if (isTwoDeck && floor === 1) {
    const maxRow = Math.max(...floorSeats.map(s => s.row));
    const maxCol = Math.max(...floorSeats.map(s => s.col));
    const numCols = maxCol;

    return (
      <div className="flex flex-col items-center gap-2">
        <WheelRow cols={numCols} />
        <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
          style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
          <div className="flex items-stretch">
            <DriverCol />
            <div className="p-3 flex flex-col gap-2">
              {Array.from({ length: maxRow }, (_, ri) => {
                const rowSeats = floorSeats.filter(s => s.row === ri + 1);
                return (
                  <div key={ri}>
                    {ri === 1 && (
                      <div className="h-3 flex items-center mb-2">
                        <div className="w-full h-px opacity-20 bg-slate-500" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      {Array.from({ length: maxCol }, (_, ci) => {
                        const seat = rowSeats.find(s => s.col === ci + 1);
                        return renderSeat(seat, `r${ri}c${ci}`);
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <PostCol />
          </div>
        </div>
        <WheelRow cols={numCols} />
      </div>
    );
  }

  // ── Piso 2 / BUS_1P: 4 filas (A,B,C,D) × N cols ─────────────────────────
  // row=1→A, row=2→B, row=3→C, row=4→D
  const maxCol = Math.max(...floorSeats.map(s => s.col));

  const rowA = Array.from({ length: maxCol }, (_, ci) => floorSeats.find(s => s.row === 1 && s.col === ci + 1));
  const rowB = Array.from({ length: maxCol }, (_, ci) => floorSeats.find(s => s.row === 2 && s.col === ci + 1));
  const rowC = Array.from({ length: maxCol }, (_, ci) => floorSeats.find(s => s.row === 3 && s.col === ci + 1));
  const rowD = Array.from({ length: maxCol }, (_, ci) => floorSeats.find(s => s.row === 4 && s.col === ci + 1));

  return (
    <div className="flex flex-col items-center gap-2">
      <WheelRow cols={maxCol} />
      <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
        style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
        <div className="flex items-stretch">
          <DriverCol />
          <div className="p-3 flex flex-col gap-2">
            <div className="flex gap-2">{rowA.map((s, i) => renderSeat(s, `A${i}`))}</div>
            <div className="flex gap-2">{rowB.map((s, i) => renderSeat(s, `B${i}`))}</div>
            <div className="h-3 flex items-center">
              <div className="w-full h-px opacity-20 bg-slate-500" />
            </div>
            <div className="flex gap-2">{rowC.map((s, i) => renderSeat(s, `C${i}`))}</div>
            <div className="flex gap-2">{rowD.map((s, i) => renderSeat(s, `D${i}`))}</div>
          </div>
          <PostCol />
        </div>
      </div>
      <WheelRow cols={maxCol} />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
type SeatConfigEditorProps = {
  vehicleType: string;
  onChange: (template: SeatTemplate, capacity: number) => void;
  /** Template existente para cargar al editar un vehículo */
  value?: SeatTemplate | null;
};

export default function SeatConfigEditor({ vehicleType, onChange, value }: SeatConfigEditorProps) {
  const [template, setTemplate] = useState<SeatTemplate | null>(null);
  const [floor2Count, setFloor2Count] = useState(44);
  const [bus1pCount, setBus1pCount] = useState(44);
  const [minivanCount, setMinivanCount] = useState(12);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);

  // Cargar template existente cuando se abre el formulario de edición
  useEffect(() => {
    if (value && value.seats && value.seats.length > 0) {
      // Sincronizar contadores a partir del template guardado
      if (value.vehicleType === "BUS_2P") {
        const f2 = value.seats.filter(s => s.floor === 2).length;
        setFloor2Count(f2 > 0 ? f2 : 44);
      } else if (value.vehicleType === "BUS_1P") {
        setBus1pCount(value.totalSeats || 44);
      } else if (value.vehicleType === "MINIVAN") {
        setMinivanCount(value.totalSeats || 12);
      }
      setTemplate(value);
      // No llamamos onChange aquí para no sobrescribir el valor original al cargar
    } else {
      // Si no hay value (crear), resetear
      setTemplate(null);
      setExpanded(false);
    }
  }, [value]);

  const buildTemplate = useCallback((): SeatTemplate => {
    if (vehicleType === "BUS_2P") return buildBus2P(floor2Count);
    if (vehicleType === "BUS_1P") return buildBus1P(bus1pCount);
    if (vehicleType === "MINIVAN") return buildMinivan(minivanCount);
    return buildAuto();
  }, [vehicleType, floor2Count, bus1pCount, minivanCount]);

  const handleExpand = () => {
    if (!expanded) {
      // Si no hay template (ni cargado desde value, ni generado antes), generar uno nuevo
      if (!template) {
        const t = buildTemplate();
        setTemplate(t);
        onChange(t, t.totalSeats);
      } else {
        // Hay template existente (cargado desde value o generado previamente); notificar sin regenerar
        onChange(template, template.totalSeats);
      }
    }
    setExpanded(v => !v);
  };

  const regenerate = useCallback(() => {
    const t = buildTemplate();
    setTemplate(t);
    onChange(t, t.totalSeats);
  }, [buildTemplate, onChange]);

  const handleToggle = useCallback((id: string) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        seats: prev.seats.map(s => s.id === id ? { ...s, active: !s.active } : s),
      };
      updated.totalSeats = updated.seats.filter(s => s.active).length;
      onChange(updated, updated.totalSeats);
      return updated;
    });
  }, [onChange]);

  const handleLabelChange = useCallback((id: string, val: string) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const updated = { ...prev, seats: prev.seats.map(s => s.id === id ? { ...s, label: val } : s) };
      onChange(updated, updated.totalSeats);
      return updated;
    });
  }, [onChange]);

  const activeCount = template?.seats.filter(s => s.active).length ?? 0;
  const floor1Count = template?.seats.filter(s => s.floor === 1 && s.active).length ?? 0;
  const floor2ActiveCount = template?.seats.filter(s => s.floor === 2 && s.active).length ?? 0;

  const legend = [
    { color: SEAT_COLORS.window, label: "Ventana" },
    { color: SEAT_COLORS.aisle, label: "Pasillo" },
    { color: SEAT_COLORS.middle, label: "Central" },
    { color: "#475569", label: "Inactivo" },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-slate-400 font-medium">Configuración de Asientos</span>
          {template && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 font-bold">
              {activeCount} asientos
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleExpand}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
        >
          {expanded
            ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
            : <><ChevronDown className="w-4 h-4" /> {template ? "Editar mapa" : "Configurar asientos"}</>
          }
        </button>
      </div>

      {/* Panel expandible */}
      {expanded && (
        <div className="border border-indigo-500/20 rounded-2xl overflow-hidden"
          style={{ background: "rgba(99,102,241,0.04)" }}>

          {/* Controles de cantidad */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300 font-semibold">Configuración de capacidad</p>
              <button type="button" onClick={regenerate}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
                <RotateCcw className="w-3.5 h-3.5" /> Regenerar
              </button>
            </div>

            {vehicleType === "BUS_2P" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-white/8 bg-slate-900/40">
                  <p className="text-xs text-slate-500 mb-1">Piso 1 (fijo)</p>
                  <p className="text-2xl font-extrabold text-white">12</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">3 filas × 4 asientos</p>
                </div>
                <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                  <p className="text-xs text-slate-400 mb-1">Piso 2 (configurable)</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setFloor2Count(v => Math.max(4, v - 4))}
                      className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors flex items-center justify-center">−</button>
                    <input type="number" min={4} max={80} step={1} value={floor2Count}
                      onChange={e => setFloor2Count(Math.max(4, Math.min(80, +e.target.value)))}
                      className="w-14 bg-transparent text-center text-2xl font-extrabold text-white focus:outline-none" />
                    <button type="button" onClick={() => setFloor2Count(v => Math.min(80, v + 4))}
                      className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors flex items-center justify-center">+</button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Total: {12 + floor2Count} asientos</p>
                </div>
              </div>
            )}

            {vehicleType === "BUS_1P" && (
              <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                <p className="text-xs text-slate-400 mb-2">Total de asientos</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[36, 40, 44, 48, 52].map(n => (
                    <button key={n} type="button" onClick={() => setBus1pCount(n)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={bus1pCount === n
                        ? { background: "#6366f1", color: "white" }
                        : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }
                      }>{n}</button>
                  ))}
                  <input type="number" min={4} max={80} value={bus1pCount}
                    onChange={e => setBus1pCount(Math.max(4, Math.min(80, +e.target.value)))}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs text-center focus:outline-none"
                    placeholder="otro" />
                </div>
              </div>
            )}

            {vehicleType === "MINIVAN" && (
              <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                <p className="text-xs text-slate-400 mb-2">Total de asientos</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[8, 10, 12, 14, 16].map(n => (
                    <button key={n} type="button" onClick={() => setMinivanCount(n)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={minivanCount === n
                        ? { background: "#6366f1", color: "white" }
                        : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }
                      }>{n}</button>
                  ))}
                  <input type="number" min={4} max={30} value={minivanCount}
                    onChange={e => setMinivanCount(Math.max(4, Math.min(30, +e.target.value)))}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs text-center focus:outline-none"
                    placeholder="otro" />
                </div>
              </div>
            )}

            {vehicleType === "AUTO" && (
              <div className="p-3 rounded-xl border border-white/8 bg-slate-900/40">
                <p className="text-xs text-slate-500">Auto: 4 asientos fijos (copiloto + 3 pasajeros)</p>
              </div>
            )}
          </div>

          {/* Selector de piso (BUS_2P) */}
          {vehicleType === "BUS_2P" && template && (
            <div className="flex border-b border-white/5">
              {([1, 2] as const).map(f => (
                <button key={f} type="button" onClick={() => setActiveFloor(f)}
                  className="flex-1 py-2.5 text-xs font-semibold transition-all"
                  style={activeFloor === f
                    ? { background: "rgba(99,102,241,0.15)", color: "#818cf8", borderBottom: "2px solid #6366f1" }
                    : { color: "#64748b" }
                  }>
                  <Layers className="w-3.5 h-3.5 inline mr-1.5" />
                  Piso {f} — {f === 1 ? floor1Count : floor2ActiveCount} asientos
                </button>
              ))}
            </div>
          )}

          {/* Mapa visual */}
          {template && (
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
                <Pencil className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  <strong>Clic</strong> en un asiento para activar/desactivar.
                  Pasa el cursor y haz clic en el <strong>lápiz</strong> para editar la etiqueta.
                </p>
              </div>

              <div className="overflow-x-auto">
                <BusMap
                  seats={template.seats}
                  floor={vehicleType === "BUS_2P" ? activeFloor : 1}
                  vehicleType={vehicleType}
                  editingId={editingId}
                  onToggle={handleToggle}
                  onStartEdit={setEditingId}
                  onLabelChange={handleLabelChange}
                  onFinishEdit={() => setEditingId(null)}
                />
              </div>

              {/* Leyenda */}
              <div className="flex flex-wrap gap-3 pt-1">
                {legend.map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border" style={{ background: `${l.color}30`, borderColor: l.color }} />
                    <span className="text-[10px] text-slate-500">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300 font-medium">Configuración lista</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-400">{activeCount} asientos activos</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resumen colapsado */}
      {!expanded && template && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 font-medium">
              {vehicleType === "BUS_2P"
                ? `Piso 1: 12 asientos + Piso 2: ${floor2ActiveCount} asientos`
                : `${activeCount} asientos configurados`}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Haz clic en "Editar mapa" para modificar</p>
          </div>
          <span className="text-lg font-extrabold text-white">{activeCount}</span>
        </div>
      )}

      {/* Sin configurar */}
      {!expanded && !template && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/20">
          <Settings2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            Haz clic en <strong className="text-slate-400">"Configurar asientos"</strong> para diseñar el mapa.
            Si no configuras, se usará la plantilla predeterminada.
          </p>
        </div>
      )}
    </div>
  );
}
