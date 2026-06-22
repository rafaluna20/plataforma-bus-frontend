'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    setIsCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    // Default to false (expanded) for desktop
    const [isCollapsed, setIsCollapsedState] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsedState(prev => !prev);
    };

    const setIsCollapsed = (value: boolean) => {
        setIsCollapsedState(value);
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
