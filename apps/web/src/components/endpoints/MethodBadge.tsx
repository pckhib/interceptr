import { cn } from '@/lib/utils';

const METHOD_STYLES: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]',
  POST: 'text-blue-400 bg-blue-400/10 border-blue-400/30 shadow-[0_0_10px_-3px_rgba(96,165,250,0.3)]',
  PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/30 shadow-[0_0_10px_-3px_rgba(251,191,36,0.3)]',
  PATCH: 'text-orange-400 bg-orange-400/10 border-orange-400/30 shadow-[0_0_10px_-3px_rgba(251,146,60,0.3)]',
  DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/30 shadow-[0_0_10px_-3px_rgba(251,113,133,0.3)]',
  HEAD: 'text-purple-400 bg-purple-400/10 border-purple-400/30 shadow-[0_0_10px_-3px_rgba(192,132,252,0.3)]',
  OPTIONS: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-[4px] border uppercase tracking-widest w-[52px] shrink-0 font-mono transition-all',
        METHOD_STYLES[method] ?? 'text-muted-foreground bg-muted/20 border-border',
      )}
    >
      {method}
    </span>
  );
}
