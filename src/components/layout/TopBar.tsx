'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, User, Settings, LogOut, ChevronDown, Wallet, LogIn, UserPlus, MapPin } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function TopBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { user, logout } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setProfileOpen(false);
        router.push('/');
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 z-50 px-4 lg:px-8">
                <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
                    {/* Logo Area */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                                <span className="text-white font-bold text-xl tracking-tighter">TR</span>
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                    Transporte
                                </span>
                                <span className="text-xs text-indigo-400 font-medium tracking-wider">
                                    PRO PLATFORM
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-4">
                        {!user ? (
                            <div className="flex items-center gap-3">
                                <Link 
                                    href="/login"
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Ingresar
                                </Link>
                                <Link 
                                    href="/registro"
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Registro
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Saldo y Botones de Billetera - Solo Desktop */}
                                <div className="hidden lg:flex flex-col items-end mr-2">
                                    <span className="text-base text-slate-300 font-medium mb-1">
                                        Saldo: S/ {user.balance?.toFixed(2) || '0.00'}
                                    </span>
                                    <div className="flex gap-2">
                                        <Link
                                            href="/billetera/recargar"
                                            className="px-5 py-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all active:scale-95 hover:shadow-lg hover:shadow-emerald-500/10"
                                        >
                                            Recargar
                                        </Link>
                                        <Link
                                            href="/billetera/retirar"
                                            className="px-5 py-1.5 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all active:scale-95 hover:shadow-lg hover:shadow-indigo-500/10"
                                        >
                                            Retirar
                                        </Link>
                                    </div>
                                </div>

                                {/* Notifications */}
                                <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                                </button>

                                {/* Profile Dropdown */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setProfileOpen(!profileOpen)}
                                        className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-slate-800 hover:border-slate-700 bg-slate-900/50 transition-all active:scale-95"
                                    >
                                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-inner ring-2 ring-slate-700 hover:ring-indigo-500 transition-all">
                                            {user.name?.[0]?.toUpperCase() || 'U'}
                                            {/* Mobile Balance Badge */}
                                            <div className="absolute -bottom-1 -right-1 lg:hidden bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-slate-900 min-w-[28px] text-center">
                                                {user.balance?.toFixed(0) || '0'}
                                            </div>
                                        </div>
                                        <div className="hidden md:flex flex-col items-start max-w-[120px]">
                                            <span className="text-sm font-medium text-slate-200 truncate">{user.name}</span>
                                            <span className="text-xs text-slate-500 truncate">{user.role}</span>
                                        </div>
                                        <ChevronDown className="hidden md:block w-4 h-4 text-slate-500" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {profileOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden z-50">
                                                <div className="p-4 border-b border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                            {user.name?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                        </div>
                                                    </div>

                                                    {/* Saldo Mobile Dropdown */}
                                                    <div className="mt-3 pt-3 border-t border-slate-700/50 lg:hidden">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-slate-400">Saldo disponible:</span>
                                                            <span className="text-sm font-bold text-emerald-400">S/ {user.balance?.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="py-2">
                                                    <Link href="/perfil" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors group" onClick={() => setProfileOpen(false)}>
                                                        <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" /> Mi Perfil
                                                    </Link>
                                                    <Link href="/mis-viajes" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors group" onClick={() => setProfileOpen(false)}>
                                                        <MapPin className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" /> Mis Viajes
                                                    </Link>
                                                    <Link href="/billetera" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors group" onClick={() => setProfileOpen(false)}>
                                                        <Wallet className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" /> Mi Billetera
                                                    </Link>
                                                    <Link href="/configuracion" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors group" onClick={() => setProfileOpen(false)}>
                                                        <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" /> Configuración
                                                    </Link>
                                                    
                                                    {/* Mobile Top Up Buttons */}
                                                    <div className="lg:hidden px-4 py-2 space-y-2">
                                                        <Link
                                                            href="/billetera/recargar"
                                                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all active:scale-95"
                                                            onClick={() => setProfileOpen(false)}
                                                        >
                                                            + Recargar Saldo
                                                        </Link>
                                                        <Link
                                                            href="/billetera/retirar"
                                                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all active:scale-95"
                                                            onClick={() => setProfileOpen(false)}
                                                        >
                                                            - Retirar Fondos
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="border-t border-slate-700 py-2">
                                                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group">
                                                        <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" /> Cerrar Sesión
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}
