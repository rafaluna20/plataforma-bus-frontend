"use client";

import { useState, useEffect } from "react";
import {
  X, CheckCircle2, AlertCircle, Loader2,
  Banknote, CreditCard, ArrowRight, Pencil, Package, TicketCheck, Save, RotateCcw
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Waypoint = {
  id: string;
  stopOrder: number;
  basePrice: number;
  station: { id: string; name: string; city: string };
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
  routeName: string;
  departureTime: string;
  onSaleSuccess?: (receipt: any) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPrice(waypoints: Waypoint[], startId: string, endId: string): number {
  const startWp = waypoints.find(w => w.id === startId);
  const endWp = waypoints.find(w => w.id === endId);
  if (!startWp || !endWp) return 0;
  let price = 0;
  for (const wp of waypoints) {
    if (wp.stopOrder > startWp.stopOrder && wp.stopOrder <= endWp.stopOrder) {
      price += Number(wp.basePrice);
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

// ─── Icono de asiento top-down girado 90° CW ─────────────────────────────────
function SeatIcon({ color, label, size = 68 }: { color: string; label: string; size?: number }) {
  const baseW = size;
  const baseH = Math.round(size * 1.15);

  const darken = (hex: string, amt = 55) => {
    const c = hex.replace("#", "");
    const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amt);
    const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amt);
    const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amt);
    return `rgb(${r},${g},${b})`;
  };
  const border = darken(color);
  const shadow = `${color}55`;
  const fs = size <= 30 ? 7 : size <= 44 ? 9 : size <= 60 ? 11 : size <= 76 ? 13 : 15;

  const backH = Math.round(baseH * 0.38);
  const seatH = Math.round(baseH * 0.46);
  const armW = Math.round(baseW * 0.10);
  const armH = Math.round(baseH * 0.34);
  const armTop = Math.round(baseH * 0.32);

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
        {/* Respaldo */}
        <div style={{
          width: Math.round(baseW * 0.76), height: backH,
          background: color,
          border: `2px solid ${border}`,
          borderRadius: `${Math.round(baseW * 0.2)}px ${Math.round(baseW * 0.2)}px ${Math.round(baseW * 0.04)}px ${Math.round(baseW * 0.04)}px`,
          boxShadow: `0 3px 8px ${shadow}, inset 0 2px 0 rgba(255,255,255,0.3)`,
        }} />
        {/* Cojín */}
        <div style={{
          width: Math.round(baseW * 0.86), height: seatH, marginTop: 2,
          background: color,
          border: `2px solid ${border}`,
          borderRadius: `${Math.round(baseW * 0.04)}px ${Math.round(baseW * 0.04)}px ${Math.round(baseW * 0.18)}px ${Math.round(baseW * 0.18)}px`,
          boxShadow: `0 4px 10px ${shadow}, inset 0 2px 0 rgba(255,255,255,0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: fs, fontWeight: 900, lineHeight: 1,
            color: isLight(color) ? "#1e293b" : "#fff",
            userSelect: "none",
            transform: "rotate(-90deg)",
            display: "inline-block",
          }}>{label}</span>
        </div>
        {/* Brazo izq */}
        <div style={{
          position: "absolute", left: 0, top: armTop,
          width: armW, height: armH,
          background: color, border: `1.5px solid ${border}`,
          opacity: 0.85, borderRadius: armW / 2,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)`,
        }} />
        {/* Brazo der */}
        <div style={{
          position: "absolute", right: 0, top: armTop,
          width: armW, height: armH,
          background: color, border: `1.5px solid ${border}`,
          opacity: 0.85, borderRadius: armW / 2,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)`,
        }} />
      </div>
    </div>
  );
}

// ─── Rueda ────────────────────────────────────────────────────────────────────
function Wheel({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
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
}

// ─── Volante ──────────────────────────────────────────────────────────────────
function SteeringWheel({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="#64748b" strokeWidth="2.5" fill="none" />
      <circle cx="16" cy="16" r="4.5" fill="#64748b" />
      <line x1="16" y1="2" x2="16" y2="11.5" stroke="#64748b" strokeWidth="2" />
      <line x1="16" y1="20.5" x2="16" y2="30" stroke="#64748b" strokeWidth="2" />
      <line x1="2" y1="16" x2="11.5" y2="16" stroke="#64748b" strokeWidth="2" />
      <line x1="20.5" y1="16" x2="30" y2="16" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
}

// ─── Bus renderer ─────────────────────────────────────────────────────────────
function BusMap({
  vehicleType, capacity, floor, occupied, selectedSeat, onSeatClick,
  primaryColor, price, editMode, seatLabels, onLabelChange,
}: {
  vehicleType: string; capacity: number; floor: 1 | 2;
  occupied: string[]; selectedSeat: string;
  onSeatClick: (id: string) => void;
  primaryColor: string; price: number;
  editMode: boolean;
  seatLabels: Record<string, string>;
  onLabelChange: (id: string, val: string) => void;
}) {
  const isTwoDeck = vehicleType === "BUS_2P";
  const SZ = 68; // +30% respecto a 52

  function color(id: string) {
    if (occupied.includes(id)) return "#ef4444";
    if (selectedSeat === id) return primaryColor;
    return "#22c55e";
  }

  function renderSeat(id: string) {
    const isOcc = occupied.includes(id);
    const isSel = selectedSeat === id;
    const lbl = seatLabels[id] ?? id.replace(/\D/g, "");

    if (editMode) {
      return (
        <div key={id} className="flex-shrink-0 relative" style={{ width: Math.round(SZ * 1.15), height: SZ }}>
          <SeatIcon color="#22c55e" label={lbl} size={SZ} />
          <input
            value={lbl}
            onChange={e => onLabelChange(id, e.target.value)}
            maxLength={4}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
            title={`Editar número asiento ${id}`}
          />
          <div className="absolute bottom-0 right-0 bg-amber-400 rounded-full w-4 h-4 flex items-center justify-center pointer-events-none z-20">
            <Pencil className="w-2.5 h-2.5 text-black" />
          </div>
        </div>
      );
    }

    return (
      <button key={id}
        onClick={() => !isOcc && onSeatClick(id)}
        disabled={isOcc}
        title={`Asiento ${lbl}${isOcc ? " — Ocupado" : ""}`}
        className={`flex-shrink-0 transition-all duration-150 ${isOcc ? "cursor-not-allowed" : "cursor-pointer hover:scale-105"} ${isSel ? "scale-110 z-10" : ""}`}
        style={{ filter: isSel ? `drop-shadow(0 0 10px ${color(id)})` : undefined }}>
        <SeatIcon color={color(id)} label={lbl} size={SZ} />
      </button>
    );
  }

  // ── Piso 1: 3 filas × 4 cols ─────────────────────────────────────────────
  if (isTwoDeck && floor === 1) {
    const rows = [
      ["S1", "S2", "S3", "S4"],
      ["S5", "S6", "S7", "S8"],
      ["S9", "S10", "S11", "S12"],
    ];
    return (
      <div className="flex flex-col items-center gap-2">
        <WheelRow sz={SZ} />
        <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
          style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
          <div className="flex items-stretch">
            <DriverCol sz={SZ} />
            <div className="p-4 flex flex-col gap-2">
              {rows.map((row, ri) => (
                <div key={ri}>
                  {ri === 1 && <div className="h-4 flex items-center mb-2">
                    <div className="w-full h-px opacity-20 bg-slate-500" />
                  </div>}
                  <div className="flex gap-2">{row.map(renderSeat)}</div>
                </div>
              ))}
            </div>
            <PostCol sz={SZ} />
          </div>
        </div>
        <WheelRow sz={SZ} />
      </div>
    );
  }

  // ── Piso 2 / bus 1 piso: 4 filas × N cols ────────────────────────────────
  const total = isTwoDeck ? 54 : capacity;
  const start = isTwoDeck ? 13 : 1;
  const cols = Math.ceil(total / 4);

  const rowA: (string | null)[] = Array(cols).fill(null);
  const rowB: (string | null)[] = Array(cols).fill(null);
  const rowC: (string | null)[] = Array(cols).fill(null);
  const rowD: (string | null)[] = Array(cols).fill(null);

  let n = start;
  for (let c = 0; c < cols; c++) {
    if (n < start + total) { rowA[c] = `S${n}`; n++; }
    if (n < start + total) { rowB[c] = `S${n}`; n++; }
    if (n < start + total) { rowC[c] = `S${n}`; n++; }
    if (n < start + total) { rowD[c] = `S${n}`; n++; }
  }

  function renderRow(row: (string | null)[]) {
    return (
      <div className="flex gap-2">
        {row.map((id, ci) => {
          if (!id) return <div key={ci} style={{ width: Math.round(SZ * 1.15), height: SZ }} className="flex-shrink-0" />;
          return renderSeat(id);
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <WheelRow sz={SZ} />
      <div className="rounded-3xl border-2 border-slate-400/50 overflow-hidden"
        style={{ background: "linear-gradient(180deg,#c8cfe0,#b8c0d8)" }}>
        <div className="flex items-stretch">
          <DriverCol sz={SZ} />
          <div className="p-4 flex flex-col gap-2">
            {renderRow(rowA)}
            {renderRow(rowB)}
            <div className="h-4 flex items-center">
              <div className="w-full h-px opacity-20 bg-slate-500" />
            </div>
            {renderRow(rowC)}
            {renderRow(rowD)}
          </div>
          <PostCol sz={SZ} />
        </div>
      </div>
      <WheelRow sz={SZ} />
    </div>
  );
}

function WheelRow({ sz }: { sz: number }) {
  const px = Math.round(sz * 0.85);
  return (
    <div className="flex self-stretch justify-between items-center gap-2" style={{ paddingLeft: px, paddingRight: px }}>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
      <div className="flex gap-2"><Wheel /><Wheel /></div>
    </div>
  );
}

function DriverCol({ sz }: { sz: number }) {
  return (
    <div className="flex flex-col items-center justify-center border-r-2 border-slate-400/40 flex-shrink-0"
      style={{ background: "linear-gradient(90deg,#9ba8c0,#b0bbd0)", minWidth: Math.round(sz * 1.1), padding: "16px 10px" }}>
      <SteeringWheel size={34} />
      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-2"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        Conductor
      </span>
    </div>
  );
}

function PostCol({ sz }: { sz: number }) {
  return (
    <div className="flex flex-col items-center justify-center border-l-2 border-slate-400/40 flex-shrink-0"
      style={{ background: "linear-gradient(90deg,#b0bbd0,#9ba8c0)", minWidth: Math.round(sz * 0.5), padding: "16px 6px" }}>
      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider"
        style={{ writingMode: "vertical-rl" }}>Post.</span>
    </div>
  );
}

// ─── Modal de venta ───────────────────────────────────────────────────────────
function SaleModal({
  open, onClose, seatId, seatLabel, tripId, waypoints, primaryColor, secondaryColor, price, onSuccess,
}: {
  open: boolean; onClose: () => void; seatId: string; seatLabel: string; tripId: string;
  waypoints: Waypoint[]; primaryColor: string; secondaryColor: string;
  price: number; onSuccess: (booking: any) => void;
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

  useEffect(() => {
    if (open) {
      setName(""); setDocNum(""); setPhone(""); setError(""); setReceipt(null);
      setStartWpId(waypoints[0]?.id || "");
      setEndWpId(waypoints[waypoints.length - 1]?.id || "");
    }
  }, [open, seatId]);

  if (!open) return null;

  const tramePrice = calcPrice(waypoints, startWpId, endWpId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !docNum.trim()) { setError("Nombre y documento son obligatorios."); return; }
    if (startWpId === endWpId) { setError("El origen y destino deben ser diferentes."); return; }
    setLoading(true); setError("");
    try {
      const endpoint = payMethod === "cash" ? `${API}/api/v1/bookings` : `${API}/api/v1/bookings/digital`;
      const body: any = {
        tripId, passengerName: name.trim(), passengerDocType: docType,
        passengerDocNum: docNum.trim(), startWaypointId: startWpId,
        endWaypointId: endWpId, seatId,
      };
      if (payMethod === "digital") body.paymentDetails = { method: "YAPE", phoneNumber: phone };
      const res = await authFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar la venta");
      setReceipt(data.booking);
      onSuccess(data.booking);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "#0f172a" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8"
          style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}15)` }}>
          <div>
            <h2 className="text-white font-bold text-base">Vender Pasaje</h2>
            <p className="text-xs mt-0.5" style={{ color: primaryColor }}>
              Asiento <strong>{seatLabel}</strong> — S/ {tramePrice > 0 ? tramePrice.toFixed(2) : price.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {receipt ? (
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
                { label: "ID Reserva", value: receipt.id?.slice(0, 14) + "...", mono: true },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">{item.label}</span>
                  <span className={`font-bold text-sm ${(item as any).mono ? "font-mono text-xs" : ""}`}
                    style={{ color: (item as any).color || "white" }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => window.print()}
                className="py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-colors">
                🖨️ Imprimir
              </button>
              <button onClick={onClose}
                className="py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Tramo */}
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
                    S/ {tramePrice > 0 ? tramePrice.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre completo *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Juan Pérez García" required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
            </div>

            {/* Documento */}
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

            {/* Teléfono */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Teléfono (opcional)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="987654321"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
            </div>

            {/* Pago */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Método de pago *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "cash", label: "Efectivo", icon: <Banknote className="w-4 h-4" /> },
                  { key: "digital", label: "Yape/Digital", icon: <CreditCard className="w-4 h-4" /> },
                ].map(opt => (
                  <button key={opt.key} type="button"
                    onClick={() => setPayMethod(opt.key as any)}
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
                : <><CheckCircle2 className="w-4 h-4" /> Confirmar Venta — S/ {tramePrice > 0 ? tramePrice.toFixed(2) : price.toFixed(2)}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SeatMapModal({
  open, onClose, tripId, vehicleType, vehicleCapacity, seatTemplate,
  occupiedSeats: initialOccupied, waypoints, primaryColor, secondaryColor,
  companyName, routeName, departureTime, onSaleSuccess,
}: SeatMapModalProps) {

  const isTwoDeck = vehicleType === "BUS_2P";
  const totalSeats = isTwoDeck ? 66 : vehicleCapacity;

  // Generar labels iniciales: S1→"1", S2→"2", ...
  function buildDefaultLabels(): Record<string, string> {
    const labels: Record<string, string> = {};
    const total = isTwoDeck ? 66 : vehicleCapacity;
    for (let i = 1; i <= total; i++) labels[`S${i}`] = String(i);
    return labels;
  }

  const [occupied, setOccupied] = useState<string[]>(initialOccupied);
  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"pasajes" | "encomiendas">("pasajes");
  const [editMode, setEditMode] = useState(false);
  const [seatLabels, setSeatLabels] = useState<Record<string, string>>(buildDefaultLabels);
  const [savedLabels, setSavedLabels] = useState<Record<string, string>>(buildDefaultLabels);

  const price = calcPrice(waypoints, waypoints[0]?.id || "", waypoints[waypoints.length - 1]?.id || "");
  const freeCount = vehicleCapacity - occupied.length;

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

  if (!open) return null;

  function handleSeatClick(id: string) {
    if (editMode) return;
    setSelectedSeat(id);
    setSaleModalOpen(true);
  }

  function handleSaleSuccess(booking: any) {
    setOccupied(prev => [...prev, selectedSeat]);
    onSaleSuccess?.(booking);
  }

  function handleSaveLabels() {
    setSavedLabels({ ...seatLabels });
    setEditMode(false);
  }

  function handleResetLabels() {
    const def = buildDefaultLabels();
    setSeatLabels(def);
    setSavedLabels(def);
    setEditMode(false);
  }

  const dep = new Date(departureTime);
  const origin = waypoints[0]?.station?.name || "";
  const destination = waypoints[waypoints.length - 1]?.station?.name || "";

  const busMapProps = {
    vehicleType, capacity: vehicleCapacity,
    occupied, selectedSeat, onSeatClick: handleSeatClick,
    primaryColor, price, editMode, seatLabels,
    onLabelChange: (id: string, val: string) => setSeatLabels(prev => ({ ...prev, [id]: val })),
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#080d1a" }}>

      {/* ─── TOPBAR ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-white/8"
        style={{ background: "rgba(8,13,26,0.98)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: primaryColor }}>
                {companyName}
              </span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-white text-xs font-semibold">{origin}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-white text-xs font-semibold">{destination}</span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-400 text-xs">
                {dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-slate-500 text-xs">{freeCount} asientos libres de {vehicleCapacity}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Botón editar numeración */}
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition-all">
              <Pencil className="w-3.5 h-3.5" /> Editar numeración
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleResetLabels}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-600 text-slate-400 text-xs font-semibold hover:bg-slate-800 transition-all">
                <RotateCcw className="w-3.5 h-3.5" /> Restablecer
              </button>
              <button onClick={handleSaveLabels}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
                style={{ background: "#10b981" }}>
                <Save className="w-3.5 h-3.5" /> Guardar
              </button>
            </div>
          )}
          <div className="text-right">
            <p className="text-3xl font-extrabold" style={{ color: primaryColor }}>
              S/ {price > 0 ? price.toFixed(2) : "—"}
            </p>
            <p className="text-xs text-slate-500">por asiento</p>
          </div>
        </div>
      </div>

      {/* ─── CUERPO ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── SIDEBAR IZQUIERDO ─────────────────────────────────────────────── */}
        <div className="w-44 flex-shrink-0 border-r border-white/8 flex flex-col"
          style={{ background: "#080d1a" }}>

          {/* Botones de modo */}
          <div className="p-3 flex flex-col gap-2 border-b border-white/8">
            <button
              onClick={() => setSidebarMode("pasajes")}
              className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all w-full"
              style={sidebarMode === "pasajes"
                ? { background: `${primaryColor}25`, color: primaryColor, border: `1px solid ${primaryColor}50` }
                : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
              <TicketCheck className="w-4 h-4 flex-shrink-0" />
              <span>Venta de Pasajes</span>
            </button>
            <button
              onClick={() => setSidebarMode("encomiendas")}
              className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all w-full"
              style={sidebarMode === "encomiendas"
                ? { background: "#f59e0b25", color: "#f59e0b", border: "1px solid #f59e0b50" }
                : { background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid #334155" }}>
              <Package className="w-4 h-4 flex-shrink-0" />
              <span>Encomiendas</span>
            </button>
          </div>

          {/* Contenido del sidebar según modo */}
          <div className="flex-1 p-3 overflow-y-auto">
            {sidebarMode === "pasajes" ? (
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
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Encomiendas</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Módulo de encomiendas disponible próximamente.
                </p>
                <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <Package className="w-6 h-6 text-amber-400 mb-2" />
                  <p className="text-xs text-amber-400 font-semibold">Próximamente</p>
                  <p className="text-xs text-slate-500 mt-1">Registro y seguimiento de encomiendas</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ZONA CENTRAL: MAPA ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-start py-5 px-6 gap-6"
          style={{ background: "#0d1424" }}>

          {/* Banner modo edición */}
          {editMode && (
            <div className="w-full max-w-6xl flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/8">
              <Pencil className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300 font-medium">
                <strong>Modo edición activo:</strong> Haz clic en cualquier asiento para cambiar su número. Los cambios son locales hasta que guardes.
              </p>
            </div>
          )}

          {/* Piso 2 */}
          {isTwoDeck && (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 w-full max-w-6xl">
                <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
                <span className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border"
                  style={{ background: `${secondaryColor}18`, color: secondaryColor, borderColor: `${secondaryColor}35` }}>
                  Piso 2 — 54 asientos
                </span>
                <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
              </div>
              <BusMap {...busMapProps} floor={2} />
            </div>
          )}

          {/* Piso 1 + Leyenda */}
          <div className="w-full flex flex-col items-center gap-2">
            {isTwoDeck && (
              <div className="flex items-center gap-3 w-full max-w-6xl">
                <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
                <span className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border"
                  style={{ background: `${primaryColor}18`, color: primaryColor, borderColor: `${primaryColor}35` }}>
                  Piso 1 — 12 asientos
                </span>
                <div className="h-px flex-1 opacity-15" style={{ background: "#6366f1" }} />
              </div>
            )}

            <div className="flex items-start gap-6">
              <BusMap {...busMapProps} floor={1} />

              {/* Leyenda */}
              <div className="flex-shrink-0 mt-10 p-4 rounded-2xl border border-white/8"
                style={{ background: "rgba(15,23,42,0.8)", minWidth: 190 }}>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">
                  Estado de Asientos
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    { color: "#22c55e", label: "Asiento Libre",   count: freeCount },
                    { color: "#ef4444", label: "Asiento Ocupado", count: occupied.length },
                    { color: "#a855f7", label: "Reservado",       count: 0 },
                    { color: "#06b6d4", label: "Proceso",         count: 0 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <SeatIcon color={item.color} label="" size={24} />
                        <span className="text-xs text-white font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-extrabold" style={{ color: item.color }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE VENTA ──────────────────────────────────────────────────── */}
      <SaleModal
        open={saleModalOpen && sidebarMode === "pasajes"}
        onClose={() => { setSaleModalOpen(false); setSelectedSeat(""); }}
        seatId={selectedSeat}
        seatLabel={seatLabels[selectedSeat] ?? selectedSeat.replace(/\D/g, "")}
        tripId={tripId}
        waypoints={waypoints}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        price={price}
        onSuccess={handleSaleSuccess}
      />
    </div>
  );
}
