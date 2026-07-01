"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  X, CheckCircle2, AlertCircle, Loader2,
  Banknote, CreditCard, ArrowRight, Pencil, Package, TicketCheck, Save, RotateCcw,
  Users, RefreshCw, MapPin, Printer
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import { API_URL, calcTripPrice } from "@/lib/config";
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

// ─── Fila de ruedas ──────────────────────────────────────────────────────────
const WheelRow = memo(function WheelRow() {
  return (
    <div className="flex self-stretch justify-between items-center gap-2" style={{ paddingLeft: 58, paddingRight: 58 }}>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
    </div>
  );
});

const DriverCol = memo(function DriverCol() {
  return (
    <div className="flex flex-col items-center justify-center border-r-2 border-slate-400/40 flex-shrink-0"
      style={{ background: "linear-gradient(90deg,#9ba8c0,#b0bbd0)", minWidth: 75, padding: "16px 10px" }}>
      <SteeringWheel />
      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-2"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        Conductor
      </span>
    </div>
  );
});

const PostCol = memo(function PostCol() {
  return (
    <div className="flex flex-col items-center justify-center border-l-2 border-slate-400/40 flex-shrink-0"
      style={{ background: "linear-gradient(90deg,#b0bbd0,#9ba8c0)", minWidth: 34, padding: "16px 6px" }}>
      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider"
        style={{ writingMode: "vertical-rl" }}>Post.</span>
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
          <WheelRow />
          <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
            style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
            <div className="flex items-stretch">
              <DriverCol />
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
              <PostCol />
            </div>
          </div>
          <WheelRow />
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
        <WheelRow />
        <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
          style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
          <div className="flex items-stretch">
            <DriverCol />
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
            <PostCol />
          </div>
        </div>
        <WheelRow />
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

    return (
      <div className="flex flex-col items-center gap-2">
        <WheelRow />
        <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
          style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
          <div className="flex items-stretch">
            <DriverCol />
            <div className="p-4 flex flex-col gap-2">
              {renderTemplateRow(getRow(1), "A")}
              {renderTemplateRow(getRow(2), "B")}
              <div className="h-4 flex items-center">
                <div className="w-full h-px opacity-20 bg-slate-500" />
              </div>
              {renderTemplateRow(getRow(3), "C")}
              {renderTemplateRow(getRow(4), "D")}
            </div>
            <PostCol />
          </div>
        </div>
        <WheelRow />
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

  return (
    <div className="flex flex-col items-center gap-2">
      <WheelRow />
      <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
        style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
        <div className="flex items-stretch">
          <DriverCol />
          <div className="p-4 flex flex-col gap-2">
            {renderRow(rowA, "A")}
            {renderRow(rowB, "B")}
            <div className="h-4 flex items-center">
              <div className="w-full h-px opacity-20 bg-slate-500" />
            </div>
            {renderRow(rowC, "C")}
            {renderRow(rowD, "D")}
          </div>
          <PostCol />
        </div>
      </div>
      <WheelRow />
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<any>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savedDoc, setSavedDoc] = useState("");
  const [savedStartWpId, setSavedStartWpId] = useState("");
  const [savedEndWpId, setSavedEndWpId] = useState("");

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
    setLoading(true); setError("");
    try {
      const endpoint = payMethod === "cash"
        ? `${API_URL}/api/v1/bookings`
        : `${API_URL}/api/v1/bookings/digital`;
      const body: any = {
        tripId, passengerName: name.trim(), passengerDocType: docType,
        passengerDocNum: docNum.trim(), startWaypointId: startWpId,
        endWaypointId: endWpId, seatId,
      };
      if (payMethod === "digital") body.paymentDetails = { method: "YAPE", phoneNumber: phone };
      const res = await authFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar la venta");
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
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

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre completo *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Juan Pérez García" required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-white text-xs focus:outline-none">
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Número *</label>
                <input value={docNum} onChange={e => setDocNum(e.target.value)}
                  placeholder="12345678" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
              </div>
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

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 8px 24px ${primaryColor}40`,
              }}>
              {loading
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

  const [occupied, setOccupied] = useState<string[]>(initialOccupied);
  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [selectedSeatFloor, setSelectedSeatFloor] = useState<0 | 1 | 2>(0);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"pasajes" | "encomiendas" | "pasajeros">("pasajes");
  const [editMode, setEditMode] = useState(false);
  const [seatLabels, setSeatLabels] = useState<Record<string, string>>(defaultLabels);

  // ─── Estado para lista de pasajeros en sidebar ────────────────────────────
  const [passengers, setPassengers] = useState<ManifestPassenger[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [passengersError, setPassengersError] = useState("");

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

  const freeCount = vehicleCapacity - occupied.length;

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

  useEffect(() => { setOccupied(initialOccupied); }, [initialOccupied]);

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

  // ─── Carga de pasajeros ───────────────────────────────────────────────────
  const loadPassengers = useCallback(async () => {
    if (!tripId) return;
    setLoadingPassengers(true);
    setPassengersError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/trips/${tripId}/manifest`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar pasajeros");
      setPassengers(data.passengers || []);
    } catch (e: any) {
      setPassengersError(e.message);
    } finally {
      setLoadingPassengers(false);
    }
  }, [tripId]);

  // Cargar pasajeros al abrir el modal o cambiar de pestaña
  useEffect(() => {
    if (open) {
      loadPassengers();
    }
  }, [sidebarMode, open, loadPassengers]);

  // ─── Carga de encomiendas ─────────────────────────────────────────────────
  const loadParcels = useCallback(async () => {
    if (!tripId) return;
    setLoadingParcels(true);
    setParcelsError("");
    try {
      const res = await authFetch(`${API_URL}/api/v1/parcels/trip/${tripId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar encomiendas");
      setParcels(data.parcels || []);
    } catch (e: any) {
      setParcelsError(e.message);
    } finally {
      setLoadingParcels(false);
    }
  }, [tripId]);

  // Cargar encomiendas cuando se activa esa pestaña
  useEffect(() => {
    if (sidebarMode === "encomiendas" && open) {
      loadParcels();
    }
  }, [sidebarMode, open, loadParcels]);

  // Actualizar estado de encomienda
  const handleParcelStatusChange = async (parcelId: string, newStatus: string) => {
    try {
      const res = await authFetch(`${API_URL}/api/v1/parcels/${parcelId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar estado");
      }
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
    setOccupied(prev => [...prev, booking.seatId ?? selectedSeat]);
    // No cerrar el modal de venta aquí — el ticket se muestra dentro de SaleModal
    onSaleSuccess?.(booking);
    // Recargar lista si está visible
    if (sidebarMode === "pasajeros") {
      loadPassengers();
    }
  }, [selectedSeat, onSaleSuccess, sidebarMode, loadPassengers]);

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
            <p className="text-slate-500 text-[10px] mt-0.5">{freeCount} libres de {vehicleCapacity}</p>
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

      {/* ─── CUERPO ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── SIDEBAR IZQUIERDO ─────────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 border-r border-white/8 flex flex-col"
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
              <span>Encomiendas</span>
            </button>
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
                      onClick={loadPassengers}
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
          <div className="w-full flex-1 flex flex-col items-center justify-start gap-6 overflow-auto">

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
                  <div style={{ transform: "scale(0.85)", transformOrigin: "left top", display: "inline-block", paddingBottom: "15px" }}>
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
                  onClick={loadPassengers}
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
