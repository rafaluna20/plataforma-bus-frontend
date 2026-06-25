"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminRedirectPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Detectando tu empresa...");

  useEffect(() => {
    redirectToCompanyAdmin();
  }, []);

  async function redirectToCompanyAdmin() {
    try {
      // 1. Verificar que el usuario está autenticado
      const localUser = getCurrentUser();
      if (!localUser) {
        router.replace("/login?redirect=/admin");
        return;
      }

      // 2. SUPER_ADMIN sin empresa: ir al panel de superadmin
      if (localUser.role === "SUPER_ADMIN" && !localUser.companyId) {
        router.replace("/superadmin");
        return;
      }

      setMessage("Cargando datos de tu empresa...");

      // 3. Obtener el perfil actualizado del servidor (tiene el slug de la empresa)
      const profileRes = await authFetch(`${API}/api/v1/auth/me`);
      if (!profileRes.ok) {
        router.replace("/login?redirect=/admin");
        return;
      }
      const profile = await profileRes.json();

      const companySlug =
        profile.company?.slug ||
        profile.companySlug ||
        null;

      const companyId =
        profile.company?.id ||
        profile.companyId ||
        localUser.companyId ||
        null;

      // 4. Obtener branding del usuario (que contiene el slug)
      setMessage("Buscando información de tu empresa...");
      const brandingRes = await authFetch(`${API}/api/v1/branding/me`);
      
      if (brandingRes.ok) {
        const brandingData = await brandingRes.json();
        const slug = brandingData.company?.slug || profile.company?.slug;
        
        if (slug) {
          setMessage(`Redirigiendo a ${brandingData.company?.tradeName || "tu empresa"}...`);
          router.replace(`/empresa/${slug}/admin`);
          return;
        }
      }

      // Fallback: Si todo falla pero tenemos el ID de la empresa, redirigimos a una ruta genérica de empresa
      if (companyId) {
        setMessage("Redirigiendo con ID de empresa...");
        router.replace(`/empresa/${companyId}/admin`);
        return;
      }

      // 6. Sin empresa asociada
      setStatus("error");
      setMessage("Tu cuenta no tiene una empresa asociada. Contacta al soporte.");
    } catch (err) {
      console.error("Error al redirigir al admin:", err);
      setStatus("error");
      setMessage("Error al cargar tu empresa. Intenta iniciar sesión de nuevo.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        {status === "loading" ? (
          <>
            {/* Spinner con gradiente */}
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"
                style={{ animationDuration: "0.7s", animationDirection: "reverse" }} />
            </div>

            <div className="space-y-2">
              <p className="text-white font-semibold text-lg">Accediendo al panel</p>
              <p className="text-slate-400 text-sm animate-pulse">{message}</p>
            </div>

            {/* Barra de progreso animada */}
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full animate-pulse"
                style={{ width: "60%" }} />
            </div>
          </>
        ) : (
          <>
            {/* Error state */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <p className="text-white font-semibold text-lg">Sin empresa asignada</p>
              <p className="text-slate-400 text-sm">{message}</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setStatus("loading"); setMessage("Reintentando..."); redirectToCompanyAdmin(); }}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Reintentar
              </button>
              <a href="/login"
                className="w-full px-4 py-2.5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-colors text-sm text-center">
                Volver al inicio de sesión
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
