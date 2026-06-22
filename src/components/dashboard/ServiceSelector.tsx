"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bus, CarFront, Car, Package, Users, Map, Navigation } from "lucide-react";
import Link from "next/link";

export default function ServiceSelector() {
  const [activeService, setActiveService] = useState<"INTERPROVINCIAL" | "LOCAL" | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {/* Salidas Interprovinciales */}
      <div 
        className={cn(
          "relative overflow-hidden rounded-3xl border transition-all duration-500",
          activeService === "INTERPROVINCIAL" 
            ? "border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20" 
            : "border-white/10 hover:border-white/20 bg-slate-900/50 backdrop-blur-xl"
        )}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 opacity-50", activeService === "INTERPROVINCIAL" && "opacity-100 from-indigo-600/20 to-purple-600/20")} />
        
        <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1">Salidas Interprovinciales</h2>
              <p className="text-slate-400 text-sm">Viaja entre ciudades con máxima comodidad.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Map className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <Link href="/buscar?tipo=carga" className="group">
              <div className="bg-slate-800/80 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 p-4 rounded-2xl text-center transition-all duration-300 h-full flex flex-col items-center justify-center gap-3 hover:-translate-y-1">
                <Package className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-300 group-hover:text-white">Movilidad de Carga</span>
              </div>
            </Link>
            <Link href="/buscar?tipo=pasajeros" className="group">
              <div className="bg-slate-800/80 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 p-4 rounded-2xl text-center transition-all duration-300 h-full flex flex-col items-center justify-center gap-3 hover:-translate-y-1">
                <Users className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-300 group-hover:text-white">Movilidad de Pasajeros</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Salidas Locales */}
      <div 
        className={cn(
          "relative overflow-hidden rounded-3xl border transition-all duration-500",
          activeService === "LOCAL" 
            ? "border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" 
            : "border-white/10 hover:border-white/20 bg-slate-900/50 backdrop-blur-xl"
        )}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 opacity-50", activeService === "LOCAL" && "opacity-100 from-cyan-600/20 to-blue-600/20")} />
        
        <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1">Salidas Locales</h2>
              <p className="text-slate-400 text-sm">Transporte rápido dentro de la ciudad.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Navigation className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-auto">
            <Link href="/buscar?local=moto" className="group">
              <div className="bg-slate-800/80 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/30 p-3 rounded-2xl text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 hover:-translate-y-1">
                <div className="text-2xl group-hover:scale-110 transition-transform">🏍️</div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-300 group-hover:text-white leading-tight">Envío Agencias</span>
              </div>
            </Link>
            <Link href="/buscar?local=mototaxi" className="group">
              <div className="bg-slate-800/80 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/30 p-3 rounded-2xl text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 hover:-translate-y-1">
                <CarFront className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-xs font-bold text-slate-300 group-hover:text-white leading-tight">Envío Domicilio</span>
              </div>
            </Link>
            <Link href="/buscar?local=auto" className="group">
              <div className="bg-slate-800/80 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/30 p-3 rounded-2xl text-center transition-all duration-300 flex flex-col items-center justify-center gap-2 hover:-translate-y-1">
                <Car className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] sm:text-xs font-bold text-slate-300 group-hover:text-white leading-tight">Envío Empresarial</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
