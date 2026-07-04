"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Punto único donde enganchar un servicio de error tracking del frontend
    // (ej. Sentry) el día que se agregue — hoy solo va a la consola.
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertTriangle className="w-16 h-16 text-red-400" />
      <h1 className="text-2xl font-bold text-white">Algo salió mal</h1>
      <p className="text-slate-400 max-w-md">
        Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </p>
      {error.digest && (
        <p className="text-slate-600 text-xs">ID del error: {error.digest}</p>
      )}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
        >
          <RotateCw className="w-4 h-4" /> Reintentar
        </button>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
        >
          <Home className="w-4 h-4" /> Ir al inicio
        </button>
      </div>
    </div>
  );
}
