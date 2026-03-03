import { useState, useMemo } from 'react';
import type { EndpointConfig, ProjectSpec, ProxyMode } from '@interceptr/shared';
import { useEndpoints, useBulkUpdateEndpoints } from '@/hooks/use-endpoints';
import { useSpecs } from '@/hooks/use-specs';
import { EndpointCard } from './EndpointCard';
import { ChevronDown, ChevronRight, Search, Hash, Loader2, Info, X } from 'lucide-react';

export function EndpointList() {
  const { data: endpoints, isLoading: isLoadingEndpoints } = useEndpoints();
  const { data: specs, isLoading: isLoadingSpecs } = useSpecs();
  const bulkUpdate = useBulkUpdateEndpoints();
  const [search, setSearch] = useState('');
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());

  const specMap = useMemo(() => {
    const map = new Map<string, ProjectSpec>();
    for (const s of specs ?? []) map.set(s.id, s);
    return map;
  }, [specs]);

  const activeSpecIds = useMemo(() => {
    return new Set(specs?.filter(s => s.active).map(s => s.id) ?? []);
  }, [specs]);

  const grouped = useMemo(() => {
    if (!endpoints) return new Map<string, EndpointConfig[]>();

    // Only show endpoints from active specs
    let filtered = endpoints.filter(ep => activeSpecIds.has(ep.specId));

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (ep) =>
          ep.path.toLowerCase().includes(s) ||
          ep.method.toLowerCase().includes(s) ||
          ep.operationId?.toLowerCase().includes(s) ||
          ep.summary?.toLowerCase().includes(s),
      );
    }

    const map = new Map<string, EndpointConfig[]>();
    for (const ep of filtered) {
      const tag = ep.tags[0] ?? 'Untagged';
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(ep);
    }
    return map;
  }, [endpoints, search, activeSpecIds]);

  const toggleTag = (tag: string) => {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleGroupModeChange = (eps: EndpointConfig[], mode: ProxyMode) => {
    const updates: Record<string, Partial<EndpointConfig>> = {};
    eps.forEach((ep) => {
      const update: Partial<EndpointConfig> = { mode };
      if (mode === 'delay' && !ep.delay) {
        update.delay = { ms: 1000 };
      }
      if (mode === 'mock' && !ep.mock) {
        update.mock = { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '{}' };
      }
      updates[ep.id] = update;
    });
    bulkUpdate.mutate(updates);
  };

  const isLoading = isLoadingEndpoints || isLoadingSpecs;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Indexing endpoints...</p>
      </div>
    );
  }

  if (!endpoints?.length || activeSpecIds.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4 px-6">
        <div className="w-16 h-16 rounded-3xl bg-muted border border-border/40 flex items-center justify-center text-muted-foreground opacity-20">
           <Hash className="w-8 h-8" />
        </div>
        <div className="max-w-xs">
           <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
             {activeSpecIds.size === 0 ? 'No Active Specifications' : 'No endpoints detected'}
           </h3>
           <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed">
             {activeSpecIds.size === 0 
               ? 'Select or import a specification from the header to begin.' 
               : 'Import an OpenAPI specification to automatically populate your workspace.'}
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search by path, method, or operation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 text-sm font-bold rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 shadow-sm transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/40 hover:text-foreground rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([tag, eps]) => {
          const isCollapsed = collapsedTags.has(tag);
          return (
            <div key={tag} className="space-y-4">
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => toggleTag(tag)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/20 text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/40 transition-all shrink-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest">{tag}</span>
                  <span className="text-[10px] font-black opacity-40 tabular-nums">({eps.length})</span>
                </button>

                <div className="flex items-center gap-1 bg-muted/20 p-0.5 rounded-lg border border-border/10 shrink-0">
                  <button
                    onClick={() => handleGroupModeChange(eps, 'passthrough')}
                    className="px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 hover:text-mode-passthrough hover:bg-mode-passthrough/10 rounded-md transition-all"
                    title="Pass all in group"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => handleGroupModeChange(eps, 'delay')}
                    className="px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 hover:text-mode-delay hover:bg-mode-delay/10 rounded-md transition-all"
                    title="Delay all in group"
                  >
                    Delay
                  </button>
                  <button
                    onClick={() => handleGroupModeChange(eps, 'mock')}
                    className="px-2 py-1 text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 hover:text-mode-mock hover:bg-mode-mock/10 rounded-md transition-all"
                    title="Mock all in group"
                  >
                    Mock
                  </button>
                </div>

                <div className="h-px flex-1 bg-border/20 opacity-40 group-hover:opacity-100 group-hover:bg-primary/20 transition-all" />
              </div>
              
              {!isCollapsed && (
                <div className="grid grid-cols-1 gap-1 px-1">
                  {eps.map((ep) => (
                    <EndpointCard
                      key={ep.id}
                      endpoint={ep}
                      specName={specMap.get(ep.specId)?.name}
                      showSpecBadge={activeSpecIds.size > 1}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {grouped.size === 0 && search && (
           <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Info className="w-10 h-10 text-muted-foreground opacity-20" />
              <div className="max-w-[240px]">
                 <p className="text-sm font-bold text-foreground/80">No results found</p>
                 <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed">
                   The search term "{search}" did not match any active endpoints.
                 </p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
