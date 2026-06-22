"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Seat, Passenger } from "@/types/booking";

// Map definition matching the 2-aisle-1 layout
const SEAT_MAP_PISO_1: (Seat | null)[][] = [
  [
    { id: "P1-1A", label: "1", status: "libre", price: 50 },
    { id: "P1-1B", label: "2", status: "libre", price: 50 },
    null,
    { id: "P1-1C", label: "3", status: "proceso", price: 50 },
  ],
  [
    { id: "P1-2A", label: "4", status: "libre", price: 50 },
    { id: "P1-2B", label: "5", status: "ocupado", price: 50 },
    null,
    { id: "P1-2C", label: "6", status: "libre", price: 50 },
  ],
  [
    { id: "P1-3A", label: "7", status: "ocupado", price: 50 },
    { id: "P1-3B", label: "8", status: "libre", price: 50 },
    null,
    { id: "P1-3C", label: "9", status: "libre", price: 50 },
  ],
  [
    { id: "P1-4A", label: "10", status: "libre", price: 40 },
    { id: "P1-4B", label: "11", status: "ocupado", price: 40 },
    null,
    { id: "P1-4C", label: "12", status: "libre", price: 40 },
  ],
];

const SEAT_MAP_PISO_2: (Seat | null)[][] = [
  [
    { id: "P2-1A", label: "13", status: "libre", price: 50 },
    { id: "P2-1B", label: "14", status: "libre", price: 50 },
    null,
    { id: "P2-1C", label: "15", status: "libre", price: 50 },
  ],
  [
    { id: "P2-2A", label: "16", status: "libre", price: 50 },
    { id: "P2-2B", label: "17", status: "libre", price: 50 },
    null,
    { id: "P2-2C", label: "18", status: "libre", price: 50 },
  ],
  [
    { id: "P2-3A", label: "19", status: "libre", price: 50 },
    { id: "P2-3B", label: "20", status: "libre", price: 50 },
    null,
    null,
  ],
  [
    { id: "P2-4A", label: "21", status: "libre", price: 50 },
    { id: "P2-4B", label: "22", status: "libre", price: 50 },
    null,
    { id: "P2-4C", label: "23", status: "proceso", price: 50 },
  ],
  [
    { id: "P2-5A", label: "24", status: "libre", price: 50 },
    { id: "P2-5B", label: "25", status: "libre", price: 50 },
    null,
    { id: "P2-5C", label: "26", status: "libre", price: 50 },
  ],
  [
    { id: "P2-6A", label: "27", status: "libre", price: 50 },
    { id: "P2-6B", label: "28", status: "ocupado", price: 50 },
    null,
    { id: "P2-6C", label: "29", status: "libre", price: 50 },
  ],
  [
    { id: "P2-7A", label: "30", status: "libre", price: 50 },
    { id: "P2-7B", label: "31", status: "libre", price: 50 },
    null,
    { id: "P2-7C", label: "32", status: "libre", price: 50 },
  ],
  [
    { id: "P2-8A", label: "33", status: "libre", price: 50 },
    { id: "P2-8B", label: "34", status: "libre", price: 50 },
    null,
    { id: "P2-8C", label: "35", status: "libre", price: 50 },
  ],
];

interface SeatSelectionModalProps {
  origin: string;
  destination: string;
  onClose: () => void;
  onConfirm: (selectedSeats: Seat[], passengers: Passenger[]) => void;
}

