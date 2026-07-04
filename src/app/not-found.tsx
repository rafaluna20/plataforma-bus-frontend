import Link from "next/link";
import { MapPinOff, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center px-4">
      <MapPinOff className="w-16 h-16 text-slate-600" />
      <h1 className="text-2xl font-bold text-white">Página no encontrada</h1>
      <p className="text-slate-400 max-w-md">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors mt-2"
      >
        <Home className="w-4 h-4" /> Ir al inicio
      </Link>
    </div>
  );
}
