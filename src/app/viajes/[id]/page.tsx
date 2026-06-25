"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Heart, MapPin, Map, Bus, Users, Clock, Route, Share2, CheckCircle, CarFront } from "lucide-react";
import Image from "next/image";
import SeatSelectionModal from "@/components/trips/SeatSelectionModal";
import BookingSummaryModal from "@/components/trips/BookingSummaryModal";
import PaymentModal from "@/components/trips/PaymentModal";
import TicketModal from "@/components/trips/TicketModal";
import type { BookingData } from "@/types/booking";

// Mocks to simulate API fetching
const MOCK_TRIP = {
  id: "trip-1",
  origin: "Lima",
  destination: "Trujillo",
  company: "Transportes El Rápido",
  departureTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  duration: "8h",
  price: 60,
  vehicleType: "Bus Cama",
  capacity: 40,
  occupiedSeats: 25,
  description: "Viaje directo a Trujillo con todas las comodidades. Asientos reclinables 160°, aire acondicionado, baño, y refrigerio a bordo. Paradas permitidas solo en zonas autorizadas.",
  likes: 45,
  comments: 12,
  passengers: [
    { name: "Juan P.", avatar: "JP" },
    { name: "Ana Gomez", avatar: "AG" },
    { name: "Luis M.", avatar: "LM" },
  ],
  imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop"
};

export default function TripDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [trip, setTrip] = useState<typeof MOCK_TRIP | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("descripcion");
  const [hasLiked, setHasLiked] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTrip({ ...MOCK_TRIP, id: id as string });
      setLoading(false);
    }, 600);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!trip) return null;

  const freeSeats = trip.capacity - trip.occupiedSeats;
  const occupancyPercentage = Math.round((trip.occupiedSeats / trip.capacity) * 100);

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <nav className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Volver al Inicio</span>
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Hero */}
            <section className="space-y-6">
              <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden shadow-2xl group">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
                <img 
                  src={trip.imageUrl} 
                  alt={`Viaje a ${trip.destination}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <span className="px-3 py-1 bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold rounded-full shadow-lg border border-emerald-400/30">
                    A TIEMPO
                  </span>
                  <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-blue-300 text-xs font-bold rounded-full shadow-lg border border-blue-500/20">
                    {trip.vehicleType}
                  </span>
                </div>
              </div>

              {/* Title and Stats */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 leading-tight tracking-tight">
                      Viaje: {trip.origin} → {trip.destination}
                    </h1>
                    <p className="text-lg text-gray-400 flex items-center gap-2 font-medium">
                      <Bus className="w-5 h-5 text-indigo-400" />
                      {trip.company}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="p-3 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition"
                      title="Compartir"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setHasLiked(!hasLiked)}
                      className={`p-3 rounded-xl border transition shadow-lg ${
                        hasLiked 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Info Bar (Like Votos/Comentarios/Inversores in Inversiones) */}
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{trip.likes + (hasLiked ? 1 : 0)}</div>
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Interesados</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{trip.passengers.length}</div>
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pasajeros</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{new Date(trip.departureTime).toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Salida</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tabs Section */}
            <section className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="flex overflow-x-auto border-b border-slate-800 scrollbar-hide">
                {[
                  { id: 'descripcion', label: 'Descripción' },
                  { id: 'pasajeros', label: 'Pasajeros', badge: trip.passengers.length },
                  { id: 'comentarios', label: 'Comentarios', badge: trip.comments },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                        : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-6 sm:p-8">
                {activeTab === 'descripcion' && (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 text-lg leading-relaxed">{trip.description}</p>
                    
                    <h3 className="text-xl font-bold text-white mt-8 mb-4">Detalles del Servicio</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['Aire Acondicionado', 'Asientos Reclinables', 'TV/Películas', 'Rastreo GPS', 'Cargadores USB'].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-400">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeTab === 'pasajeros' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-6">Lista de Pasajeros</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {trip.passengers.map((p, i) => (
                        <div key={i} className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
                            {p.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{p.name}</div>
                            <div className="text-sm text-slate-500">Pasajero verificado</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'comentarios' && (
                  <div className="text-center py-12">
                    <p className="text-slate-400">Sección de comentarios en desarrollo.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sticky Sidebar (Right) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-gradient-to-b from-slate-900 to-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                {/* Glow decorativo */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Reservar Asiento</h2>
                <p className="text-slate-400 mb-8">Asegura tu lugar en este viaje antes que se agoten.</p>

                <div className="flex items-end justify-between mb-8">
                  <div>
                    <div className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Precio por Asiento</div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                      S/ {trip.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-emerald-400 mb-1">{freeSeats} libres</div>
                    <div className="text-sm text-slate-500 font-medium">de {trip.capacity} total</div>
                  </div>
                </div>

                {/* Progress Bar (Ocupación) */}
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-300">Ocupación del bus</span>
                    <span className="text-white">{occupancyPercentage}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full relative"
                      style={{ width: `${occupancyPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full animate-pulse blur-[2px]"></div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => user ? setShowBookingModal(true) : router.push('/login')}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/30 transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  <Bus className="w-5 h-5" />
                  {user ? "Elegir Asientos" : "Inicia sesión para reservar"}
                </button>

                <p className="text-center text-xs text-slate-500 mt-4">
                  Pago seguro. Cancelación gratuita hasta 24h antes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Selection Modal */}
      {showBookingModal && (
        <SeatSelectionModal 
          origin={trip.origin} 
          destination={trip.destination} 
          onClose={() => setShowBookingModal(false)} 
          onConfirm={(selectedSeats, passengers) => {
            setShowBookingModal(false);
            setBookingData({ selectedSeats, passengers });
            setShowSummaryModal(true);
          }} 
        />
      )}

      {/* Booking Summary Modal */}
      {showSummaryModal && bookingData && (
        <BookingSummaryModal
          trip={{
            origin: trip.origin,
            destination: trip.destination,
            company: trip.company,
            duration: trip.duration,
            departureTime: trip.departureTime,
          }}
          selectedSeats={bookingData.selectedSeats}
          passengers={bookingData.passengers}
          onClose={() => setShowSummaryModal(false)}
          onPay={() => {
            setShowSummaryModal(false);
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && bookingData && (
        <PaymentModal
          userName={user?.name || 'Usuario'}
          selectedSeats={bookingData.selectedSeats}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={() => {
            setShowPaymentModal(false);
            setShowTicketModal(true);
          }}
        />
      )}

      {/* Ticket Modal */}
      {showTicketModal && bookingData && (
        <TicketModal
          open={showTicketModal}
          onClose={() => {
            setShowTicketModal(false);
            router.push('/mis-viajes');
          }}
          ticket={{
            companyName: trip.company,
            origin: trip.origin,
            destination: trip.destination,
            departureTime: trip.departureTime,
            passengerName: bookingData.passengers[0]?.nombre || user?.name || 'Pasajero',
            passengerDoc: bookingData.passengers[0]?.dni || '',
            seatId: bookingData.selectedSeats[0]?.id || '',
            seatLabel: bookingData.selectedSeats[0]?.label || '',
            bookingId: `BK-${Date.now()}`,
            totalPrice: bookingData.selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0),
            paymentStatus: 'PAID',
            routeName: `${trip.origin} - ${trip.destination}`,
          }}
        />
      )}
    </div>
  );
}