export default function SeatSelectionModal({ origin, destination, onClose, onConfirm }: SeatSelectionModalProps) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);
  const [passengers, setPassengers] = useState<Record<string, Passenger>>({});

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== 'libre') return;

    setSelectedSeatIds((prev) => {
      const isSelected = prev.includes(seat.id);
      
      if (isSelected) {
        // Quitar el pasajero asociado
        setPassengers(curr => {
          const newPass = { ...curr };
          delete newPass[seat.id];
          return newPass;
        });
        return prev.filter((id) => id !== seat.id);
      } else {
        // Agregar pasajero inicial
        setPassengers(curr => ({
          ...curr,
          [seat.id]: { seatId: seat.id, dni: "", nombre: "", telefono: "", partida: origin, destino: destination }
        }));
        return [...prev, seat.id];
      }
    });
  };

  const handlePassengerChange = (seatId: string, field: keyof Passenger, value: string) => {
    setPassengers(curr => ({
      ...curr,
      [seatId]: {
        ...curr[seatId],
        [field]: value
      }
    }));
  };

  const getSeatColorClass = (seat: Seat) => {
    if (selectedSeatIds.includes(seat.id)) return "bg-yellow-400 border-yellow-600 shadow-[0_0_15px_rgba(250,204,21,0.6)] ring-2 ring-yellow-300";
    switch (seat.status) {
      case 'libre': return "bg-emerald-400 border-emerald-600 hover:bg-emerald-300 cursor-pointer";
      case 'ocupado': return "bg-red-500 border-red-700 cursor-not-allowed opacity-80";
      case 'reservado': return "bg-purple-500 border-purple-700 cursor-not-allowed opacity-80";
      case 'proceso': return "bg-blue-400 border-blue-600 cursor-not-allowed opacity-80";
      default: return "bg-gray-300 border-gray-500 cursor-not-allowed";
    }
  };

  const allSeats = [...SEAT_MAP_PISO_1, ...SEAT_MAP_PISO_2].flat().filter((s): s is Seat => s !== null);
  const selectedSeatsData = allSeats.filter(s => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeatsData.reduce((acc, curr) => acc + curr.price, 0);

  const currentMap = activeFloor === 1 ? SEAT_MAP_PISO_1 : SEAT_MAP_PISO_2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-6xl w-full shadow-2xl relative flex flex-col md:flex-row gap-8 my-auto h-[90vh] md:h-[80vh]">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lado Izquierdo: Bus Layout (Con Scroll si es largo) */}
        <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scrollbar pb-6 pr-2">
          
          <div className="w-full max-w-xs space-y-3 mb-6 bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-inner shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Origen</span>
              <div className="flex-1 bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-700 truncate">
                {origin}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Destino</span>
              <div className="flex-1 bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-700 truncate">
                {destination}
              </div>
            </div>
          </div>

          {/* Pestañas de Pisos */}
          <div className="flex gap-2 mb-4 w-full max-w-[340px] shrink-0">
            <button
              onClick={() => setActiveFloor(1)}
              className={cn(
                "flex-1 py-2 rounded-t-xl text-xs font-bold transition-all border border-b-0",
                activeFloor === 1 
                  ? "bg-slate-300 text-slate-900 border-slate-400" 
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              )}
            >
              PRIMER PISO
            </button>
            <button
              onClick={() => setActiveFloor(2)}
              className={cn(
                "flex-1 py-2 rounded-t-xl text-xs font-bold transition-all border border-b-0",
                activeFloor === 2 
                  ? "bg-purple-500 text-white border-purple-400 shadow-[0_-5px_15px_rgba(168,85,247,0.3)]" 
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              )}
            >
              SEGUNDO PISO
            </button>
          </div>

          {/* Bus Chassis Graphic */}
          <div className={cn(
            "relative w-full max-w-[340px] bg-slate-300 rounded-b-3xl pb-8 pt-6 border-8 border-slate-400 shadow-2xl flex flex-col items-center shrink-0",
            activeFloor === 1 ? "rounded-t-[60px]" : "rounded-t-xl"
          )}>
            
            {/* Llantas */}
            {activeFloor === 1 ? (
              <>
                <div className="absolute top-32 -left-4 w-4 h-16 bg-slate-800 rounded-l-md shadow-lg" />
                <div className="absolute top-32 -right-4 w-4 h-16 bg-slate-800 rounded-r-md shadow-lg" />
                <div className="absolute bottom-12 -left-4 w-4 h-16 bg-slate-800 rounded-l-md shadow-lg" />
                <div className="absolute bottom-12 -right-4 w-4 h-16 bg-slate-800 rounded-r-md shadow-lg" />
              </>
            ) : (
              <>
                <div className="absolute top-16 -left-4 w-4 h-16 bg-slate-800 rounded-l-md shadow-lg" />
                <div className="absolute top-16 -right-4 w-4 h-16 bg-slate-800 rounded-r-md shadow-lg" />
                <div className="absolute bottom-16 -left-4 w-4 h-16 bg-slate-800 rounded-l-md shadow-lg" />
                <div className="absolute bottom-16 -right-4 w-4 h-16 bg-slate-800 rounded-r-md shadow-lg" />
              </>
            )}

            {/* Timón (Solo Piso 1) */}
            {activeFloor === 1 && (
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-slate-400">
                <div className="w-10 h-10 border-4 border-red-500 rounded-full flex items-center justify-center relative">
                  <div className="w-full h-1 bg-red-500 absolute" />
                  <div className="w-1 h-full bg-red-500 absolute" />
                  <div className="w-3 h-3 bg-slate-800 rounded-full z-10" />
                </div>
              </div>
            )}

            {/* Asientos (Grid) */}
            <div className="w-full px-6 flex flex-col gap-5">
              {currentMap.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex justify-between w-full h-12">
                  
                  {/* Left Side (2 Seats) */}
                  <div className="flex gap-2">
                    {row.slice(0, 2).map((seat) => {
                      if (!seat) return null;
                      const isSelected = selectedSeatIds.includes(seat.id);
                      return (
                        <div 
                          key={seat.id} 
                          onClick={() => handleSeatClick(seat)}
                          className="relative flex flex-col items-center justify-center group"
                        >
                          <div className={cn(
                            "absolute -top-1 w-10 h-12 rounded-t-xl transition-all duration-200",
                            isSelected ? "bg-yellow-600" : "bg-emerald-600",
                            seat.status === 'ocupado' && "bg-red-800",
                            seat.status === 'reservado' && "bg-purple-800",
                            seat.status === 'proceso' && "bg-blue-800"
                          )} />
                          <div className={cn(
                            "relative w-10 h-10 rounded-lg border-2 flex items-center justify-center shadow-md transition-all duration-200 transform",
                            getSeatColorClass(seat),
                            seat.status === 'libre' && !isSelected && "hover:-translate-y-0.5",
                            isSelected && "scale-105"
                          )}>
                            <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                              {seat.status !== 'ocupado' ? (
                                <span className="text-white text-[9px] font-bold">
                                  {seat.price}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="absolute -left-1 top-2 w-1.5 h-6 bg-slate-500 rounded-full" />
                          <div className="absolute -right-1 top-2 w-1.5 h-6 bg-slate-500 rounded-full" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Pasillo central */}
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    <div className="w-px h-full bg-slate-400/20 border-dashed" />
                  </div>

                  {/* Right Side (1 Seat) */}
                  <div className="flex justify-end w-[44px]">
                    {row[3] ? (() => {
                      const seat = row[3];
                      const isSelected = selectedSeatIds.includes(seat.id);
                      return (
                        <div 
                          onClick={() => handleSeatClick(seat)}
                          className="relative flex flex-col items-center justify-center group"
                        >
                          <div className={cn(
                            "absolute -top-1 w-10 h-12 rounded-t-xl transition-all duration-200",
                            isSelected ? "bg-yellow-600" : "bg-emerald-600",
                            seat.status === 'ocupado' && "bg-red-800",
                            seat.status === 'reservado' && "bg-purple-800",
                            seat.status === 'proceso' && "bg-blue-800"
                          )} />
                          <div className={cn(
                            "relative w-10 h-10 rounded-lg border-2 flex items-center justify-center shadow-md transition-all duration-200 transform",
                            getSeatColorClass(seat),
                            seat.status === 'libre' && !isSelected && "hover:-translate-y-0.5",
                            isSelected && "scale-105"
                          )}>
                            <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center">
                              {seat.status !== 'ocupado' ? (
                                <span className="text-white text-[9px] font-bold">
                                  {seat.price}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="absolute -left-1 top-2 w-1.5 h-6 bg-slate-500 rounded-full" />
                          <div className="absolute -right-1 top-2 w-1.5 h-6 bg-slate-500 rounded-full" />
                        </div>
                      );
                    })() : (
                      <div className="w-10 h-12 border-4 border-slate-400/50 rounded-xl bg-red-500/10 flex items-center justify-center overflow-hidden">
                        <div className="flex flex-col w-full h-full justify-between py-1">
                          <div className="h-0.5 w-full bg-red-400/50"></div>
                          <div className="h-0.5 w-full bg-red-400/50"></div>
                          <div className="h-0.5 w-full bg-red-400/50"></div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
            
            <div className="mt-8 text-xs font-bold text-slate-500 bg-slate-200 px-4 py-1 rounded-full shadow-inner border border-slate-300">
              PISO {activeFloor}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Contenido Dinámico (Leyenda o Formularios) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 space-y-6">
            {selectedSeatIds.length === 0 ? (
              <>
                <h3 className="text-2xl font-bold text-white text-center md:text-left pt-4">Leyenda de Asientos</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-16 py-1.5 bg-emerald-400 border-b-4 border-emerald-600 rounded-md text-center shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                        <span className="text-[10px] font-bold text-emerald-950 uppercase">Libres</span>
                      </div>
                      <span className="text-slate-300 text-sm font-medium">Asiento Libre</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-lg">
                      {allSeats.filter(s => s.status === 'libre').length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-16 py-1.5 bg-red-500 border-b-4 border-red-700 rounded-md text-center shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                        <span className="text-[10px] font-bold text-white uppercase">Ocupado</span>
                      </div>
                      <span className="text-slate-300 text-sm font-medium">Asiento Ocupado</span>
                    </div>
                    <span className="bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded-lg">
                      {allSeats.filter(s => s.status === 'ocupado').length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-16 py-1.5 bg-purple-500 border-b-4 border-purple-700 rounded-md text-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                        <span className="text-[10px] font-bold text-white uppercase">Reserva</span>
                      </div>
                      <span className="text-slate-300 text-sm font-medium">Reservado</span>
                    </div>
                    <span className="bg-purple-500/20 text-purple-400 font-bold px-3 py-1 rounded-lg">
                      {allSeats.filter(s => s.status === 'reservado').length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-16 py-1.5 bg-blue-400 border-b-4 border-blue-600 rounded-md text-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                        <span className="text-[10px] font-bold text-blue-950 uppercase">Proceso</span>
                      </div>
                      <span className="text-slate-300 text-sm font-medium">En Proceso</span>
                    </div>
                    <span className="bg-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-lg">
                      {allSeats.filter(s => s.status === 'proceso').length}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="pt-4 space-y-6">
                <h3 className="text-2xl font-bold text-white mb-2">Datos de Pasajeros</h3>
                
                {/* Lista de Formularios */}
                {selectedSeatsData.map((seat, index) => {
                  const passData = passengers[seat.id];
                  return (
                    <div key={seat.id} className="w-full">
                      {/* Pestaña PASAJERO X */}
                      <div className="bg-[#a855f7] text-white text-xs font-bold px-6 py-2 rounded-t-lg inline-flex items-center gap-2">
                        PASAJERO {String(index + 1).padStart(2, '0')}
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">ASIENTO #{seat.label}</span>
                      </div>
                      
                      {/* Cuerpo del Formulario */}
                      <div className="bg-[#d1d5db] border-2 border-[#3b82f6] rounded-b-xl rounded-tr-xl p-5 shadow-lg relative overflow-hidden">
                        
                        {/* DNI */}
                        <div className="mb-4">
                          <div className="bg-[#374151] text-white text-[10px] font-bold px-3 py-1 rounded-t-md w-full border border-b-0 border-[#374151] flex items-center justify-between">
                            <span>DNI</span>
                            {passData?.dni && !/^\d{8}$/.test(passData.dni) && (
                              <span className="text-red-300 text-[9px] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 8 dígitos requeridos</span>
                            )}
                          </div>
                          <input 
                            type="text"
                            maxLength={8}
                            placeholder="BUSCAR>> ENTER" 
                            value={passData?.dni || ""}
                            onChange={(e) => handlePassengerChange(seat.id, "dni", e.target.value.replace(/\D/g, ""))}
                            className={cn(
                              "w-full px-3 py-2.5 bg-white text-slate-800 rounded-b-md shadow-sm outline-none border transition-colors text-sm font-medium",
                              passData?.dni && !/^\d{8}$/.test(passData.dni)
                                ? "border-red-400 focus:border-red-500"
                                : "border-slate-300 focus:border-[#3b82f6]"
                            )}
                          />
                        </div>

                        {/* NOMBRE */}
                        <div className="mb-4">
                          <div className="bg-[#374151] text-white text-[10px] font-bold px-3 py-1 rounded-t-md w-full border border-b-0 border-[#374151]">
                            NOMBRE
                          </div>
                          <input 
                            type="text" 
                            placeholder="EJ: EMPRESA LUZ DEL SUR SAC" 
                            value={passData?.nombre || ""}
                            onChange={(e) => handlePassengerChange(seat.id, "nombre", e.target.value)}
                            className="w-full px-3 py-2.5 bg-white text-slate-800 rounded-b-md shadow-sm outline-none border border-slate-300 focus:border-[#3b82f6] transition-colors text-sm font-medium uppercase" 
                          />
                        </div>

                        {/* TELEFONO */}
                        <div className="mb-6">
                          <div className="bg-[#374151] text-white text-[10px] font-bold px-3 py-1 rounded-t-md w-full border border-b-0 border-[#374151]">
                            TELEFONO
                          </div>
                          <input 
                            type="text" 
                            placeholder="EJ: 94854585" 
                            value={passData?.telefono || ""}
                            onChange={(e) => handlePassengerChange(seat.id, "telefono", e.target.value)}
                            className="w-full px-3 py-2.5 bg-white text-slate-800 rounded-b-md shadow-sm outline-none border border-slate-300 focus:border-[#3b82f6] transition-colors text-sm font-medium" 
                          />
                        </div>

                        {/* Botones Inferiores (Puntos) */}
                        <div className="flex flex-wrap gap-2">
                          <div className="bg-[#374151] text-white text-[10px] font-bold px-4 py-2 rounded-t-md border-b-4 border-slate-600 shadow-sm">
                            PUNTO DE PARTIDA
                          </div>
                          <div className="bg-[#374151] text-white text-[10px] font-bold px-4 py-2 rounded-t-md border-b-4 border-slate-600 shadow-sm opacity-80">
                            PUNTO DE DESTINO
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen y Botón de Acción Fijos Abajo */}
          <div className="mt-4 shrink-0 bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
            
            <div className="flex justify-between items-end mb-6 relative z-10">
              <div>
                <p className="text-slate-400 text-sm font-medium">Asientos</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {selectedSeatIds.length === 0 ? (
                    <span className="text-slate-500 italic text-sm">Ninguno</span>
                  ) : (
                    selectedSeatsData.map(s => (
                      <span key={s.id} className="bg-yellow-400/20 border border-yellow-500/50 text-yellow-400 font-bold px-2 py-0.5 rounded shadow-[0_0_8px_rgba(250,204,21,0.2)]">
                        #{s.label}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm font-medium mb-1">Total a Pagar</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  S/ {totalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {(() => {
              const passArr = Object.values(passengers);
              const allValid = passArr.length > 0 && passArr.every(
                p => /^\d{8}$/.test(p.dni) && p.nombre.trim().length >= 3 && p.telefono.trim().length >= 7
              );
              return (
                <>
                  {selectedSeatIds.length > 0 && !allValid && (
                    <p className="text-amber-400 text-xs text-center mb-3 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Completa DNI (8 dígitos), nombre y teléfono de todos los pasajeros
                    </p>
                  )}
                  <button 
                    onClick={() => { if (allValid) onConfirm(selectedSeatsData, passArr); }}
                    disabled={!allValid}
                    className={cn(
                      "w-full py-4 rounded-xl font-black text-lg transition-all duration-300 flex items-center justify-center gap-2",
                      allValid
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transform hover:-translate-y-1"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    )}
                  >
                    ACEPTAR
                    {allValid && <CheckCircle2 className="w-5 h-5" />}
                  </button>
                </>
              );
            })()}
          </div>
          
        </div>
      </div>
    </div>
  );
}
