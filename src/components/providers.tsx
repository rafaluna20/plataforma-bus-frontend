'use client';

import { ReactNode } from 'react';
import { SidebarProvider } from '@/context/SidebarContext';
import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <SidebarProvider>
                {children}
            </SidebarProvider>
        </AuthProvider>
    );
}
