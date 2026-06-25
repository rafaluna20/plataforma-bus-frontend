"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type TicketData = {
  // Empresa
  companyName: string;
  companyRuc?: string;
  companyLogoUrl?: string;
  // Viaje
  origin: string;
  destination: string;
  departureTime: string; // ISO string
  // Pasajero
  passengerName: string;
  passengerDoc: string;
  seatId: string;
  seatLabel?: string;
  // Reserva
  bookingId: string;
  totalPrice: number;
  paymentStatus: string;
  paymentMethod?: string;
  // Ruta
  routeName?: string;
  estimatedDurationMins?: number;
  estimatedDistanceKm?: number;
};

type TicketModalProps = {
  open: boolean;
  onClose: () => void;
  ticket: TicketData;
  primaryColor?: string;
  secondaryColor?: string;
};

export default function TicketModal({
  open, onClose, ticket, primaryColor = "#6366f1", secondaryColor = "#8b5cf6",
}: TicketModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const dep = new Date(ticket.departureTime);
  const dateStr = dep.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = dep.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  // Datos para el QR
  const qrData = JSON.stringify({
    id: ticket.bookingId,
    seat: ticket.seatId,
    passenger: ticket.passengerName,
    origin: ticket.origin,
    destination: ticket.destination,
    date: dateStr,
    time: timeStr,
  });

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket - ${ticket.passengerName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
            .ticket { max-width: 420px; margin: 20px auto; border: 2px solid #3b82f6; border-radius: 12px; overflow: hidden; background: #fff; }
            .ticket-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
            .company-logo { height: 48px; object-fit: contain; }
            .company-name { font-size: 22px; font-weight: 900; color: #1e293b; }
            .ruc { font-size: 16px; font-weight: 700; color: #475569; }
            .ticket-body { padding: 20px 24px; }
            .field { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
            .field-label { font-size: 15px; font-weight: 700; color: #1e293b; min-width: 80px; }
            .field-value { font-size: 14px; color: #475569; }
            .field-inline { display: flex; gap: 24px; margin-bottom: 12px; }
            .qr-section { display: flex; justify-content: flex-start; padding: 16px 0; }
            .terms { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 8px; }
            .terms-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
            .terms-text { font-size: 12px; color: #64748b; line-height: 1.5; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  const seatDisplay = ticket.seatLabel || ticket.seatId.replace(/\D/g, "");

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md flex flex-col gap-3">

        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            🎫 Ticket de Pasaje
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ticket */}
        <div
          ref={printRef}
          className="ticket bg-white rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: "2px solid #3b82f6" }}
        >
          {/* Header: Logo + RUC */}
          <div className="ticket-header flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {ticket.companyLogoUrl ? (
                <img
                  src={ticket.companyLogoUrl}
                  alt={ticket.companyName}
                  className="company-logo h-12 object-contain"
                  style={{ maxWidth: 120 }}
                />
              ) : (
                <span className="company-name text-2xl font-black text-slate-800">
                  {ticket.companyName}
                </span>
              )}
            </div>
            <div className="text-right">
              {ticket.companyRuc && (
                <p className="ruc text-base font-bold text-slate-600">
                  RUC:{ticket.companyRuc}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="ticket-body px-6 py-5 space-y-3">

            {/* Origen */}
            <div className="field flex items-baseline gap-2">
              <span className="field-label text-sm font-bold text-slate-800 w-24 flex-shrink-0">Origen:</span>
              <span className="field-value text-sm text-slate-600">{ticket.origin.toLowerCase()}</span>
            </div>

            {/* Destino */}
            <div className="field flex items-baseline gap-2">
              <span className="field-label text-sm font-bold text-slate-800 w-24 flex-shrink-0">Destino:</span>
              <span className="field-value text-sm text-slate-600">{ticket.destination.toLowerCase()}</span>
            </div>

            {/* Fecha + Hora */}
            <div className="field-inline flex items-baseline gap-6">
              <div className="flex items-baseline gap-2">
                <span className="field-label text-sm font-bold text-slate-800">Fecha:</span>
                <span className="field-value text-sm text-slate-600">{dateStr}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="field-label text-sm font-bold text-slate-800">Hora:</span>
                <span className="field-value text-sm text-slate-600">{timeStr}</span>
              </div>
            </div>

            {/* Asiento */}
            <div className="field flex items-baseline gap-2">
              <span className="field-label text-sm font-bold text-slate-800 w-24 flex-shrink-0">Asiento:</span>
              <span className="field-value text-sm text-slate-600">{seatDisplay}</span>
            </div>

            {/* Tiempo y Distancia */}
            {(ticket.estimatedDurationMins || ticket.estimatedDistanceKm) && (
              <div className="field-inline flex items-baseline gap-6">
                {ticket.estimatedDurationMins && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-800">Tiempo Aprox:</span>
                    <span className="text-sm text-slate-600">
                      {ticket.estimatedDurationMins >= 60
                        ? `${Math.floor(ticket.estimatedDurationMins / 60)} horas`
                        : `${ticket.estimatedDurationMins} min`}
                    </span>
                  </div>
                )}
                {ticket.estimatedDistanceKm && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-800">Distancia Aprox:</span>
                    <span className="text-sm text-slate-600">{ticket.estimatedDistanceKm} km</span>
                  </div>
                )}
              </div>
            )}

            {/* Pasajero */}
            <div className="field flex items-baseline gap-2">
              <span className="field-label text-sm font-bold text-slate-800 w-24 flex-shrink-0">Pasajero:</span>
              <span className="field-value text-sm text-slate-600">{ticket.passengerName}</span>
            </div>

            {/* QR Code */}
            <div className="qr-section py-4">
              <QRCodeSVG
                value={qrData}
                size={140}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            {/* Términos y condiciones */}
            <div className="terms border-t border-slate-200 pt-4">
              <p className="terms-title text-sm font-bold text-slate-800 mb-1">Terminos y condiciones:</p>
              <p className="terms-text text-xs text-slate-500 leading-relaxed">
                Aceptas las condiciones del uso del servicio de este vehiculo y los adicionales
              </p>
            </div>
          </div>
        </div>

        {/* Info adicional debajo del ticket */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>ID: {ticket.bookingId.slice(0, 16)}...</span>
          <span className="font-bold" style={{ color: "#10b981" }}>
            S/ {ticket.totalPrice.toFixed(2)} — {ticket.paymentStatus === "PENDING_CASH" ? "Pago al abordar" : "Pagado"}
          </span>
        </div>
      </div>
    </div>
  );
}
