"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Wallet, ArrowDownRight, ArrowUpRight, History, CreditCard, DollarSign } from "lucide-react";
import Link from "next/link";

export default function WalletPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (typeof window !== "undefined" && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión</h2>
        <p className="text-slate-400 mb-8">Debes iniciar sesión para acceder a tu billetera.</p>
        <button 
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
        >
          Ir al Login
        </button>
      </div>
    );
  }

  // Mock transactions
  const transactions = [
    { id: 1, type: "recarga", amount: 150.00, date: "2026-06-20", status: "Completado" },
    { id: 2, type: "pago", amount: -45.00, date: "2026-06-18", status: "Completado", desc: "Viaje Lima → Huancayo" },
    { id: 3, type: "retiro", amount: -100.00, date: "2026-06-15", status: "Procesando" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-4xl mx-auto p-6 md:p-12 mt-10">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Mi Billetera</h1>
            <p className="text-slate-400">Gestiona tus fondos, recargas y retiros.</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <DollarSign className="w-48 h-48 text-emerald-500" />
          </div>
          
          <div className="relative z-10">
            <p className="text-emerald-400 font-semibold mb-2 uppercase tracking-wider text-sm">Saldo Disponible</p>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8">
              <span className="text-3xl md:text-5xl text-slate-500 mr-2">S/</span>
              {user?.balance?.toFixed(2) || "0.00"}
            </h2>

            <div className="flex flex-wrap gap-4">
              <Link href="/billetera/recargar" className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30 active:scale-95">
                <ArrowDownRight className="w-5 h-5" />
                Recargar Saldo
              </Link>
              <Link href="/billetera/retirar" className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 hover:border-slate-600 transition-all active:scale-95">
                <ArrowUpRight className="w-5 h-5" />
                Retirar Fondos
              </Link>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              Últimos Movimientos
            </h3>
            <button className="text-emerald-400 text-sm font-semibold hover:text-emerald-300">Ver todos</button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors last:border-0">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    tx.type === 'recarga' ? 'bg-emerald-500/10 text-emerald-500' :
                    tx.type === 'retiro' ? 'bg-slate-800 text-slate-400' :
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    {tx.type === 'recarga' ? <ArrowDownRight className="w-6 h-6" /> : 
                     tx.type === 'retiro' ? <ArrowUpRight className="w-6 h-6" /> :
                     <CreditCard className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-white font-bold capitalize">
                      {tx.type === 'pago' ? tx.desc : tx.type}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{tx.date}</span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        tx.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}S/ {Math.abs(tx.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
