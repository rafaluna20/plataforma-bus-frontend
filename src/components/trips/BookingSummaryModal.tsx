"use client";

import { X, MapPin, Clock, Ruler, CreditCard, ChevronDown } from "lucide-react";
import type { Seat, Passenger, TripSummary } from "@/types/booking";

interface BookingSummaryModalProps {
  trip: TripSummary;
  selectedSeats: Seat[];
  passengers: Passenger[];
  onClose: () => void;
  onPay: () => void;  // now opens PaymentModal
}

export default function BookingSummaryModal({
  trip,
  selectedSeats,
  passengers,
  onClose,
  onPay,
}: BookingSummaryModalProps) {
  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const estimatedKm = 452;
  const estimatedHours = trip.duration;

  const departureDate = new Date(trip.departureTime);
  const dateStr = departureDate.toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto"
        style={{ background: "#e5e7eb" }}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-slate-700 hover:bg-slate-600 text-white rounded-full p-1.5 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Título */}
        <div className="flex justify-center pt-6 pb-4 px-6">
          <div className="bg-slate-900 text-white text-sm font-black tracking-widest uppercase px-10 py-2 rounded-md shadow-lg">
            RESUMEN
          </div>
        </div>

        {/* Bloque Origen / Destino */}
        <div className="grid grid-cols-2 gap-4 px-6 pb-5">
          {/* ORIGEN */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <div className="bg-slate-800 text-white text-[10px] font-bold tracking-widest px-3 py-1.5 uppercase">
              Origen:
            </div>
            <div className="bg-slate-100 p-3 text-[11px] text-slate-700 space-y-1">
              <p>
                <span className="font-black text-slate-900">ORIGEN :</span>{" "}
                {trip.origin.toUpperCase()}
              </p>
              <p>
                <span className="font-black text-slate-900">DIRECCIÓN:</span>{" "}
                Terminal Terrestre Central
              </p>
              <p>
                <span className="font-black text-slate-900">referencia:</span>{" "}
                Frente al parque central
              </p>
              <p>
                <span className="font-black text-slate-900">contacto:</span>{" "}
                +51 987 654 321
              </p>
            </div>
          </div>

          {/* DESTINO */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <div className="bg-slate-800 text-white text-[10px] font-bold tracking-widest px-3 py-1.5 uppercase">
              Destino:
            </div>
            <div className="bg-slate-100 p-3 text-[11px] text-slate-700 space-y-1">
              <p>
                <span className="font-black text-slate-900">DESTINO :</span>{" "}
                {trip.destination.toUpperCase()}
              </p>
              <p>
                <span className="font-black text-slate-900">DIRECCIÓN:</span>{" "}
                Terminal Terrestre Principal
              </p>
              <p>
                <span className="font-black text-slate-900">referencia:</span>{" "}
                Parque Romero
              </p>
              <p>
                <span className="font-black text-slate-900">contacto:</span>{" "}
                +51 912 345 678
              </p>
            </div>
          </div>
        </div>

        {/* Bloque Datos Pasajeros + Tiempo/Costo */}
        <div className="flex flex-col gap-4 px-6 pb-5">
          {passengers.map((p, i) => (
            <div key={p.seatId} className="grid grid-cols-2 gap-4">
              {/* Datos del Pasajero */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <div className="bg-slate-800 text-white text-[10px] font-bold tracking-widest px-3 py-1.5 uppercase">
                  Datos del Pasajero {passengers.length > 1 ? `0${i + 1}` : ""}
                </div>
                <div className="bg-slate-100 p-3 space-y-2">
                  {/* DNI Row */}
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded w-20 text-center shrink-0">
                      DNI
                    </div>
                    <div className="flex-1 bg-[#d1d5db] text-slate-800 text-[11px] px-2 py-1 rounded font-medium">
                      {p.dni || "—"}
                    </div>
                  </div>
                  {/* Nombre Row */}
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded w-20 text-center shrink-0">
                      NOMBRE
                    </div>
                    <div className="flex-1 bg-[#d1d5db] text-slate-800 text-[11px] px-2 py-1 rounded font-medium uppercase">
                      {p.nombre || "—"}
                    </div>
                  </div>
                  {/* Teléfono Row */}
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded w-20 text-center shrink-0">
                      TELEFONO
                    </div>
                    <div className="flex-1 bg-[#d1d5db] text-slate-800 text-[11px] px-2 py-1 rounded font-medium">
                      {p.telefono || "—"}
                    </div>
                  </div>
                  {/* Asiento */}
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded w-20 text-center shrink-0">
                      ASIENTO
                    </div>
                    <div className="flex-1 bg-[#d1d5db] text-slate-800 text-[11px] px-2 py-1 rounded font-bold">
                      #{selectedSeats.find(s => s.id === p.seatId)?.label || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiempo - Costo (solo en el primer pasajero) */}
              {i === 0 && (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  <div className="bg-slate-800 text-white text-[10px] font-bold tracking-widest px-3 py-1.5 uppercase">
                    Tiempo - Costo
                  </div>
                  <div className="bg-slate-100 p-4 space-y-3 text-[12px] text-slate-700">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <span className="font-black text-slate-900">TIEMPO APROX :</span>{" "}
                        {estimatedHours}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <span className="font-black text-slate-900">DISTANCIA:</span>{" "}
                        {estimatedKm} km
                      </span>
                    </p>
                    <div className="border-t border-slate-300 pt-3">
                      <p className="flex items-start gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-black text-slate-900">COSTO TOTAL: </span>
                          <span className="text-base font-black text-emerald-700">
                            S/ {totalPrice.toFixed(2)} soles
                          </span>
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 ml-6">
                        {selectedSeats.length} asiento(s) · {dateStr}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Datos Adicionales (Botón expandible, de momento estático) */}
        <div className="px-6 pb-6">
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold uppercase tracking-widest px-5 py-2 rounded-md transition shadow">
            DATOS ADICIONALES
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Separador y Botón PAGAR */}
        <div className="border-t border-slate-300 px-6 py-6 flex justify-center">
          <button
            onClick={onPay}
            className="w-48 py-3.5 rounded-xl font-black text-white text-lg tracking-widest uppercase shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #f43f5e, #fb7185)",
              boxShadow: "0 8px 25px rgba(244, 63, 94, 0.45)",
            }}
          >
            PAGAR
          </button>
        </div>
      </div>
    </div>
  );
}
