"use client";

import { Bus, Route, Phone, Menu, MapPin, TicketCheck, LayoutDashboard } from "lucide-react";

export type EmpresaNavId =
  | "viajes" | "rutas" | "contacto" | "mapa" | "menu"
  | "admin-dashboard" | "admin-venta" | "admin-viajes";

type NavItem = {
  id: EmpresaNavId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  pulse?: boolean;
};

const PUBLIC_ITEMS: NavItem[] = [
  { id: "viajes", label: "Viajes", icon: Bus },
  { id: "rutas", label: "Rutas", icon: Route },
  { id: "mapa", label: "Flotas", icon: MapPin, accentColor: "#60a5fa", pulse: true },
  { id: "contacto", label: "Contacto", icon: Phone },
  { id: "menu", label: "Menú", icon: Menu },
];

function staffItems(role?: string): NavItem[] {
  if (role === "AGENCY_SELLER") {
    return [
      { id: "admin-venta", label: "Venta", icon: TicketCheck },
      { id: "admin-viajes", label: "Viajes", icon: Bus },
      { id: "menu", label: "Menú", icon: Menu },
    ];
  }
  return [
    { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "admin-venta", label: "Venta", icon: TicketCheck },
    { id: "admin-viajes", label: "Viajes", icon: Bus },
    { id: "menu", label: "Menú", icon: Menu },
  ];
}

type Props = {
  /** Sección actualmente activa (null si esta pantalla no resalta ninguna, ej. detalle de viaje) */
  activeSection: string | null;
  onNavigate: (id: EmpresaNavId) => void;
  primaryColor: string;
  isCompanyStaff: boolean;
  userRole?: string;
};

/**
 * Barra de navegación inferior única para todo el ámbito /empresa/[slug]/*.
 * Reemplaza al sidebar fijo en pantallas < lg. Perfil de ítems según si el
 * usuario es staff de la empresa (admin/vendedor) o un visitante público.
 */
export default function EmpresaBottomNav({ activeSection, onNavigate, primaryColor, isCompanyStaff, userRole }: Props) {
  const items = isCompanyStaff ? staffItems(userRole) : PUBLIC_ITEMS;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 px-2 pt-2 flex items-center justify-around shadow-2xl"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {items.map(item => {
        const isActive = item.id !== "menu" && activeSection === item.id;
        const color = item.accentColor || primaryColor;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all duration-300 relative active:scale-95"
            style={{ color: isActive ? color : "#94a3b8" }}
          >
            {isActive && (
              <span className="absolute inset-x-2 inset-y-0 rounded-xl opacity-10" style={{ backgroundColor: color }} />
            )}
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110 -translate-y-0.5" : ""}`} />
              {item.pulse && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
