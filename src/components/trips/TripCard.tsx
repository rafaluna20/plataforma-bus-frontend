'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
    Heart, MessageCircle, MapPin,
    ChevronLeft, ChevronRight, CheckCircle,
    Bookmark, Users, Clock, Route,
    Bus, Map, CarFront, Car
} from 'lucide-react';

interface TripCardProps {
    trip: any; // We'll type this properly later, using any for now to align with page.tsx
    originName: string;
    destinationName: string;
    variant?: 'default' | 'featured';
}

export default function TripCard({ trip, originName, destinationName, variant = 'default' }: TripCardProps) {
    const router = useRouter();
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Simulated Stable Mocks based on ID
    // We generate pseudo-random but stable numbers from the trip ID to simulate data
    const hash = useMemo(() => {
        let h = 0;
        const str = trip.id || 'default';
        for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        return Math.abs(h);
    }, [trip.id]);

    const likesCountMock = (hash % 150) + 12;
    const commentsCountMock = (hash % 45) + 3;
    const capacity = trip.vehicle?.capacity || 45;
    // Simulate some seats occupied
    const occupiedSeats = Math.floor((hash % capacity) * 0.8) + Math.floor(capacity * 0.2); // Ensure it's between 20% and ~100%
    const freeSeats = Math.max(0, capacity - occupiedSeats);
    const occupancyPercentage = Math.min(100, Math.round((occupiedSeats / capacity) * 100));

    // Likes state
    const [likesCount, setLikesCount] = useState(likesCountMock);
    const [hasLiked, setHasLiked] = useState(false);
    const [procesando, setProcesando] = useState(false);

    const toggleLike = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (procesando) return;
        setProcesando(true);
        if (hasLiked) {
            setLikesCount(p => p - 1);
            setHasLiked(false);
        } else {
            setLikesCount(p => p + 1);
            setHasLiked(true);
        }
        setTimeout(() => setProcesando(false), 300);
    };

    const toggleBookmark = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsBookmarked(!isBookmarked);
    };

    // Images 
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // In a real app we'd have trip.images or vehicle images. We'll use placeholder gradients for now.
    const images = ['fallback']; 

    // Calculation for Price
    let finalPrice = trip.route?.waypoints?.[trip.route.waypoints.length - 1]?.basePrice || 45;
    if (trip.route?.waypoints?.length > 0) {
        const start = trip.route.waypoints.find((w: any) => w.station?.city.toLowerCase() === originName.toLowerCase());
        const end = trip.route.waypoints.find((w: any) => w.station?.city.toLowerCase() === destinationName.toLowerCase());
        if (start && end && end.stopOrder > start.stopOrder) {
            finalPrice = trip.route.waypoints.filter((w: any) => w.stopOrder > start.stopOrder && w.stopOrder <= end.stopOrder).reduce((acc: any, curr: any) => acc + curr.basePrice, 0);
        }
    }

    // Departure Time
    const depTime = new Date(trip.departureTime);
    
    // Status Logic
    const isFeaturedCard = variant === 'featured';
    const isLiquidado = false; // "Finalizado" o "Salió"
    const isLleno = occupancyPercentage >= 100;
    const isPopular = likesCount > 50;

    // Duración simulada
    const durationHours = (hash % 12) + 2;

    const handleSelectClick = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        router.push(`/viajes/${trip.id || 'trip-1'}`);
    };

    // Color de barra de progreso
    const barColor = isLiquidado
        ? 'from-slate-500 to-slate-400'
        : occupancyPercentage >= 100
            ? 'from-rose-500 to-red-500' // Lleno
            : occupancyPercentage >= 70
                ? 'from-amber-500 to-orange-400' // Casi lleno
                : 'from-emerald-500 to-teal-400'; // Libre

    const vehicleTypeStr = trip.vehicle?.vehicleType?.toLowerCase() || 'bus';

    return (
        <div className="block h-full cursor-pointer" onClick={handleSelectClick}>
            <article className={`
                group relative flex flex-col h-full overflow-hidden
                bg-slate-900 border border-slate-700/60 rounded-2xl
                transition-all duration-300
                hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-900/20
                hover:-translate-y-1
                ${isFeaturedCard ? 'lg:min-h-[520px]' : ''}
            `}>

                {/* ── Botón Bookmark ── */}
                <button
                    onClick={toggleBookmark}
                    className="absolute top-3 right-3 z-20 p-2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-90"
                    title={isBookmarked ? 'Quitar de favoritos' : 'Guardar viaje'}
                >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                </button>

                {/* ── Imagen / Encabezado ── */}
                <div className={`relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 ${isFeaturedCard ? 'h-72' : 'h-48'}`}>
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-800">
                        {vehicleTypeStr === 'minivan' ? <CarFront size={48} className="opacity-50" /> : 
                         vehicleTypeStr === 'auto' ? <Car size={48} className="opacity-50" /> : 
                         <Bus size={48} className="opacity-50" />}
                        <span className="text-sm font-bold text-slate-500 mt-2 tracking-widest uppercase">{trip.vehicle?.vehicleType || 'Bus'}</span>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {/* Estado principal */}
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full border border-white/10 backdrop-blur-md shadow
                            ${isLiquidado ? 'bg-slate-700/90 text-slate-300' :
                              isLleno ? 'bg-rose-500/90 text-white' :
                              'bg-emerald-500/90 text-white'}`}>
                            {isLiquidado ? '✓ SALIÓ' : isLleno ? 'LLENO' : '● A TIEMPO'}
                        </span>
                        {/* Sub-badges */}
                        <div className="flex gap-1.5 flex-wrap">
                            {isPopular && <span className="px-2 py-0.5 bg-slate-900/80 text-orange-400 border border-orange-500/30 text-[9px] font-bold rounded-full backdrop-blur-sm">🔥 DEMANDADO</span>}
                            <span className="px-2 py-0.5 bg-slate-900/80 text-indigo-300 border border-indigo-500/20 text-[9px] font-bold rounded-full backdrop-blur-sm uppercase">{trip.company?.tradeName || "Transportista"}</span>
                        </div>
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-70 pointer-events-none" />
                </div>

                {/* ── Contenido ── */}
                <div className="flex flex-col flex-1 p-5 gap-4">

                    {/* Título (Ruta) y empresa */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className={`font-bold text-white leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors duration-200 ${isFeaturedCard ? 'text-2xl' : 'text-lg'}`}>
                                {depTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} • {originName} → {destinationName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-slate-400 font-medium">{trip.route?.name}</span>
                                <span title="Ruta verificada"><CheckCircle className="text-emerald-500 flex-shrink-0 w-3 h-3" /></span>
                            </div>
                        </div>
                    </div>

                    {/* ── Stats rápidos ── */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* Tiempo */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                <Clock className="text-indigo-400 w-3 h-3" />
                                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Viaje</span>
                            </div>
                            <span className="text-indigo-400 font-bold text-sm">~{durationHours}h</span>
                        </div>
                        {/* Disponibles */}
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                <Users className="text-emerald-400 w-3 h-3" />
                                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Libres</span>
                            </div>
                            <span className="text-emerald-400 font-bold text-sm">{freeSeats}</span>
                        </div>
                        {/* Tipo / Escalas */}
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                <Route className="text-cyan-400 w-3 h-3" />
                                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Tipo</span>
                            </div>
                            <span className="text-cyan-400 font-bold text-sm">Directo</span>
                        </div>
                    </div>

                    {/* ── Barra de financiamiento (Ocupación) REAL ── */}
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Ocupación del vehículo</span>
                            <span className={`font-bold tabular-nums ${occupancyPercentage >= 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {occupancyPercentage}%
                            </span>
                        </div>

                        {/* Track de barra */}
                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                style={{ width: `${occupancyPercentage}%` }}
                                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-1000 ease-out relative`}
                            >
                                {/* Brillo animado */}
                                {!isLiquidado && occupancyPercentage < 100 && (
                                    <div className="absolute inset-y-0 right-0 w-4 bg-white/30 blur-sm animate-pulse" />
                                )}
                            </div>
                        </div>

                        {/* Montos / Asientos */}
                        <div className="flex justify-between text-xs">
                            <div>
                                <span className="text-white font-bold tabular-nums">{occupiedSeats}</span>
                                <span className="text-slate-500 ml-1">ocupados</span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-500">Total: </span>
                                <span className="text-slate-300 font-semibold tabular-nums">{capacity} asient.</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer: acciones + precio ── */}
                    <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between gap-3">

                        {/* Interacciones */}
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <button
                                onClick={toggleLike}
                                disabled={procesando}
                                className="flex items-center gap-1.5 hover:text-rose-400 active:scale-90 transition-all disabled:opacity-50"
                            >
                                <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                <span className="font-semibold">{likesCount}</span>
                            </button>

                            <button className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>{commentsCountMock}</span>
                            </button>

                            <button className="hover:text-emerald-400 hover:scale-110 active:scale-90 transition-all" title="Ver ruta en mapa">
                                <MapPin className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Precio + CTA */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Por asiento</div>
                                <div className="text-white font-bold text-sm tabular-nums">
                                    S/ {Number(finalPrice).toFixed(2)}
                                </div>
                            </div>
                            <button
                                onClick={handleSelectClick}
                                disabled={isLiquidado || isLleno}
                                className={`
                                    flex-shrink-0 py-2 px-4 text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 whitespace-nowrap
                                    ${isLiquidado || isLleno
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white shadow-lg shadow-indigo-900/30'
                                    }
                                `}
                            >
                                {isLiquidado ? 'Finalizado' : isLleno ? 'Agotado' : 'Seleccionar'}
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
}
