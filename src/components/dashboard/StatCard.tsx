import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  gradient?: string;
}

export default function StatCard({ title, value, subtitle, icon, gradient = "from-indigo-500/20 to-purple-500/20" }: StatCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-5 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/20")}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradient)} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-white tracking-tight">{value}</h3>
            {subtitle && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{subtitle}</span>}
          </div>
        </div>
        
        {icon && (
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
