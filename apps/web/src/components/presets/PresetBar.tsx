import { useState, useMemo, useRef, useEffect } from 'react';
import { usePresets, useCreatePreset, useDeletePreset, useApplyPreset } from '@/hooks/use-presets';
import { useEndpoints, useBulkUpdateEndpoints } from '@/hooks/use-endpoints';
import type { EndpointConfig, Preset, ProxyMode } from '@interceptr/shared';
import { Zap, Trash2, Wifi, AlertTriangle, Check, ChevronDown, Save, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  name: string;
  icon: React.FC<{ className?: string }>;
  match: (endpoints: EndpointConfig[]) => boolean;
  apply: (endpoints: EndpointConfig[]) => Record<string, Partial<EndpointConfig>>;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    name: 'Slow',
    icon: Wifi,
    match: (endpoints) =>
      endpoints.length > 0 &&
      endpoints.every((ep) => ep.mode === 'delay' && ep.delay?.ms === 2000),
    apply: (endpoints) => {
      const updates: Record<string, Partial<EndpointConfig>> = {};
      for (const ep of endpoints) {
        updates[ep.id] = { mode: 'delay' as ProxyMode, delay: { ms: 2000 } };
      }
      return updates;
    },
  },
  {
    name: 'Errors',
    icon: AlertTriangle,
    match: (endpoints) =>
      endpoints.length > 0 &&
      endpoints.every((ep) => ep.mode === 'mock' && ep.mock?.statusCode === 500),
    apply: (endpoints) => {
      const updates: Record<string, Partial<EndpointConfig>> = {};
      for (const ep of endpoints) {
        updates[ep.id] = {
          mode: 'mock' as ProxyMode,
          mock: { statusCode: 500, headers: { 'content-type': 'application/json' }, body: '{"error":"Internal Server Error"}' },
        };
      }
      return updates;
    },
  },
  {
    name: 'Pass All',
    icon: Zap,
    match: (endpoints) =>
      endpoints.length > 0 &&
      endpoints.every((ep) => ep.mode === 'passthrough'),
    apply: (endpoints) => {
      const updates: Record<string, Partial<EndpointConfig>> = {};
      for (const ep of endpoints) {
        updates[ep.id] = { mode: 'passthrough' as ProxyMode };
      }
      return updates;
    },
  },
];

function matchesSavedPreset(endpoints: EndpointConfig[], preset: Preset): boolean {
  for (const [id, config] of Object.entries(preset.endpoints)) {
    const ep = endpoints.find((e) => e.id === id);
    if (!ep) return false;
    if (config.mode !== undefined && ep.mode !== config.mode) return false;
    if (config.mode === 'delay' && config.delay) {
      if (ep.delay?.ms !== config.delay.ms) return false;
    }
    if (config.mode === 'mock' && config.mock) {
      if (ep.mock?.statusCode !== config.mock.statusCode) return false;
      if (ep.mock?.body !== config.mock.body) return false;
    }
  }
  return true;
}

function detectActivePreset(
  endpoints: EndpointConfig[] | undefined,
  presets: Preset[] | undefined,
): string | null {
  if (!endpoints?.length) return null;

  for (const action of QUICK_ACTIONS) {
    if (action.match(endpoints)) return `builtin:${action.name}`;
  }

  if (presets) {
    for (const preset of presets) {
      if (matchesSavedPreset(endpoints, preset)) return `saved:${preset.name}`;
    }
  }

  return null;
}

export function PresetBar() {
  const { data: presets } = usePresets();
  const { data: endpoints } = useEndpoints();
  const createPreset = useCreatePreset();
  const deletePreset = useDeletePreset();
  const applyPreset = useApplyPreset();
  const bulkUpdate = useBulkUpdateEndpoints();

  const activePreset = useMemo(
    () => detectActivePreset(endpoints, presets),
    [endpoints, presets],
  );

  const [showSaved, setShowSaved] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSaved(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasEndpoints = !!endpoints?.length;

  const handleSave = () => {
    if (!newName.trim() || !endpoints) return;
    const endpointConfigs: Record<string, Partial<EndpointConfig>> = {};
    for (const ep of endpoints) {
      endpointConfigs[ep.id] = { mode: ep.mode, delay: ep.delay, mock: ep.mock };
    }
    createPreset.mutate(
      { name: newName.trim(), endpoints: endpointConfigs },
      {
        onSuccess: () => {
          setNewName('');
          setShowSaveInput(false);
        },
      },
    );
  };

  if (!hasEndpoints) return null;

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/40 rounded-xl p-1 flex items-center gap-1 shadow-sm">
      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border/20 shadow-inner">
        <div className="px-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden lg:block">
          Presets
        </div>
        {QUICK_ACTIONS.map(({ name, icon: Icon, apply }) => {
          const isActive = activePreset === `builtin:${name}`;
          return (
            <button
              key={name}
              onClick={() => {
                if (!endpoints) return;
                bulkUpdate.mutate(apply(endpoints));
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md border transition-colors duration-75',
                isActive
                  ? 'bg-primary/20 border-primary/30 text-primary shadow-sm'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5',
              )}
            >
              <Icon className={cn("w-3.5 h-3.5")} />
              <span className="hidden sm:inline">{name}</span>
              {isActive && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-border/40 mx-1 shrink-0" />

              {presets && presets.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowSaved(!showSaved)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-colors duration-75',
                      showSaved || (activePreset && activePreset.startsWith('saved:'))
                        ? 'bg-primary/20 border-primary/30 text-primary shadow-sm'
                        : 'border-border/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Saved ({presets.length})</span>
                    <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform duration-75', showSaved && 'rotate-180')} />
                  </button>
          {showSaved && (
            <div className="absolute right-0 top-full mt-2 z-[100] bg-popover border border-border shadow-2xl rounded-xl py-1.5 min-w-[240px]">
              <div className="px-3 py-1 mb-1 border-b border-border/40">
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Saved Configurations</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto px-1.5 ">
                {presets.map((preset) => {
                  const isActive = activePreset === `saved:${preset.name}`;
                  return (
                    <div
                      key={preset.name}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 text-xs rounded-lg transition-colors duration-75 mb-0.5 border border-transparent',
                        isActive ? 'bg-primary/10 border-primary/20 text-primary font-bold shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer py-0.5" 
                        onClick={() => applyPreset.mutate(preset.name, { onSuccess: () => setShowSaved(false) })}
                      >
                        <p className="font-bold truncate">{preset.name}</p>
                        <p className="text-[9px] opacity-60 font-medium">
                          {Object.keys(preset.endpoints).length} endpoints
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset.mutate(preset.name);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors duration-75 opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showSaveInput ? (
        <div className="flex items-center gap-1.5 bg-accent/20 rounded-lg p-0.5 border border-primary/20 shadow-inner ml-auto">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setShowSaveInput(false);
                setNewName('');
              }
            }}
            className="w-28 sm:w-40 px-3 py-1.5 text-[10px] font-bold rounded-md border border-border/40 bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors duration-75"
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim()}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors duration-75 shadow-sm"
          >
            Save
          </button>
          <button
            onClick={() => {
              setShowSaveInput(false);
              setNewName('');
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors duration-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSaveInput(true)}
          disabled={activePreset !== null}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border border-dashed transition-colors duration-75',
            activePreset !== null
              ? 'border-border/20 text-muted-foreground/20 cursor-not-allowed'
              : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 shadow-sm',
          )}
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      )}
    </div>
  );
}
