'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bus, CarFront, Car, MapPin, Filter, Search, X } from 'lucide-react';
import type { ViajeMapa } from '@/components/map/MapaInteractivo';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type CategoriaViaje = 'bus' | 'minivan' | 'auto';
type FiltroEstado = 'todos' | 'activo' | 'finalizado';

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIAS_CONFIG: Record<CategoriaViaje, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  bus:     { label: 'Bus',     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    icon: <Bus /> },
  minivan: { label: 'Minivan', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <CarFront /> },
  auto:    { label: 'Auto VIP',color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20', icon: <Car /> },
};

const formatSoles = (v: number) =>
  `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Mapa dinámico (evita errores SSR) ────────────────────────────────────────
const MapaInteractivo = dynamic(() => import('@/components/map/MapaInteractivo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Cargando mapa interactivo...</p>
      </div>
    </div>
  ),
});

// ─── Datos de Ejemplo ─────────────────────────────────────────────────────────
const mockViajes: ViajeMapa[] = [
  {
    id: '1',
    origen: 'Lima (Yerbateros)',
    destino: 'Huancayo',
    conductor: 'Juan Pérez',
    categoria: 'minivan',
    estado: true,
    coordenadas: { lat: -12.0621, lng: -76.9932 }, // Yerbateros, Lima
    precio: 45.00,
    urlimagen: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=60',
    pasajerosRestantes: 4
  },
  {
    id: '2',
    origen: 'La Oroya',
    destino: 'Tarma',
    conductor: 'Carlos Rojas',
    categoria: 'auto',
    estado: true,
    coordenadas: { lat: -11.5186, lng: -75.8988 }, // La Oroya
    precio: 25.00,
    urlimagen: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=60',
    pasajerosRestantes: 2
  },
  {
    id: '3',
    origen: 'Lima (Plaza Norte)',
    destino: 'Chimbote',
    conductor: 'Empresa Estrella',
    categoria: 'bus',
    estado: false, // Finalizado
    coordenadas: { lat: -11.9928, lng: -77.0607 }, // Plaza Norte
    precio: 60.00,
    urlimagen: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
    pasajerosRestantes: 0
  },
  {
    id: '4',
    origen: 'Arequipa',
    destino: 'Juliaca',
    conductor: 'Transportes del Sur',
    categoria: 'bus',
    estado: true,
    coordenadas: { lat: -16.4090, lng: -71.5375 }, // Arequipa
    precio: 35.00,
    urlimagen: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
    pasajerosRestantes: 15
  },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MapaViajesPage() {
  const [viajes, setViajes] = useState<ViajeMapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState<ViajeMapa | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaViaje | 'todas'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    // Simular carga de base de datos
    setTimeout(() => {
      setViajes(mockViajes);
      setLoading(false);
    }, 800);
  }, []);

  const viajesFiltrados = useMemo(() => {
    return viajes.filter((v) => {
      const matchBusqueda =
        v.origen?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.destino?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.conductor?.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = filtroCategoria === 'todas' || v.categoria === filtroCategoria;
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activo' && v.estado === true) ||
        (filtroEstado === 'finalizado' && v.estado === false);
      return matchBusqueda && matchCategoria && matchEstado;
    });
  }, [viajes, busqueda, filtroCategoria, filtroEstado]);

  const categoriasDisponibles = useMemo(
    () => [...new Set(viajes.map((v) => v.categoria as CategoriaViaje).filter(Boolean))],
    [viajes]
  );

  const stats = useMemo(() => ({
    total: viajesFiltrados.length,
    activos: viajesFiltrados.filter((v) => v.estado === true).length,
    finalizados: viajesFiltrados.filter((v) => v.estado === false).length,
  }), [viajesFiltrados]);

  const handleSeleccionar = useCallback((v: ViajeMapa) => {
    setSeleccionado(v);
  }, []);

  return (
    <div 
      className="-m-4 lg:-m-8 relative z-0 overflow-hidden" 
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 5rem - 2px)', background: '#020617' }}
    >
      {/* ── Header ── */}
      <div style={{ flexShrink: 0, background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="text-blue-500" />
              Mapa de Viajes
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {loading ? 'Cargando...' : `${stats.total} viajes`}
              {!loading && <span className="ml-2 text-blue-400 font-medium">{stats.activos} en ruta</span>}
              {!loading && stats.finalizados > 0 && <span className="ml-2 text-slate-500 font-medium">{stats.finalizados} finalizados</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ciudad o conductor..."
                className="bg-slate-800 border border-white/10 text-white rounded-xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 w-64"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                mostrarFiltros || filtroCategoria !== 'todas' || filtroEstado !== 'todos'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-slate-800 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Filter className="w-3 h-3" />
              Filtros
              {(filtroCategoria !== 'todas' || filtroEstado !== 'todos') && (
                <span className="w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {[filtroCategoria !== 'todas', filtroEstado !== 'todos'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtros expandibles */}
        {mostrarFiltros && (
          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
            <span className="text-slate-500 text-xs font-medium uppercase">Estado:</span>
            {(['todos', 'activo', 'finalizado'] as FiltroEstado[]).map((e) => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  filtroEstado === e
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {e === 'todos' ? 'Todos' : e === 'activo' ? 'En Ruta' : 'Finalizados'}
              </button>
            ))}
            <span className="text-slate-500 text-xs font-medium uppercase ml-2">Vehículo:</span>
            <button
              onClick={() => setFiltroCategoria('todas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filtroCategoria === 'todas'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            {categoriasDisponibles.map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  filtroCategoria === cat
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {CATEGORIAS_CONFIG[cat]?.label || cat}
              </button>
            ))}
            {(filtroCategoria !== 'todas' || filtroEstado !== 'todos') && (
              <button
                onClick={() => { setFiltroCategoria('todas'); setFiltroEstado('todos'); }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all ml-1"
              >
                <X className="inline mr-1 w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Cuerpo: panel lateral + mapa ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Panel lateral */}
        <div style={{ width: 320, flexShrink: 0, background: 'rgba(15,23,42,0.7)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              {viajesFiltrados.length} viaje{viajesFiltrados.length !== 1 ? 's' : ''} encontrado{viajesFiltrados.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-7 h-7 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">Cargando viajes...</p>
              </div>
            ) : viajesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                <MapPin className="w-8 h-8 text-slate-700" />
                <p className="text-slate-400 text-sm font-medium">Sin resultados</p>
                <p className="text-slate-600 text-xs">Ajusta los filtros de búsqueda</p>
              </div>
            ) : (
              viajesFiltrados.map((v) => {
                const estaFinalizado = v.estado === false;
                const cfg = CATEGORIAS_CONFIG[v.categoria as CategoriaViaje] || CATEGORIAS_CONFIG.minivan;
                
                const isSelected = seleccionado?.id === v.id;

                return (
                  <button
                    key={v.id}
                    onClick={() => handleSeleccionar(v)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                      background: isSelected ? 'rgba(59,130,246,0.05)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    className="hover:bg-slate-800/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center shadow-inner shadow-black/50">
                        {v.urlimagen
                          ? <img src={v.urlimagen} alt={v.origen} className="w-full h-full object-cover" />
                          : <span className="text-slate-500 text-xl">{cfg.icon}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estaFinalizado ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            {estaFinalizado ? 'Finalizado' : 'En Ruta'}
                          </span>
                        </div>
                        <p className="text-white text-sm font-bold leading-tight truncate">{v.origen}</p>
                        <p className="text-slate-400 text-xs font-medium truncate mb-1">hacia {v.destino}</p>
                        
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                          <p className="text-slate-500 text-[10px] truncate max-w-[100px]">{v.conductor}</p>
                          <p className="text-emerald-400 text-xs font-mono font-bold">{formatSoles(v.precio)}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Mapa */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapaInteractivo
            viajes={viajesFiltrados}
            seleccionado={seleccionado}
            onSeleccionar={handleSeleccionar}
          />

          {/* Contador flotante */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 shadow-2xl z-[1000]">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-500" />
                <span className="text-white font-bold">{viajesFiltrados.length}</span>
                <span className="text-slate-400">viajes</span>
              </div>
              {stats.activos > 0 && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className="text-blue-400 font-bold">{stats.activos} en ruta</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Leyenda */}
          <div className="absolute bottom-6 right-4 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-[1000] hidden md:block">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Leyenda de Mapa</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <span className="text-xs font-medium text-slate-300">En Ruta / Programado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-slate-500 rounded-full" />
                <span className="text-xs font-medium text-slate-400">Viaje Finalizado</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-3 pt-3 border-t border-slate-800">Haz clic en un pin para ver detalles</p>
          </div>
        </div>
      </div>
    </div>
  );
}
