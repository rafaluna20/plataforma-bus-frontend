"use client";

import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle, MapPin, Bus, DollarSign, Calendar, Clock, Map, Camera, ImagePlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Importación dinámica del mapa para evitar errores de SSR en Next.js
const LocationPicker = dynamic(
  () => import('@/components/map/LocationPicker'),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 animate-pulse">Cargando mapa interactivo...</div> }
);

export default function CrearViajePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [images, setImages] = useState<string[]>([]);
  const [marker, setMarker] = useState({ lat: -12.0464, lng: -77.0428 });
  const [flyTo, setFlyTo] = useState<{ lat: number, lng: number } | null>(null);
  
  // Estados para el Buscador y Mapa
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Buscador Geocoding con OpenStreetMap (Nominatim) - ¡Gratis y sin API Keys!
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=pe&limit=5`, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error("Error buscando ubicación:", err);
    }
  };

  const selectLocation = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMarker({ lat, lng });
    setFlyTo({ lat, lng });
    setSearchQuery(result.display_name.split(',')[0]);
    setSearchResults([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  if (typeof window !== "undefined" && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <PlusCircle className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Inicia sesión</h2>
        <p className="text-slate-400 mb-8">Debes iniciar sesión para publicar viajes.</p>
        <button 
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
        >
          Ir al Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 mt-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <PlusCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Crear Nuevo Viaje</h1>
          <p className="text-slate-400">Publica una nueva ruta para que los pasajeros reserven asientos.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <form className="space-y-8">
          
          {/* Origen y Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" /> Origen
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                placeholder="Ej: Lima (Terminal Yerbateros)" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400" /> Destino
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                placeholder="Ej: Huancayo (Terminal Central)" 
              />
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" /> Fecha de Salida
              </label>
              <input 
                type="date" 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Hora Exacta
              </label>
              <input 
                type="time" 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all [color-scheme:dark]" 
              />
            </div>
          </div>

          <div className="w-full h-px bg-slate-800/50"></div>

          {/* Vehículo y Precio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Bus className="w-4 h-4 text-slate-400" /> Vehículo / Flota
              </label>
              <select className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none">
                <option value="minivan_12">Minivan (12 Asientos) - ABC-123</option>
                <option value="bus_45">Bus 1 Piso (45 Asientos) - XYZ-987</option>
                <option value="auto_4">Auto VIP (4 Asientos) - QWE-456</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Precio Base (S/)
              </label>
              <input 
                type="number" 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                placeholder="Ej: 50.00" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Descripción o Notas (Opcional)</label>
            <textarea 
              rows={3} 
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none" 
              placeholder="Detalles sobre paradas, políticas de equipaje, servicio a bordo, etc."
            ></textarea>
          </div>

          {/* Escalas/Waypoints (Simulado) */}
          <div className="bg-slate-950/30 p-5 rounded-2xl border border-slate-800/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-slate-300 font-semibold flex items-center gap-2">
                <Map className="w-4 h-4 text-blue-400" /> Puntos de Parada (Ruta)
              </h4>
              <button type="button" className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg">
                + Agregar Parada
              </button>
            </div>
            <p className="text-sm text-slate-500">Actualmente este viaje es directo. Agrega paradas intermedias si recogerás pasajeros en el camino.</p>
          </div>

          <div className="w-full h-px bg-slate-800/50"></div>

          {/* Fotos / Imágenes del Vehículo */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" /> Fotos del Vehículo
            </h3>
            
            <div className="w-full border-2 border-dashed border-slate-700/50 hover:border-indigo-500/50 bg-slate-950/30 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 transition-colors relative overflow-hidden group">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                title="Sube tus imágenes"
              />
              
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full z-0 relative">
                  {images.map((imgUrl, i) => (
                    <div key={i} className="aspect-video bg-slate-800 rounded-xl overflow-hidden relative group/img">
                      <img src={imgUrl} alt={`Preview ${i}`} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-rose-500/80 px-2 py-1 rounded">X</span>
                      </div>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <div className="aspect-video bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors">
                      <PlusCircle className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Añadir más</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center z-0 relative py-4">
                  <ImagePlus className="w-10 h-10 mb-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  <p className="font-semibold text-slate-300">Haz clic o arrastra fotos (Optimizador Automático)</p>
                  <p className="text-sm mt-1">Sube hasta 5 imágenes (WebP, JPG, PNG). Compresión en el navegador.</p>
                </div>
              )}
            </div>
          </div>

          {/* Ubicación en Mapa con Buscador Leaflet */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-400" /> Ubicación Exacta de Salida
            </h3>
            <p className="text-sm text-slate-400">Busca una dirección o arrastra el mapa para establecer el punto preciso de embarque.</p>
            
            {/* Buscador de Direcciones */}
            <div className="relative z-20">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar terminal, avenida o ciudad..." 
                  className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-lg"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {searchResults.map((result: any) => (
                    <button 
                      key={result.place_id}
                      type="button"
                      onClick={() => selectLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 transition-colors flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="truncate">
                        <div className="text-slate-200 font-medium text-sm truncate">{result.display_name.split(',')[0]}</div>
                        <div className="text-slate-500 text-xs truncate">{result.display_name.split(',').slice(1).join(',')}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full h-[400px] bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 relative shadow-xl z-0">
              <LocationPicker marker={marker} setMarker={setMarker} flyTo={flyTo} />

              <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur text-xs px-3 py-2 rounded-lg text-slate-300 border border-slate-700 shadow-xl flex items-center gap-2 z-[400] pointer-events-none">
                <Map className="w-3 h-3 text-slate-400" /> {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="button" 
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
            >
              <PlusCircle className="w-5 h-5" />
              Publicar y Abrir Reservas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
