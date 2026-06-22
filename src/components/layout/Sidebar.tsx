'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
    Home,
    Search,
    Map,
    Briefcase,
    Ticket,
    Wallet,
    LogOut,
    Car,
    Route,
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    Crown,
    Building2,
} from 'lucide-react';

interface NavItem {
    name: string;
    href: string;
    icon: any;
    badge?: string | number;
    badgeColor?: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { hasRole } = useAuth();

    const navigationGroups: NavGroup[] = [
        // ─── GENERAL: visible para todos ─────────────────────────────────────
        {
            title: 'GENERAL',
            items: [
                { name: 'Inicio', href: '/', icon: Home },
                { name: 'Buscar Viajes', href: '/buscar', icon: Search },
                { name: 'Mapa Interactivo', href: '/mapa', icon: Map, badge: 'MAPA', badgeColor: 'green' },
            ]
        },

        // ─── PASAJERO: visible para PASSENGER y DRIVER ────────────────────────
        ...(hasRole('PASSENGER', 'DRIVER') ? [{
            title: 'MI CUENTA',
            items: [
                { name: 'Mis Viajes', href: '/mis-viajes', icon: Map, badgeColor: 'blue' as const },
                { name: 'Mis Reservas', href: '/reservas', icon: Ticket, badge: 1, badgeColor: 'green' as const },
                { name: 'Billetera', href: '/billetera', icon: Wallet },
            ]
        }] : []),

        // ─── CONDUCTOR: visible solo para DRIVER ──────────────────────────────
        ...(hasRole('DRIVER') ? [{
            title: 'CONDUCTOR',
            items: [
                { name: 'Crear Viaje', href: '/crear-viaje', icon: PlusCircle, badge: 'NUEVO', badgeColor: 'purple' as const },
            ]
        }] : []),

        // ─── ADMINISTRACIÓN: visible solo para ADMIN y SUPER_ADMIN ───────────
        ...(hasRole('ADMIN', 'SUPER_ADMIN') ? [{
            title: 'ADMINISTRACIÓN',
            items: [
                { name: 'Panel Principal', href: '/admin', icon: Briefcase, badge: 'ADMIN', badgeColor: 'yellow' as const },
                { name: 'Gestión de Rutas', href: '/admin/rutas/nueva', icon: Route },
                { name: 'Vehículos', href: '/admin/vehiculos', icon: Car },
                { name: 'Perfil de Empresa', href: '/admin/empresa', icon: Building2 },
            ]
        }] : []),

        // ─── SUPER ADMIN: exclusivo para SUPER_ADMIN ─────────────────────────
        ...(hasRole('SUPER_ADMIN') ? [{
            title: 'SUPER ADMIN',
            items: [
                { name: 'Panel Super Admin', href: '/superadmin', icon: Crown, badge: 'SA', badgeColor: 'purple' as const },
            ]
        }] : []),
    ];

    const getBadgeClasses = (color?: string) => {
        const baseClasses = "ml-auto px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm bg-white/10";
        switch (color) {
            case 'green': return cn(baseClasses, "text-emerald-400 border border-emerald-500/30");
            case 'blue': return cn(baseClasses, "text-blue-400 border border-blue-500/30");
            case 'red': return cn(baseClasses, "text-rose-400 border border-rose-500/30");
            case 'yellow': return cn(baseClasses, "text-amber-400 border border-amber-500/30");
            case 'purple': return cn(baseClasses, "text-purple-400 border border-purple-500/30");
            default: return cn(baseClasses, "text-slate-400 border border-slate-500/30");
        }
    };

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-xl transition-all duration-300 relative group overflow-hidden h-[calc(100vh-6rem)] sticky top-[5.5rem]",
                isCollapsed ? "w-20" : "w-64",
                "ml-6 mt-2"
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 pointer-events-none" />

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent py-4 relative z-10 custom-scrollbar">
                {navigationGroups.map((group, groupIdx) => (
                    <div key={group.title} className={cn("mb-6", groupIdx !== 0 && "mt-6")}>
                        {!isCollapsed && (
                            <h3 className="px-6 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {group.title}
                            </h3>
                        )}
                        {isCollapsed && (
                            <div className="h-px w-8 mx-auto bg-slate-800/50 mb-3" />
                        )}
                        <nav className="space-y-1 px-3">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        title={isCollapsed ? item.name : undefined}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group/item",
                                            isActive
                                                ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300"
                                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                        )}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                        )}
                                        <item.icon className={cn(
                                            "shrink-0 transition-transform duration-200",
                                            isCollapsed ? "w-6 h-6 mx-auto" : "w-5 h-5",
                                            isActive ? "text-indigo-400" : "group-hover/item:text-slate-300"
                                        )} />
                                        
                                        {!isCollapsed && (
                                            <span className="font-medium truncate text-sm">
                                                {item.name}
                                            </span>
                                        )}

                                        {!isCollapsed && item.badge && (
                                            <span className={getBadgeClasses(item.badgeColor)}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-800/50 relative z-10 bg-slate-900/50">
                <div className={cn("flex", isCollapsed ? "justify-center" : "justify-between items-center")}>
                    {!isCollapsed && (
                        <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-rose-400 transition-colors px-2 py-2 rounded-lg hover:bg-rose-500/10">
                            <LogOut className="w-4 h-4" />
                            <span className="font-medium">Cerrar Sesión</span>
                        </button>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all shadow-sm border border-slate-700/50",
                            isCollapsed && "mx-auto"
                        )}
                        title={isCollapsed ? "Expandir" : "Colapsar"}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
