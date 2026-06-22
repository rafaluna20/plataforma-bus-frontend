"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Seat } from "@/types/booking";

interface PaymentModalProps {
  userName: string;
  userAvatar?: string;
  selectedSeats: Seat[];
  onClose: () => void;
  onConfirm: () => void;
}

type PaymentMethod = "tarjeta" | "cass" | "yape" | "efectivo" | "paypal";

const PROCESSING_FEE = 1.0;

export default function PaymentModal({
  userName,
  userAvatar,
  selectedSeats,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("tarjeta");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const subtotal = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const total = subtotal + PROCESSING_FEE;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const paymentOptions: { key: PaymentMethod; label: string; logo: React.ReactNode }[] = [
    {
      key: "tarjeta",
      label: "Targeta de Debito o Credito",
      logo: (
        <div className="flex gap-1.5 items-center">
          {/* VISA */}
          <div className="bg-[#1a1f71] text-white text-[9px] font-black italic px-2 py-0.5 rounded font-serif">VISA</div>
          {/* MasterCard */}
          <div className="flex">
            <div className="w-5 h-5 bg-red-500 rounded-full opacity-90 -mr-2.5"></div>
            <div className="w-5 h-5 bg-yellow-400 rounded-full opacity-90"></div>
          </div>
          {/* Amex */}
          <div className="bg-[#2E77BC] text-white text-[8px] font-black px-1.5 py-0.5 rounded">AMEX</div>
        </div>
      ),
    },
    {
      key: "cass",
      label: "CASS",
      logo: (
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-red-600"></div>
          <span className="text-red-600 font-black text-sm">CASS</span>
        </div>
      ),
    },
    {
      key: "yape",
      label: "YAPE",
      logo: (
        <div className="bg-[#742284] text-white font-black text-sm px-3 py-1 rounded-xl">
          yape
        </div>
      ),
    },
    {
      key: "efectivo",
      label: "EFECTIVO",
      logo: (
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-yellow-900 text-[8px] font-black">P</span>
          </div>
          <span className="text-yellow-600 font-bold text-xs">PagoEfectivo</span>
        </div>
      ),
    },
    {
      key: "paypal",
      label: "PAYPAL",
      logo: (
        <div className="text-[#003087] font-black text-sm">
          Pay<span className="text-[#009cde]">Pal</span>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#e5e7eb] rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Header de usuario */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
            {initials}
          </div>
          <div className="flex-1 border border-rose-400 rounded-lg px-4 py-2">
            <p className="text-rose-500 font-bold text-sm">{userName}</p>
            <p className="text-slate-400 text-xs">VER SALDO</p>
          </div>
          <button className="border border-slate-300 rounded-lg px-4 py-2 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
            Mi QR
          </button>
          <div className="bg-amber-400 text-white font-black px-4 py-2 rounded-lg text-sm shadow">
            S/ {subtotal.toFixed(2)}
          </div>
          <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Título */}
        <div className="px-6 pt-5 pb-3">
          <div className="inline-flex bg-slate-800 text-white text-sm font-bold px-5 py-2 rounded-lg">
            Seleccionar Forma de Pago
          </div>
        </div>

        {/* Contenido principal: Métodos + Resumen */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
          
          {/* Columna Izquierda: Métodos de Pago */}
          <div className="space-y-3">
            {paymentOptions.map((opt) => (
              <div
                key={opt.key}
                onClick={() => setSelectedMethod(opt.key)}
                className={cn(
                  "bg-white rounded-xl border-2 p-4 cursor-pointer transition-all",
                  selectedMethod === opt.key
                    ? "border-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]"
                    : "border-transparent shadow-sm hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition",
                      selectedMethod === opt.key ? "border-purple-500" : "border-slate-300"
                    )}>
                      {selectedMethod === opt.key && (
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                      )}
                    </div>
                    <span className="text-slate-800 text-sm font-semibold">{opt.label}</span>
                  </div>
                  <div>{opt.logo}</div>
                </div>

                {/* Formulario de Tarjeta (solo visible si está seleccionado) */}
                {opt.key === "tarjeta" && selectedMethod === "tarjeta" && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-slate-500">Se aceptan todas las principales tarjetas.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[11px] text-slate-500 font-medium">Numero de tarjeta:</label>
                        <input
                          type="text"
                          maxLength={19}
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())}
                          className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-purple-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium">Fecha de vencimiento:</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-purple-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium">CCV/CCV:</label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="•••"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-purple-400 bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-slate-500 font-medium">Nombre del titular de la tarjeta:</label>
                        <input
                          type="text"
                          placeholder="NOMBRE COMPLETO"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-purple-400 bg-white uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Columna Derecha: Resumen de Costos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 h-fit">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 text-sm">Moneda de depósito</span>
              <div className="border border-slate-300 rounded px-3 py-1 text-sm text-slate-700">PE - Peru</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 text-sm">Monto de Pasaje</span>
              <div className="border border-slate-300 rounded px-3 py-1 text-sm text-slate-700 font-semibold">
                S/ {subtotal.toFixed(1)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 text-sm">tarifa de procesamiento</span>
              <div className="border border-slate-300 rounded px-3 py-1 text-sm text-slate-700">
                S/ {PROCESSING_FEE.toFixed(1)}
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="font-black text-slate-900 text-sm">TOTAL</span>
              <span className="font-black text-slate-900 text-sm">S/ {total.toFixed(1)}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Aceptas autorizar el uso de tu tarjeta para este deposito y futuras pagos
            </p>
          </div>
        </div>

        {/* Botón Confirmar Pago */}
        <div className="px-6 pb-8 flex justify-center">
          {(() => {
            const cardError =
              selectedMethod === "tarjeta" &&
              (!/^\d{16}$/.test(cardNumber.replace(/\s/g, "")) ||
                !cardName.trim() ||
                !/^\d{2}\/\d{2}$/.test(expiry) ||
                !/^\d{3,4}$/.test(cvv));

            return (
              <div className="w-full max-w-md space-y-3">
                {cardError && selectedMethod === "tarjeta" && cardNumber && (
                  <p className="text-amber-400 text-xs text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Completa todos los datos de la tarjeta correctamente
                  </p>
                )}
                <button
                  onClick={() => { if (!cardError) onConfirm(); }}
                  disabled={cardError}
                  className={cn(
                    "w-full py-4 rounded-xl font-black text-white text-base tracking-wider uppercase shadow-lg transition-all",
                    !cardError
                      ? "hover:scale-[1.02] active:scale-[0.98]"
                      : "opacity-60 cursor-not-allowed"
                  )}
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: !cardError ? "0 8px 25px rgba(124,58,237,0.4)" : "none",
                  }}
                >
                  CONFIRMAR PAGO &nbsp; S/ {total.toFixed(1)}
                </button>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
