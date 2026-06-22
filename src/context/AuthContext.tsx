"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  AuthUser,
  getCurrentUser,
  login as authLogin,
  logout as authLogout,
  register as authRegister,
  fetchProfile,
  refreshAccessToken,
} from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  register: (name: string, email: string, pass: string, extras?: { docType?: string; docNum?: string; phone?: string }) => Promise<AuthUser>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (...roles: AuthUser["role"][]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  logout: async () => {},
  register: async () => { throw new Error("AuthProvider not mounted"); },
  refreshUser: async () => {},
  isAuthenticated: false,
  hasRole: () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    // Primero intentar obtener el perfil del servidor (fuente de verdad)
    const serverUser = await fetchProfile();
    if (serverUser) {
      setUser(serverUser);
      // Asegurar que la cookie session_role esté sincronizada
      if (typeof document !== "undefined") {
        document.cookie = `session_role=${serverUser.role}; path=/; SameSite=Lax; max-age=86400`;
      }
      return;
    }

    // Si falla (token expirado), intentar renovar el token
    const newToken = await refreshAccessToken();
    if (newToken) {
      const refreshedUser = await fetchProfile();
      if (refreshedUser) {
        setUser(refreshedUser);
        if (typeof document !== "undefined") {
          document.cookie = `session_role=${refreshedUser.role}; path=/; SameSite=Lax; max-age=86400`;
        }
      } else {
        setUser(null);
      }
      return;
    }

    // Si no hay token válido, limpiar la cookie y el estado
    if (typeof document !== "undefined") {
      document.cookie = "session_role=; path=/; max-age=0";
    }
    setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await refreshUser();
      setLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  const login = async (email: string, pass: string): Promise<AuthUser> => {
    const u = await authLogin(email, pass);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    extras?: { docType?: string; docNum?: string; phone?: string }
  ): Promise<AuthUser> => {
    const u = await authRegister(name, email, pass, extras);
    setUser(u);
    return u;
  };

  const hasRole = (...roles: AuthUser["role"][]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        refreshUser,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
