import { useState } from 'react';
import type { EndpointConfig, ProxyMode } from '@interceptr/shared';
import { useUpdateEndpoint } from '@/hooks/use-endpoints';
import { MethodBadge } from './MethodBadge';
import { ModeToggle } from './ModeToggle';
import { DelayEditor } from './DelayEditor';
import { MockEditor } from './MockEditor';
import { ChevronDown, ChevronRight, Hash, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EndpointCardProps {
  endpoint: EndpointConfig;
  specName?: string;
  showSpecBadge?: boolean;
}

const MODE_BORDERS: Record<ProxyMode, string> = {
  passthrough: 'border-mode-passthrough/20',
  delay: 'border-mode-delay/20',
  mock: 'border-mode-mock/20',
  'mock-delay': 'border-mode-mock/20',
};

const MODE_INDICATORS: Record<ProxyMode, string> = {
  passthrough: 'bg-mode-passthrough',
  delay: 'bg-mode-delay',
  mock: 'bg-mode-mock',
  'mock-delay': 'bg-mode-mock',
};

export function EndpointCard({ endpoint, specName, showSpecBadge }: EndpointCardProps) {
  const [expanded, setExpanded] = useState(false);
  const updateEndpoint = useUpdateEndpoint();

  const handleModeChange = (clicked: ProxyMode) => {
    const hasDelay = endpoint.mode === 'delay' || endpoint.mode === 'mock-delay';
    const hasMock = endpoint.mode === 'mock' || endpoint.mode === 'mock-delay';

    let newMode: ProxyMode;
    if (clicked === 'passthrough') {
      newMode = 'passthrough';
    } else if (clicked === 'delay') {
      if (!hasDelay) newMode = hasMock ? 'mock-delay' : 'delay';
      else newMode = hasMock ? 'mock' : 'passthrough';
    } else {
      if (!hasMock) newMode = hasDelay ? 'mock-delay' : 'mock';
      else newMode = hasDelay ? 'delay' : 'passthrough';
    }

    const update: Partial<EndpointConfig> = { mode: newMode };
    if ((newMode === 'delay' || newMode === 'mock-delay') && !endpoint.delay) {
      update.delay = { ms: 1000 };
    }
    if ((newMode === 'mock' || newMode === 'mock-delay') && !endpoint.mock) {
      update.mock = { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '{}' };
    }
    updateEndpoint.mutate({ id: endpoint.id, config: update });
    if (newMode !== 'passthrough') setExpanded(true);
  };

  return (
    <div className={cn(
      "group relative border sm:rounded-xl card-slab overflow-hidden mb-1 shadow-sm",
      MODE_BORDERS[endpoint.mode]
    )}>
      {/* Mode indicator vertical line with top-catch highlight */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-75",
        MODE_INDICATORS[endpoint.mode]
      )} />

      <div
        className="flex items-center gap-4 px-4 py-2.5 cursor-pointer select-none hover:bg-primary/5 transition-colors duration-75"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            <button className="text-muted-foreground/40 group-hover:text-primary transition-colors duration-75">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <MethodBadge method={endpoint.method} />
          </div>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono tracking-tight text-foreground/90 truncate">
                {endpoint.path}
              </span>
              {showSpecBadge && specName && (
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] bg-accent text-accent-foreground border border-border">
                  {specName}
                </span>
              )}
            </div>
            {endpoint.summary && (
              <span className="text-[11px] text-muted-foreground/60 font-medium truncate mt-0.5">
                {endpoint.summary}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {(endpoint.mode === 'delay' || endpoint.mode === 'mock-delay') && endpoint.delay && (
              <span className="px-2 py-0.5 text-[10px] font-black font-mono rounded bg-mode-delay/10 text-mode-delay border border-mode-delay/20 shadow-sm">
                {endpoint.delay.ms}ms
              </span>
            )}
            {(endpoint.mode === 'mock' || endpoint.mode === 'mock-delay') && endpoint.mock && (
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-black font-mono rounded border shadow-sm",
                endpoint.mock.statusCode < 300 ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                endpoint.mock.statusCode < 500 ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                "bg-rose-400/10 text-rose-400 border-rose-400/20"
              )}>
                {endpoint.mock.statusCode}
              </span>
            )}
          </div>
          <ModeToggle value={endpoint.mode} onChange={handleModeChange} />
        </div>
      </div>

      {expanded && (
        <div className={cn(
          'px-5 pb-5 pt-0',
          'border-t border-border/20 mx-4'
        )}>
          <div className="pt-5 space-y-4">
            {(endpoint.mode === 'delay' || endpoint.mode === 'mock-delay') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-mode-delay uppercase tracking-widest px-1">
                  <Hash className="w-3 h-3" />
                  Delay
                </div>
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <DelayEditor
                    delay={endpoint.delay ?? { ms: 1000 }}
                    onChange={(delay) => updateEndpoint.mutate({ id: endpoint.id, config: { delay } })}
                  />
                </div>
              </div>
            )}
            {(endpoint.mode === 'mock' || endpoint.mode === 'mock-delay') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-mode-mock uppercase tracking-widest px-1">
                  <Hash className="w-3 h-3" />
                  Mock Response
                </div>
                <div className="bg-muted rounded-xl border border-border overflow-hidden">
                  <MockEditor
                    mock={endpoint.mock ?? { statusCode: 200, headers: {}, body: '{}' }}
                    specResponses={endpoint.responses}
                    onChange={(mock) => updateEndpoint.mutate({ id: endpoint.id, config: { mock } })}
                  />
                </div>
              </div>
            )}
            {endpoint.mode === 'passthrough' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-mode-passthrough/5 flex items-center justify-center border border-border">
                  <ExternalLink className="w-5 h-5 text-mode-passthrough opacity-40" />
                </div>
                <div className="max-w-[300px]">
                  <p className="text-xs font-semibold text-foreground/80">
                    Passthrough Mode Active
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    Requests will be forwarded directly to the upstream server without modification.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
