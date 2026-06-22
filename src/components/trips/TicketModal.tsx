"use client";

import { Printer, X, CheckCircle2 } from "lucide-react";
import type { Seat, Passenger, TripSummary } from "@/types/booking";

interface TicketModalProps {
  trip: TripSummary;
  selectedSeats: Seat[];
  passengers: Passenger[];
  onClose: () => void;
}

const RUC = "20155555555";
const ESTIMATED_KM = 154;

export default function TicketModal({ trip, selectedSeats, passengers, onClose }: TicketModalProps) {
  const departureDate = new Date(trip.departureTime);
  const dateStr = departureDate.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = departureDate.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Generate a unique booking ID for this ticket
  const bookingId = `TKT-${Date.now().toString(36).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#e5e7eb] rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header de control */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <div>
              <p className="font-bold text-slate-800">¡Pago Confirmado!</p>
              <p className="text-xs text-slate-500">Tu reserva ha sido procesada exitosamente.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tickets — uno por pasajero */}
        <div className="p-6 space-y-6 print:p-0 print:space-y-0">
          {passengers.map((passenger, idx) => {
            const seat = selectedSeats.find(s => s.id === passenger.seatId);
            // QR data in JSON format for proper machine-readable validation
            const qrPayload = JSON.stringify({
              bookingId,
              origin: trip.origin,
              destination: trip.destination,
              date: dateStr,
              time: timeStr,
              seat: seat?.label,
              passenger: passenger.nombre,
              dni: passenger.dni,
            });
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;

            return (
              <div
                key={passenger.seatId}
                className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-sm mx-auto print:shadow-none print:rounded-none print:max-w-full"
              >
                {/* Encabezado del Ticket */}
                <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  {/* Logo */}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                      <span className="text-white font-black text-[10px] leading-none text-center">
                        AN<br/>TE
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-base leading-none">Antezana</p>
                      <p className="text-slate-400 text-[9px] leading-none mt-0.5">{trip.company}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">RUC:{RUC}</p>
                  </div>
                </div>

                {/* Cuerpo del Ticket */}
                <div className="px-8 py-5 space-y-3">
                  {[
                    { label: "Origen:", value: trip.origin.toLowerCase() },
                    { label: "Destino:", value: trip.destination.toLowerCase() },
                    { label: "Fecha:", value: dateStr },
                    { label: "Hora:", value: timeStr },
                    {
                      label: "Asiento:",
                      value: `${seat?.label ?? "—"} ventana`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-4 text-sm">
                      <span className="font-bold text-slate-800 w-20 shrink-0">{label}</span>
                      <span className="text-slate-600">{value}</span>
                    </div>
                  ))}

                  <div className="flex gap-4 text-sm">
                    <span className="font-bold text-slate-800 w-20 shrink-0">Tiempo Aprox</span>
                    <span className="text-slate-600">
                      {trip.duration} &nbsp;&nbsp;
                      <span className="font-bold text-slate-800">Distancia Aprox</span>
                      &nbsp; {ESTIMATED_KM} km
                    </span>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <span className="font-bold text-slate-800 w-20 shrink-0">Pasajero:</span>
                    <span className="text-slate-600">
                      {passenger.nombre || "Sin Nombre"}
                    </span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center py-4 border-t border-dashed border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="QR Code del Ticket"
                    width={130}
                    height={130}
                    className="rounded"
                  />
                </div>

                {/* Términos */}
                <div className="px-8 pb-6 border-t border-dashed border-slate-200 pt-4">
                  <p className="font-bold text-slate-800 text-sm mb-2">Terminos y condiciones:</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                    Aceptas las condiciones del uso del servicio de este vehículo y los adicionales
                  </p>
                  <ul className="space-y-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Borde inferior decorativo */}
                <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              </div>
            );
          })}
        </div>

        {/* Botones finales */}
        <div className="px-6 pb-8 flex flex-col items-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full max-w-sm py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 transition hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              boxShadow: "0 8px 25px rgba(124,58,237,0.4)",
            }}
          >
            <Printer className="w-5 h-5" />
            IMPRIMIR TICKET(S)
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 text-sm hover:text-slate-700 underline transition"
          >
            Ir a Mis Viajes
          </button>
        </div>
      </div>
    </div>
  );
}
