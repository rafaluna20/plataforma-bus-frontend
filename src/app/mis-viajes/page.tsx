"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle, Map, Users, History, Wallet, User as UserIcon, ArrowUpRight, Bus, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MisViajesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("mis_viajes");

  // Si no hay usuario, mandarlo al login o mostrar un mensaje
  if (typeof window !== "undefined" && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión</h2>
        <p className="text-slate-400 mb-8">Debes iniciar sesión para acceder a tu billetera y panel de control.</p>
        <button 
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
        >
          Ir al Login
        </button>
      </div>
    );
  }

  const navItems = [
    { id: "mis_viajes", label: "Mis Viajes", icon: Map },
    { id: "pasajeros", label: "Mis Pasajeros", icon: Users },
    { id: "historial", label: "Historial", icon: History },
    { id: "depositos", label: "Depósitos", icon: Wallet },
    { id: "perfil", label: "Mi Perfil", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {user?.name?.[0] || "U"}
            </div>
            <h2 className="text-xl font-bold text-white">{user?.name || "Usuario"}</h2>
            <p className="text-sm text-blue-400 font-medium">{user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'DRIVER' ? 'Conductor' : 'Pasajero'}</p>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Saldo Disponible</div>
              <div className="text-2xl font-black text-white">S/ {user?.balance?.toFixed(2) || "0.00"}</div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === "mis_viajes" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold text-white mb-2">Mis Viajes</h1>
              <p className="text-slate-400 mb-8">Administra y revisa los viajes que has creado o en los que participas.</p>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Mock Card de un Viaje */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm text-emerald-400 font-bold mb-1">En Curso</div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">Lima → Trujillo</h3>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-xl">
                      <Bus className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Recaudación (Asientos):</span>
                      <span className="text-white font-bold">25 / 40</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[62%]"></div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                      <span className="text-slate-400 text-sm">Salida: Hoy 22:00</span>
                      <Link href="/viajes/trip-1" className="text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        Ver panel <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {activeTab === "pasajeros" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold text-white mb-2">Lista de Pasajeros</h1>
              <p className="text-slate-400 mb-8">Gestión de usuarios que han reservado en tus viajes.</p>
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Pasajero</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Viaje</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Asientos</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">JP</div>
                          <span className="text-white font-medium">Juan Perez</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">Lima → Trujillo</td>
                      <td className="p-4 text-slate-300">2</td>
                      <td className="p-4"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-md">Confirmado</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === "historial" || activeTab === "depositos" || activeTab === "perfil") && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
              <FileText className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sección en Construcción</h2>
              <p className="text-slate-500">Estamos trabajando para habilitar esta funcionalidad muy pronto.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
