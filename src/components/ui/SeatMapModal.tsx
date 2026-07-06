"use client";

import { useState, useEffect, useCallback, useMemo, memo, type ReactNode } from "react";
import {
  X, CheckCircle2, AlertCircle, Loader2,
  Banknote, CreditCard, ArrowRight, Pencil, Package, TicketCheck, Save, RotateCcw,
  Users, RefreshCw, MapPin, Printer, Search
} from "lucide-react";
import { getCurrentUser, authFetch } from "@/lib/auth";
import { calcTripPrice, API_URL } from "@/lib/config";
import { useCreateBooking, useTripManifest } from "@/lib/queries/trips";
import { getParcelsByTrip, updateParcelStatus } from "@/lib/api/parcels";
import TicketModal from "@/components/trips/TicketModal";
import ParcelModal from "@/components/trips/ParcelModal";
import { printPassengerManifest, printParcelManifest } from "@/lib/printUtils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Waypoint = {
  id: string;
  stopOrder: number;
  basePrice: number;
  basePriceFloor1?: number | null;
  station: { id: string; name: string; city: string };
};

type ManifestParcel = {
  id: string;
  senderName: string;
  senderDoc: string;
  receiverName: string;
  receiverDoc: string;
  description: string | null;
  weightKg: number | null;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  startWaypoint: { station: { name: string } };
  endWaypoint: { station: { name: string } };
  seller?: { id: string; name: string; email: string; role: string } | null;
};

type SeatMapModalProps = {
  open: boolean;
  onClose: () => void;
  tripId: string;
  vehicleType: string;
  vehicleCapacity: number;
  seatTemplate: any;
  occupiedSeats: string[];
  waypoints: Waypoint[];
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  companyLogoUrl?: string;
  companyRuc?: string;
  routeName: string;
  departureTime: string;
  plateNumber?: string;
  onSaleSuccess?: (receipt: any) => void;
};

// ─── Helpers (fuera del componente para no recrearse) ─────────────────────────
function calcPrice(waypoints: Waypoint[], startId: string, endId: string, floor: 1 | 2 = 2): number {
  const startWp = waypoints.find(w => w.id === startId);
  const endWp = waypoints.find(w => w.id === endId);
  if (!startWp || !endWp) return 0;
  let price = 0;
  for (const wp of waypoints) {
    if (wp.stopOrder > startWp.stopOrder && wp.stopOrder <= endWp.stopOrder) {
      const segmentPrice =
        floor === 1 && wp.basePriceFloor1 != null
          ? Number(wp.basePriceFloor1)
          : Number(wp.basePrice);
      price += segmentPrice;
    }
  }
  return price;
}

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// Precalcular color oscuro una sola vez por color
const darkenCache = new Map<string, string>();
function darkenColor(hex: string, amt = 55): string {
  const key = `${hex}-${amt}`;
  if (darkenCache.has(key)) return darkenCache.get(key)!;
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amt);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amt);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amt);
  const result = `rgb(${r},${g},${b})`;
  darkenCache.set(key, result);
  return result;
}

function buildDefaultLabels(isTwoDeck: boolean, capacity: number): Record<string, string> {
  const labels: Record<string, string> = {};
  const total = isTwoDeck ? 66 : capacity;
  for (let i = 1; i <= total; i++) labels[`S${i}`] = String(i);
  return labels;
}

const parcelStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  RECEIVED:         { label: "Recibido",     color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  IN_TRANSIT:       { label: "En tránsito",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  READY_FOR_PICKUP: { label: "Para retirar", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  DELIVERED:        { label: "Entregado",    color: "#10b981", bg: "rgba(16,185,129,0.12)" },
};

// ─── Icono de asiento (memoizado) ────────────────────────────────────────────
const SeatIcon = memo(function SeatIcon({
  color, label, size = 68,
}: { color: string; label: string; size?: number }) {
  const baseW = size;
  const baseH = Math.round(size * 1.15);
  const border = darkenColor(color);
  const shadow = `${color}55`;
  const fs = size <= 30 ? 7 : size <= 44 ? 9 : size <= 60 ? 11 : size <= 76 ? 13 : 15;
  const backH = Math.round(baseH * 0.38);
  const seatH = Math.round(baseH * 0.46);
  const armW = Math.round(baseW * 0.10);
  const armH = Math.round(baseH * 0.34);
  const armTop = Math.round(baseH * 0.32);
  const textColor = isLight(color) ? "#1e293b" : "#fff";
  const r1 = Math.round(baseW * 0.2);
  const r2 = Math.round(baseW * 0.04);
  const r3 = Math.round(baseW * 0.18);

  return (
    <div className="relative flex-shrink-0 flex items-center justify-center"
      style={{ width: baseH, height: baseW }}>
      <div style={{
        width: baseW, height: baseH,
        transform: "rotate(90deg)",
        transformOrigin: "center center",
        position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{
          width: Math.round(baseW * 0.76), height: backH,
          background: color, border: `2px solid ${border}`,
          borderRadius: `${r1}px ${r1}px ${r2}px ${r2}px`,
          boxShadow: `0 3px 8px ${shadow}, inset 0 2px 0 rgba(255,255,255,0.3)`,
        }} />
        <div style={{
          width: Math.round(baseW * 0.86), height: seatH, marginTop: 2,
          background: color, border: `2px solid ${border}`,
          borderRadius: `${r2}px ${r2}px ${r3}px ${r3}px`,
          boxShadow: `0 4px 10px ${shadow}, inset 0 2px 0 rgba(255,255,255,0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {label ? (
            <span style={{
              fontSize: fs, fontWeight: 900, lineHeight: 1,
              color: textColor, userSelect: "none",
              transform: "rotate(-90deg)", display: "inline-block",
            }}>{label}</span>
          ) : null}
        </div>
        <div style={{
          position: "absolute", left: 0, top: armTop,
          width: armW, height: armH,
          background: color, border: `1.5px solid ${border}`,
          opacity: 0.85, borderRadius: armW / 2,
        }} />
        <div style={{
          position: "absolute", right: 0, top: armTop,
          width: armW, height: armH,
          background: color, border: `1.5px solid ${border}`,
          opacity: 0.85, borderRadius: armW / 2,
        }} />
      </div>
    </div>
  );
});

// ─── Rueda (estática, sin props dinámicas) ────────────────────────────────────
const Wheel = memo(function Wheel() {
  return (
    <svg width={32} height={32} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#475569" strokeWidth="2.5" fill="#1e293b" />
      <circle cx="14" cy="14" r="5" stroke="#475569" strokeWidth="1.5" fill="#0f172a" />
      <line x1="14" y1="1" x2="14" y2="9" stroke="#475569" strokeWidth="1.5" />
      <line x1="14" y1="19" x2="14" y2="27" stroke="#475569" strokeWidth="1.5" />
      <line x1="1" y1="14" x2="9" y2="14" stroke="#475569" strokeWidth="1.5" />
      <line x1="19" y1="14" x2="27" y2="14" stroke="#475569" strokeWidth="1.5" />
      <line x1="4" y1="4" x2="10" y2="10" stroke="#475569" strokeWidth="1" />
      <line x1="18" y1="18" x2="24" y2="24" stroke="#475569" strokeWidth="1" />
      <line x1="24" y1="4" x2="18" y2="10" stroke="#475569" strokeWidth="1" />
      <line x1="4" y1="24" x2="10" y2="18" stroke="#475569" strokeWidth="1" />
    </svg>
  );
});

const SteeringWheel = memo(function SteeringWheel() {
  return (
    <svg width={34} height={34} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="#64748b" strokeWidth="2.5" fill="none" />
      <circle cx="16" cy="16" r="4.5" fill="#64748b" />
      <line x1="16" y1="2" x2="16" y2="11.5" stroke="#64748b" strokeWidth="2" />
      <line x1="16" y1="20.5" x2="16" y2="30" stroke="#64748b" strokeWidth="2" />
      <line x1="2" y1="16" x2="11.5" y2="16" stroke="#64748b" strokeWidth="2" />
      <line x1="20.5" y1="16" x2="30" y2="16" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
});

// ─── Asiento individual (memoizado) ──────────────────────────────────────────
const SeatButton = memo(function SeatButton({
  id, label, isOcc, isSel, editMode, primaryColor, onSeatClick, onLabelChange,
}: {
  id: string; label: string; isOcc: boolean; isSel: boolean;
  editMode: boolean; primaryColor: string;
  onSeatClick: (id: string) => void;
  onLabelChange: (id: string, val: string) => void;
}) {
  const SZ = 68;
  const color = isOcc ? "#ef4444" : isSel ? primaryColor : "#22c55e";

  if (editMode) {
    return (
      <div className="flex-shrink-0 relative" style={{ width: Math.round(SZ * 1.15), height: SZ }}>
        <SeatIcon color="#22c55e" label={label} size={SZ} />
        <input
          value={label}
          onChange={e => onLabelChange(id, e.target.value)}
          maxLength={4}
          className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
          title={`Editar asiento ${id}`}
        />
        <div className="absolute bottom-0 right-0 bg-amber-400 rounded-full w-4 h-4 flex items-center justify-center pointer-events-none z-20">
          <Pencil className="w-2.5 h-2.5 text-black" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => !isOcc && onSeatClick(id)}
      disabled={isOcc}
      title={`Asiento ${label}${isOcc ? " — Ocupado" : ""}`}
      className={`flex-shrink-0 transition-transform duration-150 ${isOcc ? "cursor-not-allowed" : "cursor-pointer hover:scale-105"} ${isSel ? "scale-110 z-10" : ""}`}
      style={{ filter: isSel ? `drop-shadow(0 0 10px ${color})` : undefined }}>
      <SeatIcon color={color} label={label} size={SZ} />
    </button>
  );
});

// ─── Estilos compartidos de carrocería (mismo lenguaje visual que AutoSaleMap) ─
const GLASS_TINT = "linear-gradient(135deg, rgba(59,110,180,0.55), rgba(22,42,74,0.8))";
const WINDOW_STRIP_BG =
  "repeating-linear-gradient(90deg, rgba(30,41,59,0.45) 0px, rgba(30,41,59,0.45) 2px, rgba(226,232,240,0.18) 2px, rgba(226,232,240,0.18) 20px)";

/** Banda de ruedas superpuesta al borde de la carrocería (no flotando fuera de ella). */
const WheelBand = memo(function WheelBand({ position, compact = false }: { position: "top" | "bottom"; compact?: boolean }) {
  return (
    <div className={`absolute left-0 right-0 flex justify-between ${compact ? "px-6" : "px-9"} pointer-events-none z-10`}
      style={{ [position]: -13 }}>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
    </div>
  );
});

/** Franja decorativa de ventanas a lo largo del borde interior de la carrocería. */
const WindowStrip = memo(function WindowStrip({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div className="absolute left-3 right-3 h-[7px] rounded-full opacity-70 pointer-events-none"
      style={{ [edge]: 6, background: WINDOW_STRIP_BG }} />
  );
});

type ColVariant = "nose-round" | "nose-sharp" | "tail-square" | "tail-cut";

const DriverCol = memo(function DriverCol({ variant = "nose-round" }: { variant?: ColVariant }) {
  const sharp = variant === "nose-sharp";
  return (
    <div className="relative flex flex-col items-center justify-center border-r-2 border-slate-400/40 flex-shrink-0 overflow-hidden"
      style={{
        background: "linear-gradient(90deg,#8f9cb8,#aab5d0)",
        minWidth: 75, padding: "16px 10px",
        borderTopLeftRadius: sharp ? 10 : 26,
        borderBottomLeftRadius: sharp ? 10 : 26,
      }}>
      {/* Parabrisas / vidrio delantero */}
      <div className="absolute inset-1.5 rounded-lg" style={{ background: GLASS_TINT, opacity: 0.9 }} />
      <div className="relative"><SteeringWheel /></div>
      <span className="relative text-[8px] font-bold text-slate-100/90 uppercase tracking-wider mt-2"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
        Conductor
      </span>
    </div>
  );
});

const PostCol = memo(function PostCol({ variant = "tail-square" }: { variant?: ColVariant }) {
  const cut = variant === "tail-cut";
  return (
    <div className="relative flex flex-col items-center justify-center border-l-2 border-slate-400/40 flex-shrink-0 overflow-hidden"
      style={{
        background: "linear-gradient(90deg,#aab5d0,#8f9cb8)",
        minWidth: cut ? 30 : 34, padding: "16px 6px",
        borderTopRightRadius: cut ? 8 : 18,
        borderBottomRightRadius: cut ? 8 : 18,
        clipPath: cut ? "polygon(0 0, 100% 12%, 100% 88%, 0 100%)" : undefined,
      }}>
      <div className="absolute inset-1 rounded-md" style={{ background: GLASS_TINT, opacity: 0.75 }} />
      <span className="relative text-[8px] font-bold text-slate-100/90 uppercase tracking-wider"
        style={{ writingMode: "vertical-rl", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Post.</span>
    </div>
  );
});

// ─── AutoSaleMap — Vista de planta del auto para venta de pasajes ─────────────
// Layout idéntico al de SeatConfigEditor: Copiloto arriba-izq, Chofer abajo-izq,
// Asientos 2,3,4 en COLUMNA a la derecha. Responsive para móvil.
const AutoSaleMap = memo(function AutoSaleMap({
  occupied, selectedSeat, onSeatClick, primaryColor, editMode, seatLabels, onLabelChange, seatTemplate,
}: {
  occupied: string[]; selectedSeat: string;
  onSeatClick: (id: string) => void;
  primaryColor: string;
  editMode: boolean;
  seatLabels: Record<string, string>;
  onLabelChange: (id: string, val: string) => void;
  seatTemplate?: any;
}) {
  const occupiedSet = useMemo(() => new Set(occupied), [occupied]);

  // Extraer asientos del template
  const templateSeats: any[] = useMemo(() => {
    if (!seatTemplate) return [];
    const raw = Array.isArray(seatTemplate) ? seatTemplate : (seatTemplate.seats ?? []);
    return raw.filter((s: any) => s.active !== false);
  }, [seatTemplate]);

  // Copiloto (row=1) y traseros (row=2)
  const copilotSeat = templateSeats.find((s: any) => s.type === "copilot" || s.row === 1);
  const backSeats = templateSeats.filter((s: any) => s.row === 2).sort((a: any, b: any) => a.col - b.col);

  // Fallback si no hay template
  const allSeats = templateSeats.length > 0 ? templateSeats : [
    { id: "S1", row: 1, col: 2, type: "copilot", label: "1" },
    { id: "S2", row: 2, col: 1, type: "window", label: "2" },
    { id: "S3", row: 2, col: 2, type: "middle", label: "3" },
    { id: "S4", row: 2, col: 3, type: "window", label: "4" },
  ];
  const copilot = copilotSeat || allSeats[0];
  const backs = backSeats.length > 0 ? backSeats : allSeats.slice(1);

  function renderSeatBtn(seat: any, size = 52) {
    const id = seat.id;
    const label = seatLabels[id] ?? seat.label ?? id.replace(/\D/g, "");
    const isOcc = occupiedSet.has(id);
    const isSel = selectedSeat === id;
    return (
      <SeatButton
        key={id}
        id={id}
        label={label}
        isOcc={isOcc}
        isSel={isSel}
        editMode={editMode}
        primaryColor={primaryColor}
        onSeatClick={onSeatClick}
        onLabelChange={onLabelChange}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 select-none" style={{ width: "min(550px, 90vw)" }}>
      {/* Contenedor responsive: ancho definido (evita colapso dentro de padres display:inline-block/auto-width), aspect-ratio 420/200 */}
      <div className="relative w-full" style={{ aspectRatio: "420 / 200" }}>
        {/* SVG del auto — escala al 100% del contenedor */}
        <svg
          viewBox="0 0 420 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="bodyGradS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="roofGradS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="hoodGradS" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="trunkGradS" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <radialGradient id="wheelGradS" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="shadowS" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Ruedas */}
          {[72, 348].map(cx => [14, 186].map(cy => (
            <g key={`${cx}-${cy}`} transform={`translate(${cx}, ${cy})`}>
              <rect x="-14" y={cy < 100 ? "-8" : "-28"} width="28" height="36" rx="6" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
              <rect x="-9" y={cy < 100 ? "-3" : "-23"} width="18" height="26" rx="4" fill="url(#wheelGradS)" />
              <circle cx="0" cy={cy < 100 ? 10 : -10} r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            </g>
          )))}

          {/* Carrocería */}
          <path d="M38 30 Q20 30 14 50 L10 100 L14 150 Q20 170 38 170 L382 170 Q400 170 406 150 L410 100 L406 50 Q400 30 382 30 Z"
            fill="url(#bodyGradS)" stroke="#475569" strokeWidth="2" filter="url(#shadowS)" />

          {/* Capó */}
          <path d="M38 30 Q20 30 14 50 L10 100 L14 150 Q20 170 38 170 L100 170 L100 30 Z"
            fill="url(#hoodGradS)" stroke="#475569" strokeWidth="1.5" />
          <line x1="55" y1="38" x2="55" y2="162" stroke="#64748b" strokeWidth="1" opacity="0.4" />
          <line x1="75" y1="34" x2="75" y2="166" stroke="#64748b" strokeWidth="0.8" opacity="0.3" />

          {/* Parabrisas delantero */}
          <path d="M100 38 L100 162 L130 155 L130 45 Z" fill="#1e3a5f" stroke="#334155" strokeWidth="1.5" opacity="0.85" />
          <path d="M104 50 L104 90 L112 88 L112 52 Z" fill="white" opacity="0.06" />

          {/* Techo/cabina */}
          <rect x="130" y="30" width="160" height="140" rx="4" fill="url(#roofGradS)" stroke="#334155" strokeWidth="1" />
          <line x1="130" y1="100" x2="290" y2="100" stroke="#475569" strokeWidth="1" strokeDasharray="6,4" opacity="0.4" />

          {/* Vidrio trasero */}
          <path d="M290 45 L290 155 L320 162 L320 38 Z" fill="#1e3a5f" stroke="#334155" strokeWidth="1.5" opacity="0.85" />

          {/* Maletero */}
          <path d="M320 30 L382 30 Q400 30 406 50 L410 100 L406 150 Q400 170 382 170 L320 170 Z"
            fill="url(#trunkGradS)" stroke="#475569" strokeWidth="1.5" />
          <line x1="365" y1="38" x2="365" y2="162" stroke="#64748b" strokeWidth="1" opacity="0.4" />
          <line x1="345" y1="34" x2="345" y2="166" stroke="#64748b" strokeWidth="0.8" opacity="0.3" />

          {/* Faros delanteros */}
          <path d="M10 42 Q8 50 10 62 L22 58 L22 46 Z" fill="#fbbf24" opacity="0.9" />
          <path d="M10 138 Q8 150 10 158 L22 154 L22 142 Z" fill="#fbbf24" opacity="0.9" />
          <rect x="10" y="68" width="12" height="64" rx="3" fill="#fef3c7" opacity="0.3" />

          {/* Faros traseros */}
          <path d="M410 42 Q412 50 410 62 L398 58 L398 46 Z" fill="#ef4444" opacity="0.9" />
          <path d="M410 138 Q412 150 410 158 L398 154 L398 142 Z" fill="#ef4444" opacity="0.9" />
          <rect x="398" y="68" width="12" height="64" rx="3" fill="#fecaca" opacity="0.3" />

          {/* Espejos */}
          <path d="M108 30 L108 22 Q118 18 128 22 L128 30 Z" fill="#334155" stroke="#475569" strokeWidth="1" />
          <path d="M108 170 L108 178 Q118 182 128 178 L128 170 Z" fill="#334155" stroke="#475569" strokeWidth="1" />

          {/* Líneas de puertas */}
          <line x1="210" y1="30" x2="210" y2="170" stroke="#64748b" strokeWidth="1.5" opacity="0.5" />
          <rect x="162" y="34" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />
          <rect x="162" y="161" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />
          <rect x="240" y="34" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />
          <rect x="240" y="161" width="18" height="5" rx="2.5" fill="#64748b" opacity="0.8" />

          {/* Antena */}
          <line x1="260" y1="30" x2="260" y2="18" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <circle cx="260" cy="17" r="2" fill="#64748b" opacity="0.6" />

          {/* Etiquetas */}
          <text x="18" y="12" fontSize="8" fill="#64748b" fontFamily="monospace" opacity="0.7">◄ FRENTE</text>
          <text x="360" y="12" fontSize="8" fill="#64748b" fontFamily="monospace" opacity="0.7">ATRÁS ►</text>
        </svg>

        {/* ── Asientos superpuestos con posiciones porcentuales ── */}
        {/* Copiloto (1) — arriba izquierda de la cabina */}
        <div className="absolute" style={{ left: "31%", top: "10%" }}>
          {renderSeatBtn(copilot)}
        </div>

        {/* Chofer (volante) — abajo izquierda de la cabina */}
        <div className="absolute flex flex-col items-center" style={{ left: "32%", top: "55%" }}>
          <div className="rounded-lg border-2 border-slate-500/60 flex items-center justify-center"
            style={{ width: 48, height: 48, background: "rgba(100,116,139,0.25)" }}>
            <SteeringWheel />
          </div>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Chofer</span>
        </div>

        {/* Asientos traseros 2, 3, 4 — en COLUMNA a la derecha de la cabina */}
        <div className="absolute flex flex-col gap-0" style={{ left: "52%", top: "5%" }}>
          {backs.map((s: any) => (
            <div key={s.id} className="flex flex-col items-center">
              {renderSeatBtn(s)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Bus renderer (memoizado) ─────────────────────────────────────────────────
const BusMap = memo(function BusMap({
  vehicleType, capacity, floor, occupied, selectedSeat, onSeatClick,
  primaryColor, editMode, seatLabels, onLabelChange, seatTemplate,
}: {
  vehicleType: string; capacity: number; floor: 1 | 2;
  occupied: string[]; selectedSeat: string;
  onSeatClick: (id: string) => void;
  primaryColor: string;
  editMode: boolean;
  seatLabels: Record<string, string>;
  onLabelChange: (id: string, val: string) => void;
  seatTemplate?: any;
}) {
  // ── AUTO: usar layout realista de sedan ─────────────────────────────────
  if (vehicleType === "AUTO") {
    return (
      <AutoSaleMap
        occupied={occupied}
        selectedSeat={selectedSeat}
        onSeatClick={onSeatClick}
        primaryColor={primaryColor}
        editMode={editMode}
        seatLabels={seatLabels}
        onLabelChange={onLabelChange}
        seatTemplate={seatTemplate}
      />
    );
  }

  const isTwoDeck = vehicleType === "BUS_2P";
  const SZ = 68;

  // Convertir occupied a Set para O(1) lookup
  const occupiedSet = useMemo(() => new Set(occupied), [occupied]);

  function renderSeat(id: string, labelOverride?: string) {
    const label = labelOverride ?? seatLabels[id] ?? id.replace(/\D/g, "");
    return (
      <SeatButton
        key={id}
        id={id}
        label={label}
        isOcc={occupiedSet.has(id)}
        isSel={selectedSeat === id}
        editMode={editMode}
        primaryColor={primaryColor}
        onSeatClick={onSeatClick}
        onLabelChange={onLabelChange}
      />
    );
  }

  // ── Extraer asientos del seatTemplate para el piso actual ─────────────────
  // seatTemplate puede ser: { seats: SeatDef[] } o SeatDef[] directamente
  const templateSeats: any[] = useMemo(() => {
    if (!seatTemplate) return [];
    const raw = Array.isArray(seatTemplate) ? seatTemplate : (seatTemplate.seats ?? []);
    return raw.filter((s: any) => s.floor === floor && s.active !== false);
  }, [seatTemplate, floor]);

  const hasTemplate = templateSeats.length > 0;

  // ── Piso 1 del BUS_2P ─────────────────────────────────────────────────────
  if (isTwoDeck && floor === 1) {
    if (hasTemplate) {
      // Usar seatTemplate: agrupar por fila
      const maxRow = Math.max(...templateSeats.map((s: any) => s.row));
      const maxCol = Math.max(...templateSeats.map((s: any) => s.col));
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="relative rounded-2xl border-2 border-slate-400/50 overflow-hidden"
              style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
              <WindowStrip edge="top" />
              <div className="flex items-stretch">
                <DriverCol variant="nose-sharp" />
                <div className="p-4 flex flex-col gap-2">
                  {Array.from({ length: maxRow }, (_, ri) => {
                    const rowSeats = templateSeats.filter((s: any) => s.row === ri + 1);
                    return (
                      <div key={ri}>
                        {ri === 1 && (
                          <div className="h-4 flex items-center mb-2">
                            <div className="w-full h-px opacity-20 bg-slate-500" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          {Array.from({ length: maxCol }, (_, ci) => {
                            const seat = rowSeats.find((s: any) => s.col === ci + 1);
                            if (!seat) return <div key={ci} style={{ width: Math.round(SZ * 1.15), height: SZ }} className="flex-shrink-0" />;
                            return renderSeat(seat.id, seatLabels[seat.id] ?? seat.label ?? seat.id.replace(/\D/g, ""));
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <PostCol variant="tail-cut" />
              </div>
              <WindowStrip edge="bottom" />
            </div>
            <WheelBand position="top" />
            <WheelBand position="bottom" />
          </div>
        </div>
      );
    }

    // Fallback hardcodeado
    const rows = [
      ["S1", "S2", "S3", "S4"],
      ["S5", "S6", "S7", "S8"],
      ["S9", "S10", "S11", "S12"],
    ];
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="relative rounded-2xl border-2 border-slate-400/50 overflow-hidden"
            style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
            <WindowStrip edge="top" />
            <div className="flex items-stretch">
              <DriverCol variant="nose-sharp" />
              <div className="p-4 flex flex-col gap-2">
                {rows.map((row, ri) => (
                  <div key={ri}>
                    {ri === 1 && (
                      <div className="h-4 flex items-center mb-2">
                        <div className="w-full h-px opacity-20 bg-slate-500" />
                      </div>
                    )}
                    <div className="flex gap-2">{row.map(id => renderSeat(id))}</div>
                  </div>
                ))}
              </div>
              <PostCol variant="tail-cut" />
            </div>
            <WindowStrip edge="bottom" />
          </div>
          <WheelBand position="top" />
          <WheelBand position="bottom" />
        </div>
      </div>
    );
  }

  // ── Piso 2 / BUS_1P: 4 filas (A,B,C,D) × N cols ─────────────────────────
  if (hasTemplate) {
    // Usar seatTemplate: row=1→A, row=2→B, row=3→C, row=4→D
    const maxCol = Math.max(...templateSeats.map((s: any) => s.col));
    const getRow = (rowNum: number) =>
      Array.from({ length: maxCol }, (_, ci) => templateSeats.find((s: any) => s.row === rowNum && s.col === ci + 1));

    function renderTemplateRow(rowSeats: (any | undefined)[], key: string) {
      return (
        <div key={key} className="flex gap-2">
          {rowSeats.map((seat, ci) =>
            seat
              ? renderSeat(seat.id, seatLabels[seat.id] ?? seat.label ?? seat.id.replace(/\D/g, ""))
              : <div key={`empty-${ci}`} style={{ width: Math.round(SZ * 1.15), height: SZ }} className="flex-shrink-0" />
          )}
        </div>
      );
    }

    const isMinivan = vehicleType === "MINIVAN";
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className={`relative ${isMinivan ? "rounded-2xl" : "rounded-3xl"} border-2 border-slate-400/50 overflow-hidden`}
            style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
            <WindowStrip edge="top" />
            <div className="flex items-stretch">
              <DriverCol variant={isMinivan ? "nose-sharp" : "nose-round"} />
              <div className="p-4 flex flex-col gap-2">
                {renderTemplateRow(getRow(1), "A")}
                {renderTemplateRow(getRow(2), "B")}
                <div className="h-4 flex items-center">
                  <div className="w-full h-px opacity-20 bg-slate-500" />
                </div>
                {renderTemplateRow(getRow(3), "C")}
                {renderTemplateRow(getRow(4), "D")}
              </div>
              <PostCol variant={isMinivan ? "tail-cut" : "tail-square"} />
            </div>
            <WindowStrip edge="bottom" />
          </div>
          <WheelBand position="top" compact={isMinivan} />
          <WheelBand position="bottom" compact={isMinivan} />
        </div>
      </div>
    );
  }

  // ── Fallback hardcodeado (sin seatTemplate) ───────────────────────────────
  const total = isTwoDeck ? 54 : capacity;
  const start = isTwoDeck ? 13 : 1;
  const cols = Math.ceil(total / 4);

  const rowA: string[] = [];
  const rowB: string[] = [];
  const rowC: string[] = [];
  const rowD: string[] = [];

  let n = start;
  for (let c = 0; c < cols; c++) {
    rowA.push(n < start + total ? `S${n++}` : "");
    rowB.push(n < start + total ? `S${n++}` : "");
    rowC.push(n < start + total ? `S${n++}` : "");
    rowD.push(n < start + total ? `S${n++}` : "");
  }

  function renderRow(row: string[], key: string) {
    return (
      <div key={key} className="flex gap-2">
        {row.map((id, ci) =>
          id
            ? renderSeat(id)
            : <div key={`empty-${ci}`} style={{ width: Math.round(SZ * 1.15), height: SZ }} className="flex-shrink-0" />
        )}
      </div>
    );
  }

  const isMinivanFallback = vehicleType === "MINIVAN";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className={`relative ${isMinivanFallback ? "rounded-2xl" : "rounded-3xl"} border-2 border-slate-400/50 overflow-hidden`}
          style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
          <WindowStrip edge="top" />
          <div className="flex items-stretch">
            <DriverCol variant={isMinivanFallback ? "nose-sharp" : "nose-round"} />
            <div className="p-4 flex flex-col gap-2">
              {renderRow(rowA, "A")}
              {renderRow(rowB, "B")}
              <div className="h-4 flex items-center">
                <div className="w-full h-px opacity-20 bg-slate-500" />
              </div>
              {renderRow(rowC, "C")}
              {renderRow(rowD, "D")}
            </div>
            <PostCol variant={isMinivanFallback ? "tail-cut" : "tail-square"} />
          </div>
          <WindowStrip edge="bottom" />
        </div>
        <WheelBand position="top" compact={isMinivanFallback} />
        <WheelBand position="bottom" compact={isMinivanFallback} />
      </div>
    </div>
  );
});

// ─── Tipos para pasajeros en el sidebar ──────────────────────────────────────
type ManifestPassenger = {
  id: string;
  seatId: string;
  name: string;
  document: string;
  origin: string;
  destination: string;
  paymentStatus: string;
  paymentMethod: string;
  price?: number;
  createdAt?: string;
  seller?: { id: string; name: string; email: string; role: string } | null;
};

// ─── Modal de venta ───────────────────────────────────────────────────────────
function SaleModal({
  open, onClose, seatId, seatLabel, tripId, waypoints,
  primaryColor, secondaryColor, price, onSuccess, seatFloor,
  companyName, companyLogoUrl, companyRuc, departureTime, origin, destination,
}: {
  open: boolean; onClose: () => void; seatId: string; seatLabel: string; tripId: string;
  waypoints: Waypoint[]; primaryColor: string; secondaryColor: string;
  price: number; onSuccess: (booking: any) => void;
  /** Piso del asiento seleccionado (1 = piso 1/VIP, 2 = piso 2/estándar, 0 = no aplica) */
  seatFloor: 0 | 1 | 2;
  companyName: string; companyLogoUrl?: string; companyRuc?: string;
  departureTime: string; origin: string; destination: string;
}) {
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("DNI");
  const [docNum, setDocNum] = useState("");
  const [phone, setPhone] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "digital">("cash");
  const [startWpId, setStartWpId] = useState(waypoints[0]?.id || "");
  const [endWpId, setEndWpId] = useState(waypoints[waypoints.length - 1]?.id || "");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<any>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savedDoc, setSavedDoc] = useState("");
  const [savedStartWpId, setSavedStartWpId] = useState("");
  const [savedEndWpId, setSavedEndWpId] = useState("");
  const createBooking = useCreateBooking(tripId);

  const [searchingDoc, setSearchingDoc] = useState(false);

  const handleLookup = useCallback(async (type: string, num: string) => {
    const cleanNum = num.trim();
    if (!cleanNum) return;
    setSearchingDoc(true);
    try {
      const res = await authFetch(`${API_URL}/api/v1/bookings/passenger/lookup?docType=${type}&docNum=${cleanNum}`);
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          setName(data.name);
          if (data.phone) setPhone(data.phone);
        }
      }
    } catch (err) {
      console.error("Error looking up passenger:", err);
    } finally {
      setSearchingDoc(false);
    }
  }, [setName, setPhone]);

  // Auto-trigger lookup
  useEffect(() => {
    const cleanNum = docNum.trim();
    if (docType === "DNI" && cleanNum.length === 8) {
      handleLookup("DNI", cleanNum);
    } else if (docType === "RUC" && cleanNum.length === 11) {
      handleLookup("RUC", cleanNum);
    }
  }, [docNum, docType, handleLookup]);

  useEffect(() => {
    if (open) {
      setName(""); setDocNum(""); setPhone(""); setError(""); setReceipt(null);
      setStartWpId(waypoints[0]?.id || "");
      setEndWpId(waypoints[waypoints.length - 1]?.id || "");
    }
  }, [open, seatId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const floor = seatFloor === 1 ? 1 : 2;
  const tramePrice = calcPrice(waypoints, startWpId, endWpId, floor);
  const displayPrice = tramePrice > 0 ? tramePrice.toFixed(2) : price.toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !docNum.trim()) { setError("Nombre y documento son obligatorios."); return; }
    if (startWpId === endWpId) { setError("El origen y destino deben ser diferentes."); return; }
    setError("");
    const body: any = {
      tripId, passengerName: name.trim(), passengerDocType: docType,
      passengerDocNum: docNum.trim(), startWaypointId: startWpId,
      endWaypointId: endWpId, seatId,
    };
    if (payMethod === "digital") body.paymentDetails = { method: "YAPE", phoneNumber: phone };
    try {
      const data = await createBooking.mutateAsync({ method: payMethod, body });
      // Guardar datos del pasajero para el ticket antes de limpiar el form
      setSavedName(name.trim());
      setSavedDoc(docNum.trim());
      setSavedStartWpId(startWpId);
      setSavedEndWpId(endWpId);
      setReceipt(data.booking);
      setTicketOpen(true); // Mostrar ticket inmediatamente
      onSuccess(data.booking);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "#0f172a" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8"
          style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}15)` }}>
          <div>
            <h2 className="text-white font-bold text-base">Vender Pasaje</h2>
            <p className="text-xs mt-0.5" style={{ color: primaryColor }}>
              Asiento <strong>{seatLabel}</strong> — S/ {displayPrice}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {receipt ? (
          <>
            <div className="p-6 space-y-4">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(16,185,129,0.15)", border: "2px solid #10b981" }}>
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">¡Venta Exitosa!</h3>
                <p className="text-slate-400 text-sm mt-1">Pasaje registrado correctamente</p>
              </div>
              <div className="space-y-2 p-4 rounded-xl border border-white/8 bg-slate-900/60">
                {[
                  { label: "Asiento", value: seatLabel },
                  { label: "Total cobrado", value: `S/ ${Number(receipt.totalPrice).toFixed(2)}`, color: "#10b981" },
                  { label: "Estado", value: receipt.paymentStatus },
                  { label: "ID Reserva", value: (receipt.id?.slice(0, 14) ?? "") + "...", mono: true },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-slate-500 text-xs">{item.label}</span>
                    <span className={`font-bold text-sm ${(item as any).mono ? "font-mono text-xs" : ""}`}
                      style={{ color: (item as any).color || "white" }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTicketOpen(true)}
                  className="py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
                  🎫 Ver Ticket
                </button>
                <button onClick={onClose}
                  className="py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  Cerrar
                </button>
              </div>
            </div>

            {/* Ticket modal */}
            <TicketModal
              open={ticketOpen}
              onClose={() => setTicketOpen(false)}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              ticket={{
                companyName,
                companyLogoUrl,
                companyRuc,
                origin: waypoints.find(w => w.id === savedStartWpId)?.station?.name || origin,
                destination: waypoints.find(w => w.id === savedEndWpId)?.station?.name || destination,
                departureTime,
                passengerName: savedName || receipt.passengerName || "",
                passengerDoc: savedDoc || receipt.passengerDocNum || "",
                seatId,
                seatLabel,
                bookingId: receipt.id || "",
                totalPrice: Number(receipt.totalPrice) || 0,
                paymentStatus: receipt.paymentStatus || "",
              }}
            />
          </>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {waypoints.length >= 2 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tramo del viaje</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Desde</p>
                    <select value={startWpId} onChange={e => setStartWpId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-xs focus:outline-none">
                      {waypoints.map(wp => <option key={wp.id} value={wp.id}>{wp.station.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Hasta</p>
                    <select value={endWpId} onChange={e => setEndWpId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-xs focus:outline-none">
                      {waypoints.map(wp => <option key={wp.id} value={wp.id}>{wp.station.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-slate-400 text-xs">Precio del tramo</span>
                  <span className="font-extrabold text-xl" style={{ color: primaryColor }}>
                    S/ {tramePrice > 0 ? tramePrice.toFixed(2) : price.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* ── BUSCADOR DNI / RUC ─────────────────────────────────── */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
                border: "1.5px solid rgba(99,102,241,0.35)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.10)"
              }}>

              {/* Título */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.25)" }}>
                  <Search className="w-4 h-4" style={{ color: "#818cf8" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Buscar pasajero</p>
                  <p className="text-xs" style={{ color: "#a5b4fc" }}>Ingresa DNI o RUC para auto-completar</p>
                </div>
              </div>

              {/* Fila selector + número (botón embebido dentro del input) */}
              <div className="flex gap-2">
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="rounded-xl px-2 py-3 text-white text-sm font-semibold focus:outline-none flex-shrink-0"
                  style={{
                    background: "rgba(99,102,241,0.20)",
                    border: "1.5px solid rgba(99,102,241,0.40)",
                    width: "72px"
                  }}>
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="CE">CE</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>

                {/* Input + botón embebido — no desborda en móvil */}
                <div className="relative flex-1">
                  <input value={docNum} onChange={e => setDocNum(e.target.value)}
                    placeholder={docType === "DNI" ? "12345678" : docType === "RUC" ? "20123456789" : "Número de documento"}
                    className="w-full rounded-xl pl-4 pr-12 py-3 text-white text-sm font-medium placeholder-slate-500 focus:outline-none transition-colors"
                    style={{
                      background: "rgba(15,23,42,0.60)",
                      border: "1.5px solid rgba(99,102,241,0.35)"
                    }} />
                  <button type="button" onClick={() => handleLookup(docType, docNum)}
                    disabled={!docNum.trim() || searchingDoc}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-40"
                    style={{
                      background: searchingDoc ? "rgba(99,102,241,0.30)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      boxShadow: searchingDoc ? "none" : "0 2px 8px rgba(99,102,241,0.50)"
                    }}>
                    {searchingDoc
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      : <Search className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>

              {/* Hint auto-búsqueda */}
              <p className="text-xs" style={{ color: "rgba(165,180,252,0.70)" }}>
                ✦ Se busca automáticamente al ingresar {docType === "DNI" ? "8" : docType === "RUC" ? "11" : "los"} dígitos
              </p>
            </div>

            {/* ── NOMBRE COMPLETO ────────────────────────────────────── */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre completo *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Juan Pérez García" required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Teléfono (opcional)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="987654321"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-2 block">Método de pago *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "cash", label: "Efectivo", icon: <Banknote className="w-4 h-4" /> },
                  { key: "digital", label: "Yape/Digital", icon: <CreditCard className="w-4 h-4" /> },
                ].map(opt => (
                  <button key={opt.key} type="button"
                    onClick={() => setPayMethod(opt.key as "cash" | "digital")}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all"
                    style={payMethod === opt.key
                      ? { background: `${primaryColor}25`, borderColor: primaryColor, color: primaryColor }
                      : { background: "rgba(255,255,255,0.04)", borderColor: "#334155", color: "#94a3b8" }}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button type="submit" disabled={createBooking.isPending}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 8px 24px ${primaryColor}40`,
              }}>
              {createBooking.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                : <><CheckCircle2 className="w-4 h-4" /> Confirmar Venta — S/ {displayPrice}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SeatMapModal({
  open, onClose, tripId, vehicleType, vehicleCapacity,
  seatTemplate,
  occupiedSeats: initialOccupied, waypoints, primaryColor, secondaryColor,
  companyName, companyLogoUrl, companyRuc, routeName, departureTime, plateNumber, onSaleSuccess,
}: SeatMapModalProps) {

  const isTwoDeck = vehicleType === "BUS_2P";

  // Inicializar labels solo una vez (useMemo con dependencias estables)
  const defaultLabels = useMemo(
    () => buildDefaultLabels(isTwoDeck, vehicleCapacity),
    [isTwoDeck, vehicleCapacity]
  );

  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [selectedSeatFloor, setSelectedSeatFloor] = useState<0 | 1 | 2>(0);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"pasajes" | "encomiendas" | "pasajeros" | "vendedores">("pasajes");
  const [editMode, setEditMode] = useState(false);
  const [seatLabels, setSeatLabels] = useState<Record<string, string>>(defaultLabels);

  // ─── Lista de pasajeros en sidebar — misma cache que el detalle del viaje;
  // vender un asiento aquí (o en cualquier otra pantalla que use este mismo
  // tripId) invalida esta consulta y ambos lados se refrescan solos.
  const {
    data: manifestData,
    isLoading: loadingPassengers,
    error: passengersQueryError,
    refetch: loadPassengers,
  } = useTripManifest(open ? tripId : undefined);
  const passengers: ManifestPassenger[] = manifestData?.passengers || [];
  const passengersError = passengersQueryError ? (passengersQueryError as Error).message : "";
  const occupied = useMemo(
    () => (manifestData?.passengers ? manifestData.passengers.map((p: ManifestPassenger) => p.seatId) : initialOccupied),
    [manifestData, initialOccupied]
  );

  // ─── Estado para lista de encomiendas en sidebar ──────────────────────────
  const [parcels, setParcels] = useState<ManifestParcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [parcelsError, setParcelsError] = useState("");
  const [parcelSearch, setParcelSearch] = useState("");
  const [parcelModalOpen, setParcelModalOpen] = useState(false);

  // Precio total (memoizado)
  const price = useMemo(
    () => calcPrice(waypoints, waypoints[0]?.id || "", waypoints[waypoints.length - 1]?.id || ""),
    [waypoints]
  );

  // Capacidad efectiva: el seatTemplate es la fuente de verdad de qué asientos
  // se renderizan realmente. vehicleCapacity (columna separada en la BD) puede
  // quedar desincronizada si se editó el número a mano, así que solo se usa
  // como fallback cuando no hay template.
  const effectiveCapacity = useMemo(() => {
    if (!seatTemplate) return vehicleCapacity;
    if (typeof seatTemplate.totalSeats === "number" && seatTemplate.totalSeats > 0) {
      return seatTemplate.totalSeats;
    }
    const raw = Array.isArray(seatTemplate) ? seatTemplate : (seatTemplate.seats ?? []);
    const activeCount = raw.filter((s: any) => s.active !== false).length;
    return activeCount > 0 ? activeCount : vehicleCapacity;
  }, [seatTemplate, vehicleCapacity]);

  const freeCount = effectiveCapacity - occupied.length;

  const handlePrintPassengers = () => {
    printPassengerManifest(
      {
        companyName,
        companyRuc,
        companyLogoUrl,
        routeName,
        departureTime,
        vehicleType,
        plateNumber,
      },
      passengers
    );
  };

  const handlePrintParcels = () => {
    printParcelManifest(
      {
        companyName,
        companyRuc,
        companyLogoUrl,
        routeName,
        departureTime,
        vehicleType,
        plateNumber,
      },
      parcels
    );
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSelectedSeat("");
      setSaleModalOpen(false);
      setEditMode(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Callbacks estables con useCallback
  const handleSeatClick = useCallback((id: string) => {
    if (editMode) return;
    setSelectedSeat(id);
    // Determinar el piso del asiento desde el seatTemplate
    if (seatTemplate) {
      const raw = Array.isArray(seatTemplate) ? seatTemplate : (seatTemplate.seats ?? []);
      const seatData = raw.find((s: any) => s.id === id);
      setSelectedSeatFloor((seatData?.floor as 0 | 1 | 2) ?? 0);
    } else {
      setSelectedSeatFloor(0);
    }
    setSaleModalOpen(true);
  }, [editMode, seatTemplate]);

  const handleLabelChange = useCallback((id: string, val: string) => {
    setSeatLabels(prev => ({ ...prev, [id]: val }));
  }, []);

  // ─── Carga de encomiendas ─────────────────────────────────────────────────
  const loadParcels = useCallback(async () => {
    if (!tripId) return;
    setLoadingParcels(true);
    setParcelsError("");
    try {
      const data = await getParcelsByTrip<any>(tripId);
      setParcels(data.parcels || []);
    } catch (e: any) {
      setParcelsError(e.message);
    } finally {
      setLoadingParcels(false);
    }
  }, [tripId]);

  // Cargar encomiendas cuando el modal está abierto para inicializar los contadores
  useEffect(() => {
    if (open) {
      loadParcels();
    }
  }, [open, loadParcels]);

  // Actualizar estado de encomienda
  const handleParcelStatusChange = async (parcelId: string, newStatus: string) => {
    try {
      await updateParcelStatus(parcelId, newStatus);
      setParcels(prev =>
        prev.map(p => (p.id === parcelId ? { ...p, status: newStatus } : p))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtrado de encomiendas
  const filteredParcels = useMemo(() => {
    if (!parcelSearch.trim()) return parcels;
    const q = parcelSearch.toLowerCase();
    return parcels.filter(p =>
      p.senderName.toLowerCase().includes(q) ||
      p.receiverName.toLowerCase().includes(q) ||
      p.senderDoc.toLowerCase().includes(q) ||
      p.receiverDoc.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }, [parcels, parcelSearch]);

  const handleSaleSuccess = useCallback((booking: any) => {
    // No cerrar el modal de venta aquí — el ticket se muestra dentro de SaleModal.
    // No hace falta actualizar "occupied" a mano: la mutación de venta ya invalidó
    // la consulta del manifiesto, así que se refresca sola con el dato real del servidor.
    onSaleSuccess?.(booking);
  }, [onSaleSuccess]);

  const handleSaveLabels = useCallback(() => setEditMode(false), []);

  const handleResetLabels = useCallback(() => {
    setSeatLabels(defaultLabels);
    setEditMode(false);
  }, [defaultLabels]);

  // Calcular conteos reales desde seatTemplate — SIEMPRE antes del early return
  const floor1Count = useMemo(() => {
    if (!seatTemplate) return 12;
    const raw = Array.isArray(seatTemplate) ? seatTemplate : (seatTemplate.seats ?? []);
    return raw.filter((s: any) => s.floor === 1 && s.active !== false).length;
  }, [seatTemplate]);

  const floor2Count = useMemo(() => {
    if (!seatTemplate) return 54;
    const raw = Array.isArray(seatTemplate) ? seatTemplate : (seatTemplate.seats ?? []);
    return raw.filter((s: any) => s.floor === 2 && s.active !== false).length;
  }, [seatTemplate]);

  // Determinar rol administrativo para mostrar pestaña de vendedores
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);
  const isAdminOrSuper = currentUser && ["ADMIN", "SUPER_ADMIN", "AGENCY_SELLER"].includes(currentUser.role);
  const isAdminOnly = currentUser && ["ADMIN", "SUPER_ADMIN"].includes(currentUser.role);

  if (!open) return null;

  const dep = new Date(departureTime);
  const origin = waypoints[0]?.station?.name || "";
  const destination = waypoints[waypoints.length - 1]?.station?.name || "";

  const busMapProps = {
    vehicleType, capacity: vehicleCapacity,
    occupied, selectedSeat, onSeatClick: handleSeatClick,
    primaryColor, editMode, seatLabels, onLabelChange: handleLabelChange,
    seatTemplate,
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#080d1a" }}>

      {/* ─── TOPBAR ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/8"
        style={{ background: "rgba(8,13,26,0.98)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
              <span className="truncate max-w-[80px] sm:max-w-[120px]">{origin}</span>
              <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-[120px]">{destination}</span>
              <span className="text-slate-500 text-[10px] ml-1 flex-shrink-0">
                {dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] mt-0.5">{freeCount} libres de {effectiveCapacity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-all"
              title="Editar numeración">
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar numeración</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={handleResetLabels}
                className="flex items-center justify-center p-1.5 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-800 transition-all"
                title="Restablecer">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSaveLabels}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
                style={{ background: "#10b981" }}
                title="Guardar">
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar</span>
              </button>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg sm:text-2xl font-extrabold leading-none" style={{ color: primaryColor }}>
              S/ {price > 0 ? price.toFixed(2) : "—"}
            </p>
            <span className="text-[9px] text-slate-500 block mt-0.5">por asiento</span>
          </div>
        </div>
      </div>

      <div className="lg:hidden flex-shrink-0 grid gap-1.5 px-3 py-2 border-b border-white/8"
        style={{
          background: "#080d1a",
          gridTemplateColumns: isAdminOrSuper ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))"
        }}>
      <button
        onClick={() => setSidebarMode("pasajes")}
        className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
        style={sidebarMode === "pasajes"
          ? { background: `${primaryColor}25`, color: primaryColor, border: `1px solid ${primaryColor}50` }
          : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
        <TicketCheck className="w-4 h-4" />
        <span>Venta</span>
      </button>
      <button
        onClick={() => setSidebarMode("pasajeros")}
        className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
        style={sidebarMode === "pasajeros"
          ? { background: "#6366f125", color: "#818cf8", border: "1px solid #6366f150" }
          : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
        <Users className="w-4 h-4" />
        <span>Pasajeros ({occupied.length})</span>
      </button>
      <button
        onClick={() => setSidebarMode("encomiendas")}
        className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
        style={sidebarMode === "encomiendas"
          ? { background: "#f59e0b25", color: "#f59e0b", border: "1px solid #f59e0b50" }
          : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
        <Package className="w-4 h-4" />
        <span>Encomiendas</span>
      </button>
      {isAdminOrSuper && (
        <button
          onClick={() => setSidebarMode("vendedores")}
          className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
          style={sidebarMode === "vendedores"
            ? { background: `${primaryColor}25`, color: primaryColor, border: `1px solid ${primaryColor}50` }
            : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
          <Users className="w-4 h-4" />
          <span>Vendedores</span>
        </button>
      )}
    </div>

      {/* ─── CUERPO ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── SIDEBAR IZQUIERDO (solo desktop — en movil se usa la tab bar de arriba) ── */}
        <div className="hidden lg:flex w-56 flex-shrink-0 border-r border-white/8 lg:flex-col"
          style={{ background: "#080d1a" }}>
          <div className="p-3 flex flex-col gap-2 border-b border-white/8">
            <button
              onClick={() => setSidebarMode("pasajes")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full"
              style={sidebarMode === "pasajes"
                ? { background: `${primaryColor}25`, color: primaryColor, border: `1px solid ${primaryColor}50` }
                : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
              <TicketCheck className="w-4 h-4 flex-shrink-0" />
              <span>Venta de Pasajes</span>
            </button>
            <button
              onClick={() => setSidebarMode("pasajeros")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full"
              style={sidebarMode === "pasajeros"
                ? { background: "#6366f125", color: "#818cf8", border: "1px solid #6366f150" }
                : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Pasajeros ({occupied.length})</span>
            </button>
            <button
              onClick={() => setSidebarMode("encomiendas")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full"
              style={sidebarMode === "encomiendas"
                ? { background: "#f59e0b25", color: "#f59e0b", border: "1px solid #f59e0b50" }
                : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
              <Package className="w-4 h-4 flex-shrink-0" />
              <span>Encomiendas ({parcels.length})</span>
            </button>
            {/* ── Botón Vendedores (solo ADMIN/SUPER_ADMIN) ── */}
            {isAdminOnly && (() => {
              // Contar vendedores únicos entre pasajeros y encomiendas
              const uniqueSellers = new Set<string>();
              passengers.forEach(p => uniqueSellers.add(p.seller?.id ?? "__sin_vendedor__"));
              parcels.forEach(p => uniqueSellers.add((p as any).seller?.id ?? "__sin_vendedor__"));
              const sellerCount = uniqueSellers.size;
              return (
                <button
                  onClick={() => setSidebarMode("vendedores")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full"
                  style={sidebarMode === "vendedores"
                    ? { background: `${primaryColor}25`, color: primaryColor, border: `1px solid ${primaryColor}50` }
                    : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Vendedores ({sellerCount})</span>
                </button>
              );
            })()}
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
            {/* ── Modo: Pasajes ── */}
            {sidebarMode === "pasajes" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Resumen</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Libres", value: freeCount, color: "#22c55e" },
                    { label: "Ocupados", value: occupied.length, color: "#ef4444" },
                    { label: "Reservados", value: 0, color: "#a855f7" },
                    { label: "Proceso", value: 0, color: "#06b6d4" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                      style={{ background: `${item.color}10` }}>
                      <span className="text-xs text-slate-400">{item.label}</span>
                      <span className="text-sm font-extrabold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/8">
                  <p className="text-xs text-slate-500 mb-1">Precio base</p>
                  <p className="text-lg font-extrabold" style={{ color: primaryColor }}>
                    S/ {price > 0 ? price.toFixed(2) : "—"}
                  </p>
                </div>

                {/* ── Mini resumen de vendedores (solo ADMIN/SUPER_ADMIN) ── */}
                {isAdminOnly && (() => {
                  const sellerMap = new Map<string, { name: string; tickets: number; parcelsCount: number }>();
                  passengers.forEach(p => {
                    const key = p.seller?.id ?? "__sin_vendedor__";
                    if (!sellerMap.has(key)) sellerMap.set(key, { name: p.seller?.name ?? "Sin vendedor", tickets: 0, parcelsCount: 0 });
                    sellerMap.get(key)!.tickets++;
                  });
                  parcels.forEach(p => {
                    const key = (p as any).seller?.id ?? "__sin_vendedor__";
                    if (!sellerMap.has(key)) sellerMap.set(key, { name: (p as any).seller?.name ?? "Sin vendedor", tickets: 0, parcelsCount: 0 });
                    sellerMap.get(key)!.parcelsCount++;
                  });
                  const stats = Array.from(sellerMap.values()).sort((a, b) => (b.tickets + b.parcelsCount) - (a.tickets + a.parcelsCount));
                  if (stats.length === 0) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-white/8">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Vendedores</p>
                        <button
                          onClick={() => setSidebarMode("vendedores")}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${primaryColor}20`, color: primaryColor }}>
                          Ver detalle
                        </button>
                      </div>
                      <div className="space-y-1">
                        {stats.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-extrabold text-white"
                              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                              {s.name !== "Sin vendedor" ? s.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <p className="text-[10px] text-white font-semibold flex-1 truncate">{s.name}</p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-[9px] font-bold" style={{ color: primaryColor }}>🎫{s.tickets}</span>
                              <span className="text-[9px] text-slate-600">·</span>
                              <span className="text-[9px] font-bold text-amber-400">📦{s.parcelsCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Modo: Pasajeros ── */}
            {sidebarMode === "pasajeros" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pasajeros ({passengers.length})</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrintPassengers}
                      disabled={loadingPassengers || passengers.length === 0}
                      className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                      title="Imprimir Manifiesto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => loadPassengers()}
                      disabled={loadingPassengers}
                      className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                      title="Actualizar"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPassengers ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {loadingPassengers && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                )}

                {passengersError && !loadingPassengers && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {passengersError}
                  </div>
                )}

                {!loadingPassengers && !passengersError && passengers.length === 0 && (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Sin pasajeros aún</p>
                  </div>
                )}

                {!loadingPassengers && passengers.length > 0 && (
                  <div className="space-y-1.5">
                    {passengers.map((p) => {
                      const isPaid = p.paymentStatus === "PAID_DIGITAL" || p.paymentStatus === "PAID";
                      return (
                        <div
                          key={p.id}
                          className="rounded-lg p-2 border border-white/5 hover:border-white/10 transition-all"
                          style={{ background: "rgba(255,255,255,0.03)" }}
                        >
                          <div className="flex items-center gap-2">
                            {/* Badge asiento */}
                            <div
                              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-extrabold text-[10px]"
                              style={{
                                background: `${primaryColor}25`,
                                color: primaryColor,
                                border: `1px solid ${primaryColor}40`,
                              }}
                            >
                              {p.seatId.replace(/\D/g, "")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                              <p className="text-slate-500 text-[10px] truncate">{p.document}</p>
                            </div>
                            {/* Indicador de pago */}
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: isPaid ? "#10b981" : "#f59e0b" }}
                              title={isPaid ? "Pagado" : "Pago al abordar"}
                            />
                          </div>
                          {/* Tramo */}
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: primaryColor }} />
                            <span className="truncate">{p.origin}</span>
                            <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{p.destination}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Modo: Encomiendas ── */}
            {sidebarMode === "encomiendas" && (
              <div className="space-y-3 flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Encomiendas ({parcels.length})</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrintParcels}
                      disabled={loadingParcels || parcels.length === 0}
                      className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                      title="Imprimir Manifiesto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={loadParcels}
                      disabled={loadingParcels}
                      className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                      title="Actualizar"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingParcels ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => setParcelModalOpen(true)}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[10px] font-bold transition-all"
                    >
                      + Registrar
                    </button>
                  </div>
                </div>

                {/* Buscador */}
                <input
                  type="text"
                  value={parcelSearch}
                  onChange={e => setParcelSearch(e.target.value)}
                  placeholder="Buscar remitente, dest..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
                />

                {loadingParcels && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  </div>
                )}

                {parcelsError && !loadingParcels && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {parcelsError}
                  </div>
                )}

                {!loadingParcels && !parcelsError && filteredParcels.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
                    <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Sin encomiendas</p>
                    <button
                      onClick={() => setParcelModalOpen(true)}
                      className="mt-2 text-[10px] text-amber-400 hover:underline animate-pulse"
                    >
                      Registrar primera
                    </button>
                  </div>
                )}

                {!loadingParcels && filteredParcels.length > 0 && (
                  <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                    {filteredParcels.map((p) => {
                      const isPaid = p.paymentStatus === "PAID_DIGITAL" || p.paymentStatus === "PAID";
                      return (
                        <div
                          key={p.id}
                          className="rounded-lg p-2 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1.5"
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          <div className="flex items-start gap-1.5">
                            <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-400">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-white text-xs font-semibold truncate">{p.senderName}</p>
                                <span className="text-[10px] font-extrabold text-amber-400">S/ {Number(p.totalPrice).toFixed(2)}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">Dest: {p.receiverName}</p>
                            </div>
                          </div>

                          {/* Tramo */}
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 bg-black/20 p-1 rounded">
                            <MapPin className="w-2.5 h-2.5 text-amber-500" />
                            <span className="truncate max-w-[65px]">{p.startWaypoint?.station?.name}</span>
                            <ArrowRight className="w-2 h-2" />
                            <span className="truncate max-w-[65px]">{p.endWaypoint?.station?.name}</span>
                          </div>

                          {/* Detalles del paquete */}
                          {(p.description || p.weightKg) && (
                            <p className="text-[9px] text-slate-500 italic truncate">
                              {p.description && `${p.description}`}
                              {p.description && p.weightKg && " · "}
                              {p.weightKg && `${p.weightKg} kg`}
                            </p>
                          )}

                          {/* Selector de estado y pago */}
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/5">
                            <span className="text-[9px] font-medium" style={{ color: isPaid ? "#10b981" : "#f59e0b" }}>
                              {isPaid ? "Pagado" : "Cobro destino"}
                            </span>
                            <select
                              value={p.status}
                              onChange={(e) => handleParcelStatusChange(p.id, e.target.value)}
                              className="bg-slate-900 border border-white/10 rounded px-1 py-0.5 text-[9px] text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                            >
                              <option value="RECEIVED">Recibido</option>
                              <option value="IN_TRANSIT">En viaje</option>
                              <option value="READY_FOR_PICKUP">Listo retirar</option>
                              <option value="DELIVERED">Entregado</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Modo: Vendedores ── */}
            {sidebarMode === "vendedores" && (() => {
              type SellerStat = {
                id: string;
                name: string;
                email: string;
                role: string;
                tickets: number;
                ticketTotal: number;
                parcelsCount: number;
                parcelsTotal: number;
              };
              const sellerMap = new Map<string, SellerStat>();

              passengers.forEach(p => {
                const key = p.seller?.id ?? "__sin_vendedor__";
                if (!sellerMap.has(key)) {
                  sellerMap.set(key, {
                    id: p.seller?.id ?? "",
                    name: p.seller?.name ?? "Sin vendedor",
                    email: p.seller?.email ?? "",
                    role: p.seller?.role ?? "",
                    tickets: 0,
                    ticketTotal: 0,
                    parcelsCount: 0,
                    parcelsTotal: 0
                  });
                }
                const s = sellerMap.get(key)!;
                s.tickets++;
                s.ticketTotal += Number(p.price ?? 0);
              });

              parcels.forEach(p => {
                const key = (p as any).seller?.id ?? "__sin_vendedor__";
                if (!sellerMap.has(key)) {
                  sellerMap.set(key, {
                    id: (p as any).seller?.id ?? "",
                    name: (p as any).seller?.name ?? "Sin vendedor",
                    email: (p as any).seller?.email ?? "",
                    role: (p as any).seller?.role ?? "",
                    tickets: 0,
                    ticketTotal: 0,
                    parcelsCount: 0,
                    parcelsTotal: 0
                  });
                }
                const s = sellerMap.get(key)!;
                s.parcelsCount++;
                s.parcelsTotal += Number(p.totalPrice ?? 0);
              });

              const stats = Array.from(sellerMap.values()).sort(
                (a, b) => (b.tickets + b.parcelsCount) - (a.tickets + a.parcelsCount)
              );

              return (
                <div className="space-y-3 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Resumen Ventas</p>
                    <span className="text-[10px] text-slate-400">Total: {stats.length}</span>
                  </div>

                  {(loadingPassengers || loadingParcels) ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  ) : stats.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
                      <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Sin datos de ventas</p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                      {stats.map((s, i) => {
                        const initials = s.name !== "Sin vendedor"
                          ? s.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                          : "?";
                        const grandTotal = s.ticketTotal + s.parcelsTotal;
                        return (
                          <div
                            key={s.id || i}
                            className="rounded-xl p-2.5 border border-white/5 flex flex-col gap-2"
                            style={{ background: "rgba(255,255,255,0.02)" }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-white text-xs font-bold truncate">{s.name}</p>
                                  <span className="text-[10px] font-extrabold text-indigo-400" style={{ color: primaryColor }}>
                                    #{i + 1}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-500 truncate">{s.email || "Venta directa / Agencia"}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 bg-black/20 p-1.5 rounded-lg">
                              <div className="text-center border-r border-white/5">
                                <p className="text-[8px] text-slate-500">🎫 Pasajes</p>
                                <p className="text-xs font-bold text-white mt-0.5">{s.tickets} <span className="text-[9px] font-normal text-slate-400">(S/{s.ticketTotal.toFixed(0)})</span></p>
                              </div>
                              <div className="text-center">
                                <p className="text-[8px] text-slate-500">📦 Encom.</p>
                                <p className="text-xs font-bold text-white mt-0.5">{s.parcelsCount} <span className="text-[9px] font-normal text-slate-400">(S/{s.parcelsTotal.toFixed(0)})</span></p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 font-semibold text-slate-300">
                              <span>Recaudado total:</span>
                              <span className="font-extrabold text-white">S/ {grandTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── ZONA CENTRAL: MAPA O LISTAS EN MOVIL ───────────────────────────── */}
        <div className={`flex-1 overflow-auto flex flex-col items-center justify-start py-4 px-3 sm:px-4 gap-4 ${
          sidebarMode !== "pasajes" ? "hidden lg:flex" : "flex"
        }`}
          style={{ background: "#0d1424" }}>

          {editMode && (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30"
              style={{ background: "rgba(245,158,11,0.06)" }}>
              <Pencil className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300 font-medium">
                <strong>Modo edición:</strong> Haz clic en un asiento para cambiar su número. Guarda cuando termines.
              </p>
            </div>
          )}

          {/* Leyenda horizontal compacta */}
          <div className="w-full flex flex-wrap items-center justify-start sm:justify-end gap-3 px-2">
            {[
              { color: "#22c55e", label: "Libre",   count: freeCount },
              { color: "#ef4444", label: "Ocupado", count: occupied.length },
              { color: "#a855f7", label: "Reservado", count: 0 },
              { color: "#06b6d4", label: "Proceso",   count: 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <SeatIcon color={item.color} label="" size={20} />
                <span className="text-xs text-slate-400">{item.label}</span>
                <span className="text-xs font-extrabold" style={{ color: item.color }}>{item.count}</span>
              </div>
            ))}
          </div>

          {/* Contenedor que escala el bus para ocupar el 80% del ancho disponible */}
          <div className="w-full flex-1 flex flex-col items-center justify-start gap-2 overflow-auto">

            {/* Piso 2 */}
            {isTwoDeck && (
              <div className="w-full flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 w-full">
                  <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
                  <span className="text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full border"
                    style={{ background: `${secondaryColor}18`, color: secondaryColor, borderColor: `${secondaryColor}35` }}>
                  Piso 2 — {floor2Count} asientos
                  </span>
                  <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
                </div>
                <div className="w-full overflow-x-auto flex justify-start lg:justify-center">
                  <div style={{ transform: "scale(0.85)", transformOrigin: "left top", display: "inline-block", paddingBottom: "2px" }}>
                    <BusMap {...busMapProps} floor={2} />
                  </div>
                </div>
              </div>
            )}

            {/* Piso 1 */}
            <div className="w-full flex flex-col items-center gap-2">
              {isTwoDeck && (
                <div className="flex items-center gap-3 w-full">
                  <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
                  <span className="text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full border"
                    style={{ background: `${primaryColor}18`, color: primaryColor, borderColor: `${primaryColor}35` }}>
                    Piso 1 — {floor1Count} asientos
                  </span>
                  <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
                </div>
              )}
              <div className="w-full overflow-x-auto flex justify-start lg:justify-center">
                <div style={{ transform: "scale(0.85)", transformOrigin: "left top", display: "inline-block", paddingBottom: "15px" }}>
                  <BusMap {...busMapProps} floor={1} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile view for Passengers */}
        {sidebarMode === "pasajeros" && (
          <div className="w-full lg:hidden flex-1 overflow-y-auto space-y-4 px-4 py-4 bg-[#0d1424]">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <h4 className="text-white font-bold text-sm">Manifiesto de Pasajeros</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPassengers}
                  disabled={loadingPassengers || passengers.length === 0}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                  title="Imprimir Manifiesto"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => loadPassengers()}
                  disabled={loadingPassengers}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPassengers ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {loadingPassengers && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            )}

            {passengersError && !loadingPassengers && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {passengersError}
              </div>
            )}

            {!loadingPassengers && !passengersError && passengers.length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Sin pasajeros aún</p>
              </div>
            )}

            {!loadingPassengers && passengers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {passengers.map((p) => {
                  const isPaid = p.paymentStatus === "PAID_DIGITAL" || p.paymentStatus === "PAID";
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl p-3 border border-white/8 hover:border-white/15 transition-all"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-extrabold text-xs"
                          style={{
                            background: `${primaryColor}25`,
                            color: primaryColor,
                            border: `1px solid ${primaryColor}40`,
                          }}
                        >
                          {p.seatId.replace(/\D/g, "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                          <p className="text-slate-500 text-[10px] truncate">{p.document}</p>
                        </div>
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: isPaid ? "#10b981" : "#f59e0b" }}
                          title={isPaid ? "Pagado" : "Pago al abordar"}
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: primaryColor }} />
                        <span className="truncate">{p.origin}</span>
                        <ArrowRight className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{p.destination}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mobile view for Encomiendas */}
        {sidebarMode === "encomiendas" && (
          <div className="w-full lg:hidden flex-1 overflow-y-auto space-y-4 px-4 py-4 bg-[#0d1424]">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <h4 className="text-white font-bold text-sm">Control de Encomiendas</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintParcels}
                  disabled={loadingParcels || parcels.length === 0}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                  title="Imprimir Manifiesto"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={loadParcels}
                  disabled={loadingParcels}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingParcels ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setParcelModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition-all"
                >
                  + Registrar
                </button>
              </div>
            </div>

            {/* Buscador en mobile */}
            <input
              type="text"
              value={parcelSearch}
              onChange={e => setParcelSearch(e.target.value)}
              placeholder="Buscar remitente, destinatario..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-white/20 transition-colors"
            />

            {loadingParcels && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            )}

            {parcelsError && !loadingParcels && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {parcelsError}
              </div>
            )}

            {!loadingParcels && !parcelsError && filteredParcels.length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Sin encomiendas registradas</p>
              </div>
            )}

            {!loadingParcels && filteredParcels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredParcels.map((p) => {
                  const isPaid = p.paymentStatus === "PAID_DIGITAL" || p.paymentStatus === "PAID";
                  const pSt = parcelStatusConfig[p.status] || parcelStatusConfig.RECEIVED;
                  const payS = p.paymentStatus === "PENDING_CASH"
                    ? { label: "Pago pendiente", color: "#f59e0b" }
                    : { label: "Pagado",         color: "#10b981" };
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl p-3 border border-white/8 hover:border-white/15 transition-all flex flex-col gap-2"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-400">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-white text-xs font-semibold truncate">{p.senderName}</p>
                            <span className="text-xs font-extrabold text-amber-400">S/ {Number(p.totalPrice).toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">Dest: {p.receiverName}</p>
                        </div>
                      </div>

                      {/* Tramo */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-black/20 p-1.5 rounded">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span className="truncate">{p.startWaypoint?.station?.name}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                        <span className="truncate">{p.endWaypoint?.station?.name}</span>
                      </div>

                      {/* Detalles del paquete */}
                      {(p.description || p.weightKg) && (
                        <p className="text-[10px] text-slate-500 italic truncate">
                          {p.description && `${p.description}`}
                          {p.description && p.weightKg && " · "}
                          {p.weightKg && `${p.weightKg} kg`}
                        </p>
                      )}

                      {/* Selector de estado y pago */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] font-medium" style={{ color: isPaid ? "#10b981" : "#f59e0b" }}>
                          {payS.label}
                        </span>
                        <select
                          value={p.status}
                          onChange={(e) => handleParcelStatusChange(p.id, e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                        >
                          <option value="RECEIVED">Recibido</option>
                          <option value="IN_TRANSIT">En viaje</option>
                          <option value="READY_FOR_PICKUP">Listo retirar</option>
                          <option value="DELIVERED">Entregado</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mobile view for Vendedores */}
        {sidebarMode === "vendedores" && (() => {
          type SellerStat = {
            id: string;
            name: string;
            email: string;
            role: string;
            tickets: number;
            ticketTotal: number;
            parcelsCount: number;
            parcelsTotal: number;
          };
          const sellerMap = new Map<string, SellerStat>();

          passengers.forEach(p => {
            const key = p.seller?.id ?? "__sin_vendedor__";
            if (!sellerMap.has(key)) {
              sellerMap.set(key, {
                id: p.seller?.id ?? "",
                name: p.seller?.name ?? "Sin vendedor",
                email: p.seller?.email ?? "",
                role: p.seller?.role ?? "",
                tickets: 0,
                ticketTotal: 0,
                parcelsCount: 0,
                parcelsTotal: 0
              });
            }
            const s = sellerMap.get(key)!;
            s.tickets++;
            s.ticketTotal += Number(p.price ?? 0);
          });

          parcels.forEach(p => {
            const key = (p as any).seller?.id ?? "__sin_vendedor__";
            if (!sellerMap.has(key)) {
              sellerMap.set(key, {
                id: (p as any).seller?.id ?? "",
                name: (p as any).seller?.name ?? "Sin vendedor",
                email: (p as any).seller?.email ?? "",
                role: (p as any).seller?.role ?? "",
                tickets: 0,
                ticketTotal: 0,
                parcelsCount: 0,
                parcelsTotal: 0
              });
            }
            const s = sellerMap.get(key)!;
            s.parcelsCount++;
            s.parcelsTotal += Number(p.totalPrice ?? 0);
          });

          const stats = Array.from(sellerMap.values()).sort(
            (a, b) => (b.tickets + b.parcelsCount) - (a.tickets + a.parcelsCount)
          );

          return (
            <div className="w-full lg:hidden flex-1 overflow-y-auto space-y-4 px-4 py-4 bg-[#0d1424]">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <h4 className="text-white font-bold text-sm">Resumen por Vendedor</h4>
                <span className="text-[10px] text-slate-400">Total: {stats.length}</span>
              </div>

              {(loadingPassengers || loadingParcels) ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : stats.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                  <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Sin datos de ventas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stats.map((s, i) => {
                    const initials = s.name !== "Sin vendedor"
                      ? s.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                      : "?";
                    const grandTotal = s.ticketTotal + s.parcelsTotal;
                    return (
                      <div
                        key={s.id || i}
                        className="rounded-xl p-3 border border-white/8 hover:border-white/15 transition-all flex flex-col gap-2"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-white text-xs font-bold truncate">{s.name}</p>
                              <span className="text-xs font-extrabold" style={{ color: primaryColor }}>#{i + 1}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{s.email || "Venta directa / Agencia"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 bg-black/20 p-1.5 rounded-lg">
                          <div className="text-center border-r border-white/5">
                            <p className="text-[9px] text-slate-500">🎫 Pasajes</p>
                            <p className="text-xs font-bold text-white mt-0.5">{s.tickets} <span className="text-[10px] font-normal text-slate-400">(S/{s.ticketTotal.toFixed(0)})</span></p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-500">📦 Encom.</p>
                            <p className="text-xs font-bold text-white mt-0.5">{s.parcelsCount} <span className="text-[10px] font-normal text-slate-400">(S/{s.parcelsTotal.toFixed(0)})</span></p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5 font-semibold text-slate-300">
                          <span>Recaudado total:</span>
                          <span className="font-extrabold text-white">S/ {grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ─── MODAL DE VENTA ──────────────────────────────────────────────────── */}
      <SaleModal
        open={saleModalOpen && sidebarMode === "pasajes"}
        onClose={() => { setSaleModalOpen(false); setSelectedSeat(""); setSelectedSeatFloor(0); }}
        seatId={selectedSeat}
        seatLabel={seatLabels[selectedSeat] ?? selectedSeat.replace(/\D/g, "")}
        tripId={tripId}
        waypoints={waypoints}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        price={price}
        onSuccess={handleSaleSuccess}
        seatFloor={selectedSeatFloor}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        companyRuc={companyRuc}
        departureTime={departureTime}
        origin={origin}
        destination={destination}
      />

      {/* ─── MODAL DE REGISTRO DE ENCOMIENDA ─────────────────────────────────── */}
      {parcelModalOpen && (
        <ParcelModal
          tripId={tripId}
          waypoints={waypoints}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onClose={() => setParcelModalOpen(false)}
          onSuccess={loadParcels}
        />
      )}
    </div>
  );
}
