'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Ticket, Wallet, Briefcase, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Inicio', href: '/', icon: Home },
        { name: 'Mapa', href: '/mapa', icon: Map },
        { name: 'Buscar', href: '/buscar', icon: Search },
        { name: 'Reservas', href: '/mis-viajes', icon: Ticket },
        { name: 'Admin', href: '/admin', icon: Briefcase },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/50 z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <nav className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex flex-col items-center justify-center w-full h-full space-y-1 relative group"
                        >
                            <div className={cn(
                                "absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full transition-all duration-300",
                                isActive ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-transparent"
                            )} />
                            
                            <item.icon 
                                className={cn(
                                    "w-5 h-5 transition-all duration-300",
                                    isActive 
                                        ? "text-indigo-400 transform -translate-y-0.5" 
                                        : "text-slate-500 group-hover:text-slate-300"
                                )} 
                            />
                            <span 
                                className={cn(
                                    "text-[10px] font-medium transition-colors",
                                    isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"
                                )}
                            >
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
