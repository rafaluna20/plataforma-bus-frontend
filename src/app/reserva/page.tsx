"use client";

import { useState } from "react";
import { CheckCircle2, Navigation, UserCircle, CreditCard, Smartphone, Loader2, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";

const mockSeats = Array.from({ length: 12 }, (_, i) => ({
  id: `S${i + 1}`,
  status: i === 2 || i === 5 ? "taken" : "available",
  price: 45.00
}));

export default function ReservaPage() {
  const router = useRouter();
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'YAPE' | 'PLIN'>('CARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment form states
  const [cardNumber, setCardNumber] = useState('');
  const [phone, setPhone] = useState('');

  const handleSeatClick = (seatId: string, status: string) => {
    if (status === "taken") return;
    setSelectedSeat(seatId === selectedSeat ? null : seatId);
    setErrorMsg('');
  };

  const selectedPrice = selectedSeat ? mockSeats.find(s => s.id === selectedSeat)?.price : 0;

  const handlePayment = async () => {
    if (!selectedSeat) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/v1/bookings/digital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: "11111111-1111-1111-1111-111111111111", // mock trip id
          passengerName: "Juan Perez",
          passengerDocType: "DNI",
          passengerDocNum: "12345678",
          startWaypointId: "3dc8d2bd-7d40-404f-93b6-aa9857088671", // Lima - Terminal Yerbateros
          endWaypointId: "224f56e5-23b8-4e63-bc34-7c82bf0c19ca",   // Huancayo - Terminal Central
          seatId: selectedSeat,
          paymentDetails: {
            method: paymentMethod,
            token: paymentMethod === 'CARD' ? cardNumber : undefined,
            phoneNumber: paymentMethod !== 'CARD' ? phone : undefined
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el pago');
      }

      // Éxito: Redirigir a success
      router.push(`/checkout/success?bookingId=${data.booking.id}&tripId=11111111-1111-1111-1111-111111111111`);
      
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: Trip Details & Seat Map */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Trip Header */}
        <div className="glass-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Lima <ArrowIcon /> Huancayo</h2>
            <p className="text-slate-400 text-sm">Hoy, 10:30 PM • Minivan VIP (12 Asientos)</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Empresa</p>
            <p className="font-semibold text-cyan-400">Transportes Flash</p>
          </div>
        </div>

        {/* Seat Map */}
        <div className="glass-card p-6 md:p-10 flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-8 text-white w-full text-left">Selecciona tu asiento</h3>
          
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 relative w-full max-w-sm">
            <div className="w-24 h-2 bg-slate-700 mx-auto rounded-full mb-8" />
            
            <div className="grid grid-cols-3 gap-y-6 gap-x-4">
              {mockSeats.map((seat) => (
                <div 
                  key={seat.id}
                  onClick={() => handleSeatClick(seat.id, seat.status)}
                  className={`
                    seat w-14 h-14 rounded-xl flex items-center justify-center font-bold text-sm select-none
                    ${seat.status === 'taken' ? 'seat-taken text-slate-600' : ''}
                    ${seat.status === 'available' && selectedSeat !== seat.id ? 'seat-available text-slate-300' : ''}
                    ${selectedSeat === seat.id ? 'seat-selected text-white shadow-lg shadow-indigo-500/50' : ''}
                  `}
                >
                  {seat.id}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-6 mt-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#334155] border border-[#475569]"></div> Disponible
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-500 border border-indigo-400"></div> Seleccionado
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#1e293b] opacity-50"></div> Ocupado
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Checkout Summary */}
      <div className="space-y-6">
        <div className="glass-card p-6 sticky top-24">
          <h3 className="text-xl font-semibold mb-6 text-white border-b border-white/10 pb-4">Resumen de Compra</h3>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-2"><UserCircle className="w-4 h-4 text-slate-500"/> Asiento</span>
              <span className="font-medium text-white">{selectedSeat || "Ninguno"}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-2"><Navigation className="w-4 h-4 text-slate-500"/> Precio Tramo</span>
              <span className="font-medium text-white">S/ {selectedPrice?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Tasa por servicio</span>
              <span className="font-medium text-white">S/ 0.00</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mb-6">
            <div className="flex justify-between items-end">
              <span className="text-slate-400">Total a Pagar</span>
              <span className="text-3xl font-bold gradient-text">
                S/ {selectedPrice?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          {selectedSeat && (
            <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-sm font-medium text-slate-400">Método de Pago</h4>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'CARD' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-medium">Tarjeta</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('YAPE')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'YAPE' ? 'bg-[#742284]/20 border-[#742284] text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs font-medium">Yape</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('PLIN')}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'PLIN' ? 'bg-[#00E0A6]/20 border-[#00E0A6] text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-medium">Plin</span>
                </button>
              </div>

              {/* Dynamic Payment Input */}
              <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-white/5">
                {paymentMethod === 'CARD' ? (
                  <div className="space-y-3">
                    <label className="text-xs text-slate-400">Número de Tarjeta (Simulador)</label>
                    <input 
                      type="text" 
                      placeholder="**** **** **** **** (Termina en 000 para forzar error)" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-xs text-slate-400">Número de Celular ({paymentMethod})</label>
                    <input 
                      type="text" 
                      placeholder="999 999 999 (Termina en 000 para forzar error)" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          <button 
            disabled={!selectedSeat || isProcessing}
            onClick={handlePayment}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
              ${!selectedSeat || isProcessing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:scale-105 shadow-lg shadow-indigo-500/25' 
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando Pago Seguro...
              </>
            ) : selectedSeat ? (
              <>
                Pagar S/ {selectedPrice?.toFixed(2)}
              </>
            ) : (
              "Selecciona un Asiento"
            )}
          </button>
          
          {selectedSeat && !isProcessing && (
             <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pago 100% Seguro (Simulado)
             </div>
          )}
        </div>
      </div>

    </div>
  );
}

function ArrowIcon() {
  return (
    <span className="inline-block mx-2 text-slate-600">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </span>
  );
}
