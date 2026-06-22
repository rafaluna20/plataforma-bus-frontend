'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useSidebar } from '@/context/SidebarContext';

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();

    // Rutas que tienen su propio layout independiente (sin header/sidebar de la plataforma)
    const isStandaloneRoute = pathname?.startsWith('/empresa/');

    if (isStandaloneRoute) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 lg:gap-6 text-slate-100 font-sans">
            <TopBar />

            <div className="h-0.5" />

            <div className="flex flex-1 pt-[calc(5rem+2px)]">
                <Sidebar />

                <div className="hidden lg:block w-[5px] shrink-0" />

                <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
                    <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                        {children}
                    </div>
                </main>
            </div>

            <BottomNav />
        </div>
    );
}
