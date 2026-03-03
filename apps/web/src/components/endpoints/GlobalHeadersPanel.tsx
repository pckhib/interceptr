import { useState, useEffect } from 'react';
import { Plus, X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpecs, useUpdateSpec } from '@/hooks/use-specs';
import type { ProjectSpec } from '@interceptr/shared';

type HeaderRow = { key: string; value: string };

const COMMON_HEADER_NAMES = [
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
  'Cache-Control',
  'Content-Type',
  'X-Request-ID',
];

const QUICK_ADD_HEADERS = [
  { key: 'access-control-allow-origin', value: '*', label: 'CORS Origin' },
  { key: 'access-control-allow-headers', value: '*', label: 'CORS Headers' },
  { key: 'access-control-allow-methods', value: '*', label: 'CORS Methods' },
  { key: 'cache-control', value: 'no-cache', label: 'No-Cache' },
];

function toRows(headers: Record<string, string> = {}): HeaderRow[] {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

function toRecord(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of rows) {
    if (key.trim()) out[key.trim().toLowerCase()] = value.trim();
  }
  return out;
}

function SpecHeaderEditor({ spec }: { spec: ProjectSpec }) {
  const updateSpec = useUpdateSpec();
  const [rows, setRows] = useState<HeaderRow[]>(() => toRows(spec.globalHeaders));

  useEffect(() => {
    setRows(toRows(spec.globalHeaders));
  }, [spec.globalHeaders]);

  const save = (next: HeaderRow[]) => {
    updateSpec.mutate({ specId: spec.id, data: { globalHeaders: toRecord(next) } });
  };

  const addRow = () => setRows((prev) => [...prev, { key: '', value: '' }]);

  const updateRow = (i: number, field: 'key' | 'value', val: string) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: val } : r)));

  const removeRow = (i: number) => {
    const next = rows.filter((_, j) => j !== i);
    setRows(next);
    save(next);
  };

  const quickAdd = (key: string, value: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key.toLowerCase() === key.toLowerCase());
      const next =
        idx >= 0 ? prev.map((r, i) => (i === idx ? { key: r.key, value } : r)) : [...prev, { key, value }];
      save(next);
      return next;
    });
  };

  const totalHeaders = Object.keys(spec.globalHeaders ?? {}).length;

  return (
    <div className="space-y-2">
      {/* Spec label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-foreground/70 uppercase tracking-widest">{spec.name}</span>
          {totalHeaders > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-primary/15 text-primary border border-primary/20">
              {totalHeaders}
            </span>
          )}
        </div>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          aria-label="Add global header"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Quick-add chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ADD_HEADERS.map((h) => (
          <button
            key={`${h.key}:${h.value}`}
            onClick={() => quickAdd(h.key, h.value)}
            className={cn(
              'px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border transition-all',
              rows.some((r) => r.key.toLowerCase() === h.key && r.value === h.value)
                ? 'border-primary/40 text-primary bg-primary/10'
                : 'border-border bg-muted text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-accent',
            )}
          >
            {h.label}
          </button>
        ))}
      </div>

      <datalist id="global-header-names">
        {COMMON_HEADER_NAMES.map((name) => <option key={name} value={name} />)}
      </datalist>

      {/* Header rows */}
      {rows.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/40 font-mono py-1">No global headers — use quick-add or + Add.</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                list="global-header-names"
                value={row.key}
                onChange={(e) => updateRow(i, 'key', e.target.value)}
                onBlur={() => save(rows)}
                placeholder="Header-Name"
                aria-label="Global header name"
                className="w-[45%] px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
              <span className="text-muted-foreground/40 text-xs font-mono shrink-0">:</span>
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(i, 'value', e.target.value)}
                onBlur={() => save(rows)}
                placeholder="value"
                aria-label="Global header value"
                className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
              <button
                onClick={() => removeRow(i)}
                className="p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                aria-label="Remove global header"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface GlobalHeadersPanelProps {
  open: boolean;
}

export function GlobalHeadersPanel({ open }: GlobalHeadersPanelProps) {
  const { data: specs } = useSpecs();
  const activeSpecs = specs?.filter((s) => s.active) ?? [];

  if (!open) return null;

  return (
    <div className="border-b border-border/60 bg-muted/20 px-6 py-4 space-y-4 animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Global Response Headers
        </span>
        <span className="text-[9px] text-muted-foreground/40 font-medium">
          — injected into every response for the spec. Per-endpoint mock headers take priority.
        </span>
      </div>

      {activeSpecs.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50">No active spec selected.</p>
      ) : (
        <div className={cn('space-y-5', activeSpecs.length > 1 && 'divide-y divide-border/40')}>
          {activeSpecs.map((spec) => (
            <div key={spec.id} className={cn(activeSpecs.length > 1 && 'pt-4 first:pt-0')}>
              <SpecHeaderEditor spec={spec} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GlobalHeadersTrigger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { data: specs } = useSpecs();
  const activeSpecs = specs?.filter((s) => s.active) ?? [];
  const totalHeaders = activeSpecs.reduce(
    (sum, s) => sum + Object.keys(s.globalHeaders ?? {}).length,
    0,
  );

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all',
        open
          ? 'bg-primary/10 border-primary/20 text-primary'
          : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-accent/40 hover:border-border/60 hover:text-foreground',
      )}
      title="Global Response Headers"
    >
      <Layers className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Global Headers</span>
      {totalHeaders > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[9px] font-black border',
          open ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-muted border-border text-muted-foreground',
        )}>
          {totalHeaders}
        </span>
      )}
    </button>
  );
}
