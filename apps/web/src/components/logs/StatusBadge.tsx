import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: number }) {
  const styles =
    status < 300
      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_8px_-2px_rgba(var(--color-success),0.2)]'
      : status < 400
        ? 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_8px_-2px_rgba(var(--color-primary),0.2)]'
        : status < 500
          ? 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_8px_-2px_rgba(var(--color-warning),0.2)]'
          : 'text-rose-400 bg-rose-400/10 border-rose-400/20 shadow-[0_0_8px_-2px_rgba(var(--color-destructive),0.2)]';

  return (
    <span className={cn(
      'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black font-mono rounded border uppercase tracking-wider min-w-[32px] transition-all', 
      styles
    )}>
      {status}
    </span>
  );
}
