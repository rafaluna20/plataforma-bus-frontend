"use client";

import TripCard from "@/components/trips/TripCard";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Search, ArrowRightLeft, Bus, ArrowRight, Clock, Map, Filter, CarFront, Car, WifiOff } from "lucide-react";
import type { Trip } from "@/types/booking";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function BuscarViajesPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Trip[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState("Todos");

  useEffect(() => {
    const fetchInitialTrips = async () => {
      try {
        const res = await fetch(`${API}/api/v1/trips/search?origin=&destination=&date=`);
        const data = await res.json();
        if (res.ok && data.trips) {
          setResults(data.trips);
          setNetworkError(false);
        }
      } catch {
        // API not available — silently skip initial load, user can still search manually
        setNetworkError(true);
      }
    };
    fetchInitialTrips();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setHasSearched(true);
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch(`${API}/api/v1/trips/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al buscar viajes");
      setResults(data.trips || []);
      setNetworkError(false);
    } catch (e: unknown) {
      const isNetworkErr = e instanceof TypeError && (e.message.includes("fetch") || e.message.includes("network"));
      setNetworkError(isNetworkErr);
      setError(isNetworkErr ? "No se pudo conectar al servidor. Verifica tu conexión." : (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const filteredResults = useMemo(() => {
    if (vehicleFilter === "Todos") return results;
    return results.filter(trip => trip.vehicleType?.toLowerCase() === vehicleFilter.toLowerCase());
  }, [results, vehicleFilter]);

  const quickFilters = [
    { id: "Todos", label: "Todos", icon: <Filter className="w-4 h-4" /> },
    { id: "Buscama", label: "Buscama", icon: <Bus className="w-4 h-4" /> },
    { id: "Minivan", label: "Minivan", icon: <CarFront className="w-4 h-4" /> },
    { id: "Auto", label: "Auto", icon: <Car className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-12">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 mt-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Viaja con <span className="gradient-text">Comodidad</span> <br className="hidden md:block"/>
          y <span className="text-white">Seguridad</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light">
          Encuentra y reserva pasajes de bus, auto o minivan a nivel interprovincial y local. 
          Tu viaje, a tu manera.
        </p>
      </div>

      {/* Banner de error de red */}
      {networkError && (
        <div className="w-full flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-5 py-3 rounded-xl text-sm font-medium">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>No hay conexión con el servidor. Los resultados pueden no estar disponibles.</span>
        </div>
      )}

      {/* Search Widget */}
      <div className="glass-card w-full p-2 rounded-2xl shadow-2xl relative z-10 hover-lift">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-2 bg-slate-900/50 p-4 rounded-xl">
          
          {/* Origin */}
          <div className="flex-1 w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="¿De dónde sales? (Ej: Lima)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          {/* Swap Button */}
          <button 
            type="button" 
            onClick={swapLocations}
            className="hidden md:flex items-center justify-center bg-slate-800 border border-slate-700 rounded-full p-3 text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-10 -mx-4 shrink-0 shadow-lg"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          {/* Destination */}
          <div className="flex-1 w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="¿A dónde vas? (Ej: Huancayo)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              required
            />
          </div>

          {/* Date */}
          <div className="flex-1 w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all [color-scheme:dark]"
              required
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white px-8 py-4 rounded-lg font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 hover:scale-105"
            disabled={loading}
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </div>

      {/* Quick Filters - Always visible */}
      <div className="w-full">
        <h2 className="text-xl font-bold text-white mb-4">Filtros Rápidos</h2>
        <div className="flex flex-wrap gap-3 items-center">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setVehicleFilter(filter.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border ${
                vehicleFilter === filter.id 
                  ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-transparent shadow-lg shadow-indigo-500/25"
                  : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {filter.icon}
              {filter.label}
              {vehicleFilter === filter.id && filter.id === "Todos" && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trip Cards (Initial or Search Results) */}
      {(hasSearched || results.length > 0) && (
        <div className="w-full space-y-6">
          <div className="flex flex-col space-y-2">
            <h2 className="text-xl font-bold text-white">
              {hasSearched ? "Resultados de tu Búsqueda" : "Salidas Programadas"}
            </h2>
            <p className="text-sm text-slate-400">
              {filteredResults.length} viaje(s) {hasSearched ? 'encontrado(s)' : 'disponible(s)'} {vehicleFilter !== "Todos" && `para ${vehicleFilter}`}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center mt-4">
              {error}
            </div>
          )}

          {!loading && !error && filteredResults.length === 0 && (
            <div className="glass-card p-12 text-center mt-4">
              <Bus className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-lg text-slate-300 font-semibold">No encontramos viajes con estos filtros</p>
              <p className="text-slate-500 text-sm mt-2">Intenta cambiar el tipo de vehículo u otra fecha.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredResults.map((trip: any) => {
              const tripOrigin = hasSearched ? origin : trip.route?.waypoints?.[0]?.station?.city || trip.route?.name?.split(' - ')[0] || "Origen";
              const tripDest = hasSearched ? destination : trip.route?.waypoints?.[trip.route.waypoints.length - 1]?.station?.city || trip.route?.name?.split(' - ')[1] || "Destino";

              return (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  originName={tripOrigin} 
                  destinationName={tripDest} 
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Features / Stats */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 ${hasSearched ? 'hidden' : ''}`}>
        <div className="glass-card p-6 text-center space-y-3 hover-lift">
          <div className="bg-indigo-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-400">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">Rutas Flexibles</h3>
          <p className="text-slate-400 text-sm">Paga solo por el tramo que viajas. Precios dinámicos y justos.</p>
        </div>
        
        <div className="glass-card p-6 text-center space-y-3 hover-lift">
          <div className="bg-cyan-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-cyan-400">
            <Bus className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">Variedad de Flotas</h3>
          <p className="text-slate-400 text-sm">Elige entre Autos VIP, Minivans rápidas o Buses de 2 pisos.</p>
        </div>
        
        <div className="glass-card p-6 text-center space-y-3 hover-lift">
          <div className="bg-emerald-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">Reserva Inmediata</h3>
          <p className="text-slate-400 text-sm">Bloquea tu asiento al instante y paga al contado al abordar.</p>
        </div>
      </div>

    </div>
  );
}
