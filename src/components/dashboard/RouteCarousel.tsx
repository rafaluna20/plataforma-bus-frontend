"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, ArrowRight, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

export interface RouteItem {
  id: string;
  destination: string;
  company: string;
  price?: number;
  color?: string; // Tailwind color class for the glowing accent
}

interface RouteCarouselProps {
  title: string;
  routes: RouteItem[];
}

export default function RouteCarousel({ title, routes }: RouteCarouselProps) {
  const [activeTab, setActiveTab] = useState<"PARA TI" | "POPULARES" | "NUEVOS">("PARA TI");

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          {title}
        </h3>
        
        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/5">
          {["PARA TI", "POPULARES", "NUEVOS"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                activeTab === tab 
                  ? "bg-slate-700 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Scrollable Feed */}
      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory custom-scrollbar">
          {routes.map((route, i) => (
            <div 
              key={route.id} 
              className={cn(
                "snap-start shrink-0 w-[280px] sm:w-[320px] rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:-translate-y-1 relative group/card",
              )}
            >
              <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br transition-opacity duration-300 group-hover/card:opacity-20", route.color || "from-indigo-500 to-purple-500")} />
              
              <div className="p-5 flex flex-col h-full justify-between relative z-10 space-y-4">
                
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5" />
                      Viaje a:
                    </div>
                    <h4 className="text-xl font-bold text-white">{route.destination}</h4>
                    <p className="text-slate-500 text-sm">{route.company}</p>
                  </div>
                  
                  {route.price && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-lg text-sm">
                      S/ {route.price.toFixed(2)}
                    </div>
                  )}
                </div>

                <Link
                  href="/buscar"
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                    "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  Reservar Ahora
                  <ArrowRight className="w-4 h-4" />
                </Link>
                
              </div>
            </div>
          ))}

          {/* Spacer for right margin scroll */}
          <div className="w-2 shrink-0" />
        </div>
      </div>
    </div>
  );
}
