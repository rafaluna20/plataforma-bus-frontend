"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          textAlign: "center",
          padding: "1.5rem",
          background: "#020617",
          color: "#f1f5f9",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Algo salió mal</h1>
        <p style={{ color: "#94a3b8", maxWidth: "28rem" }}>
          Ocurrió un error inesperado al cargar la aplicación. Intenta recargar la página.
        </p>
        {error.digest && (
          <p style={{ color: "#475569", fontSize: "0.75rem" }}>ID del error: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            background: "#4f46e5",
            color: "white",
            fontWeight: 700,
            fontSize: "0.875rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
