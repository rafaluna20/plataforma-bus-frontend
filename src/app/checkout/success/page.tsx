"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, QrCode, Download, Navigation } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const bookingId = searchParams.get('bookingId');
  const tripId = searchParams.get('tripId');

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] py-12">
      {/* Success Icon */}
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 pulse-glow">
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
      </div>

      <h1 className="text-4xl font-bold text-white mb-4 text-center">¡Reserva Confirmada!</h1>
      <p className="text-slate-400 text-center mb-10 max-w-md">
        Tu pago ha sido procesado exitosamente y tu asiento está reservado. Hemos enviado un recibo a tu correo.
      </p>

      {/* Ticket Card */}
      <div className="bg-slate-900/80 border border-slate-700 w-full rounded-3xl overflow-hidden shadow-2xl relative mb-8">
        {/* Ticket decoration */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-black rounded-full border-r border-slate-700"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-black rounded-full border-l border-slate-700"></div>
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-slate-700"></div>

        <div className="p-8 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">ID de Reserva</p>
            <p className="font-mono text-lg text-white font-bold">{bookingId ? bookingId.substring(0, 13).toUpperCase() : 'BKG-00001'}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">Fecha</p>
            <p className="text-white font-bold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="p-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 space-y-4 w-full">
            <div className="flex justify-between">
              <span className="text-slate-400">Origen / Destino</span>
              <span className="text-white font-medium">Lima - Huancayo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pasajero</span>
              <span className="text-white font-medium">Juan Perez</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado de Pago</span>
              <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">Pagado</span>
            </div>
          </div>
          
          <div className="bg-white p-2 rounded-xl flex-shrink-0">
            <QrCode className="w-24 h-24 text-slate-900" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row w-full gap-4 justify-center">
        <button 
          onClick={() => router.push(`/tracking/${tripId || '11111111-1111-1111-1111-111111111111'}`)}
          className="flex-1 py-4 px-6 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          <Navigation className="w-5 h-5" />
          Rastrear Viaje en Vivo
        </button>
        <button className="flex-1 py-4 px-6 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
          <Download className="w-5 h-5" />
          Descargar Boleta
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
