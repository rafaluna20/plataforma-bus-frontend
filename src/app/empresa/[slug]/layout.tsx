/**
 * Layout independiente para páginas públicas de empresa.
 * NO hereda el header/sidebar/navbar de la plataforma.
 * Cada empresa tiene su propia identidad visual.
 */
export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  );
}
