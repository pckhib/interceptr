import { useState, useMemo } from 'react';
import type { ProxyLogEntry } from '@interceptr/shared';
import { useLogStream } from '@/hooks/use-logs';
import { MethodBadge } from '@/components/endpoints/MethodBadge';
import { StatusBadge } from './StatusBadge';
import { RequestDetail } from './RequestDetail';
import { Radio, Trash2, Loader2, Filter, Activity as ActivityIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  isCompact?: boolean;
}

export function ActivityFeed({ isCompact }: ActivityFeedProps) {
  const { entries, connected, clear, loaded } = useLogStream();
  const [selected, setSelected] = useState<ProxyLogEntry | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<string>('');

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (methodFilter && e.method !== methodFilter) return false;
      if (statusFilter === '2xx' && (e.statusCode < 200 || e.statusCode >= 300)) return false;
      if (statusFilter === '4xx' && (e.statusCode < 400 || e.statusCode >= 500)) return false;
      if (statusFilter === '5xx' && e.statusCode < 500) return false;
      if (modeFilter && e.mode !== modeFilter) return false;
      return true;
    });
  }, [entries, methodFilter, statusFilter, modeFilter]);

  const MODE_COLORS: Record<string, string> = {
    mock: 'bg-mode-mock/20 text-mode-mock border-mode-mock/20',
    delay: 'bg-mode-delay/20 text-mode-delay border-mode-delay/20',
    passthrough: 'bg-mode-passthrough/20 text-mode-passthrough border-mode-passthrough/20',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {!isCompact && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Radio className={cn('w-4 h-4', connected ? 'text-success' : 'text-destructive')} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">Stream</span>
                <span className="text-[11px] font-bold text-muted-foreground leading-none">
                  {connected ? 'Real-time' : 'Offline'} &middot; {entries.length} entries
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={clear}
            className="p-2 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-75"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar for filters (compact or not) */}
      <div className="px-4 py-2 flex items-center justify-between bg-muted border-b border-border/20">
         <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border/20">
              <Filter className="w-3 h-3 text-muted-foreground/60" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-[10px] font-black uppercase tracking-wide bg-transparent outline-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-75"
              >
                <option value="">Method</option>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border/20">
              <ActivityIcon className="w-3 h-3 text-muted-foreground/60" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-[10px] font-black uppercase tracking-wide bg-transparent outline-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-75"
              >
                <option value="">Status</option>
                <option value="2xx">2xx</option>
                <option value="4xx">4xx</option>
                <option value="5xx">5xx</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border/20">
              <Clock className="w-3 h-3 text-muted-foreground/60" />
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="text-[10px] font-black uppercase tracking-wide bg-transparent outline-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-75"
              >
                <option value="">Mode</option>
                <option value="passthrough">Pass</option>
                <option value="delay">Delay</option>
                <option value="mock">Mock</option>
                <option value="mock-delay">Mock + Delay</option>
              </select>
            </div>
         </div>
         {isCompact && (
            <button
              onClick={clear}
              className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors duration-75"
              title="Clear logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
         )}
      </div>

      <div className="flex-1 overflow-y-auto relative bg-background">
        <div className="min-w-full">
          {!isCompact && (
            <div className="flex items-center gap-3 px-4 py-2 bg-muted border-b border-border/20 sticky top-0 z-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 w-20 shrink-0">Time</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 w-[52px] shrink-0">Method</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex-1">Request Path</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 w-16 text-center">Status</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 w-16 text-right">Latency</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 w-20 text-center">Mode</span>
            </div>
          )}

          <div className="divide-y divide-border/20">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                {!loaded ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary opacity-40" />
                ) : (
                  <ActivityIcon className="w-12 h-12 text-muted-foreground/10" />
                )}
                <div className="max-w-[200px]">
                  <p className="text-sm font-bold text-foreground/80">
                    {entries.length === 0 ? 'No Traffic Recorded' : 'No Matches'}
                  </p>
                </div>
              </div>
            ) : (
              filtered.slice(0, 200).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    "flex flex-col gap-2 px-4 py-3 w-full text-left transition-colors duration-75 group border-b border-border/10",
                    selected?.id === entry.id ? "bg-primary/5 shadow-inner" : "hover:bg-accent/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <MethodBadge method={entry.method} />
                        <span className="text-[10px] text-muted-foreground/60 font-mono font-bold tabular-nums">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 shrink-0 font-mono text-[9px] font-bold text-muted-foreground opacity-60">
                          <Clock className="w-2.5 h-2.5 opacity-40" />
                          <span className="tabular-nums">{entry.latencyMs}ms</span>
                        </div>
                        <StatusBadge status={entry.statusCode} />
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                     <span className="text-xs font-mono font-bold truncate text-foreground/90 group-hover:text-primary transition-colors duration-75 flex-1">
                       {entry.path}
                     </span>
                     {entry.mode === 'mock-delay' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border leading-none bg-mode-delay/20 text-mode-delay border-mode-delay/20">
                            delay
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border leading-none bg-mode-mock/20 text-mode-mock border-mode-mock/20">
                            mock
                          </span>
                        </div>
                      ) : (
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border leading-none',
                          MODE_COLORS[entry.mode]
                        )}>
                          {entry.mode}
                        </span>
                      )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {selected && <RequestDetail entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
