import { useState, useEffect, useCallback, useRef } from 'react';
import type { MockResponse, SpecResponse } from '@interceptr/shared';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { Hash, Layers, Braces, Sparkles, Plus, X, WrapText, AlertCircle, Dices, Bookmark, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTestData } from '@/lib/generate-test-data';
import { useSavedResponses, useCreateSavedResponse, useUpdateSavedResponse, useDeleteSavedResponse } from '@/hooks/use-saved-responses';

interface MockEditorProps {
  mock: MockResponse;
  specResponses?: SpecResponse[];
  onChange: (mock: MockResponse) => void;
}

const STATUS_PRESETS = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];

const COMMON_HEADER_NAMES = [
  'Content-Type',
  'Cache-Control',
  'Authorization',
  'Location',
  'Retry-After',
  'WWW-Authenticate',
  'ETag',
  'Last-Modified',
  'Content-Encoding',
  'Content-Length',
  'X-Request-ID',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'Access-Control-Allow-Origin',
];

const CONTENT_TYPE_PRESETS = [
  'application/json',
  'text/plain',
  'text/html',
  'application/xml',
  'application/octet-stream',
];

const QUICK_ADD_HEADERS: { key: string; value: string; label: string }[] = [
  { key: 'content-type', value: 'application/json', label: 'Content-Type' },
  { key: 'cache-control', value: 'no-cache', label: 'No-Cache' },
  { key: 'location', value: '/', label: 'Location' },
  { key: 'retry-after', value: '5', label: 'Retry-After' },
];

type HeaderRow = { key: string; value: string };

function toRows(headers: Record<string, string>): HeaderRow[] {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

function toRecord(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of rows) {
    if (key.trim()) out[key.trim().toLowerCase()] = value.trim();
  }
  return out;
}

export function MockEditor({ mock, specResponses, onChange }: MockEditorProps) {
  const [statusCode, setStatusCode] = useState(mock.statusCode);
  const [body, setBody] = useState(mock.body);
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>(() => toRows(mock.headers));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activeSource, setActiveSource] = useState<
    { type: 'spec'; index: number } | { type: 'saved'; id: string } | null
  >(null);

  const { data: savedResponses } = useSavedResponses();
  const createSavedResponse = useCreateSavedResponse();
  const updateSavedResponse = useUpdateSavedResponse();
  const deleteSavedResponse = useDeleteSavedResponse();

  useEffect(() => {
    setStatusCode(mock.statusCode);
    setBody(mock.body);
    setHeaderRows(toRows(mock.headers));
  }, [mock.statusCode, mock.body, mock.headers]);

  // Restore active source on mount once saved responses are available
  const didDetect = useRef(false);
  useEffect(() => {
    if (didDetect.current || savedResponses === undefined) return;
    didDetect.current = true;

    const saved = savedResponses.find(r =>
      r.statusCode === mock.statusCode &&
      r.body === mock.body &&
      JSON.stringify(r.headers) === JSON.stringify(mock.headers),
    );
    if (saved) { setActiveSource({ type: 'saved', id: saved.id }); return; }

    if (specResponses) {
      const idx = specResponses.findIndex(r =>
        r.statusCode === mock.statusCode && (r.body ?? '') === mock.body,
      );
      if (idx >= 0) setActiveSource({ type: 'spec', index: idx });
    }
  }, [savedResponses]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!body.trim()) { setJsonError(null); return; }
    try { JSON.parse(body); setJsonError(null); }
    catch (e) { setJsonError(e instanceof SyntaxError ? e.message : 'Invalid JSON'); }
  }, [body]);

  const commit = useCallback(
    (rows: HeaderRow[], sc: number, b: string) => {
      onChange({ statusCode: sc, headers: toRecord(rows), body: b });
    },
    [onChange],
  );

  const formatJson = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(body), null, 2);
      setBody(formatted);
      commit(headerRows, statusCode, formatted);
    } catch {}
  };

  const updateRow = (index: number, field: 'key' | 'value', val: string) => {
    setHeaderRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: val } : r)));
  };

  const removeRow = (index: number) => {
    setHeaderRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      commit(next, statusCode, body);
      return next;
    });
  };

  const addRow = () => setHeaderRows((prev) => [...prev, { key: '', value: '' }]);

  const quickAddHeader = (key: string, value: string) => {
    setHeaderRows((prev) => {
      const idx = prev.findIndex((r) => r.key.toLowerCase() === key.toLowerCase());
      const next =
        idx >= 0
          ? prev.map((r, i) => (i === idx ? { key: r.key, value } : r))
          : [...prev, { key, value }];
      commit(next, statusCode, body);
      return next;
    });
  };

  const applySpecResponse = (resp: SpecResponse, body: string) => {
    const sc = resp.statusCode;
    const newHeaders = resp.headers && Object.keys(resp.headers).length > 0
      ? resp.headers
      : { 'content-type': 'application/json' };
    setStatusCode(sc);
    setHeaderRows(toRows(newHeaders));
    setBody(body);
    onChange({ statusCode: sc, headers: newHeaders, body });
  };

  const selectSpecResponse = (resp: SpecResponse, index: number) => {
    setActiveSource({ type: 'spec', index });
    applySpecResponse(resp, resp.body ?? '');
  };

  const generateAndApply = (resp: SpecResponse, index: number) => {
    setActiveSource({ type: 'spec', index });
    const generated = resp.schema ? generateTestData(resp.schema) : null;
    const b = generated !== null ? JSON.stringify(generated, null, 2) : (resp.body ?? '');
    applySpecResponse(resp, b);
  };

  const activeSaved = activeSource?.type === 'saved'
    ? (savedResponses?.find(r => r.id === activeSource.id) ?? null)
    : null;

  const hasChanges = activeSaved !== null && (
    statusCode !== activeSaved.statusCode ||
    body !== activeSaved.body ||
    JSON.stringify(toRecord(headerRows)) !== JSON.stringify(activeSaved.headers)
  );

  const handleSaveCurrent = () => {
    if (activeSaved) {
      updateSavedResponse.mutate({
        id: activeSaved.id,
        data: { name: activeSaved.name, statusCode, headers: toRecord(headerRows), body },
      });
    } else {
      setShowSaveForm(true);
    }
  };

  const handleSave = () => {
    if (!savingName.trim()) return;
    createSavedResponse.mutate(
      { name: savingName.trim(), statusCode, headers: toRecord(headerRows), body },
      { onSuccess: () => { setSavingName(''); setShowSaveForm(false); } },
    );
  };

  return (
    <div className="flex flex-col gap-6 p-2 bg-background">
      {specResponses && specResponses.length > 0 && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Spec Defined Responses
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {specResponses.map((resp, i) => {
              const isActive = activeSource?.type === 'spec' && activeSource.index === i;
              return (
              <div
                key={i}
                className={cn(
                  "flex items-stretch rounded-xl border transition-all group overflow-hidden",
                  isActive
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <button
                  onClick={() => selectSpecResponse(resp, i)}
                  className="flex flex-1 items-start gap-3 p-3 text-left"
                >
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-black font-mono rounded border shrink-0',
                      resp.statusCode < 300
                        ? 'text-emerald-400 border-emerald-400/30'
                        : resp.statusCode < 500
                          ? 'text-amber-400 border-amber-400/30'
                          : 'text-rose-400 border-rose-400/30',
                    )}
                  >
                    {resp.statusCode}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {resp.name}
                    </p>
                    {resp.description && resp.description !== resp.name && (
                      <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">
                        {resp.description}
                      </p>
                    )}
                  </div>
                </button>
                {resp.schema && (
                  <button
                    onClick={() => generateAndApply(resp, i)}
                    className="px-2.5 border-l border-border/50 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all shrink-0"
                    title="Generate test data from schema"
                    aria-label="Generate test data"
                  >
                    <Dices className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <Bookmark className="w-3.5 h-3.5" />
            Saved Responses
          </label>
          {showSaveForm ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                placeholder="Name..."
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setShowSaveForm(false); setSavingName(''); }
                }}
                className="px-2 py-1 text-[11px] font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner w-32"
              />
              <button
                onClick={handleSave}
                disabled={!savingName.trim() || createSavedResponse.isPending}
                className="p-1 text-primary hover:bg-primary/10 rounded-md transition-all disabled:opacity-40"
                aria-label="Confirm save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setShowSaveForm(false); setSavingName(''); }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-all"
                aria-label="Cancel save"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSaveCurrent}
              disabled={activeSaved !== null && !hasChanges}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Save current response"
            >
              <Plus className="w-3 h-3" />
              Save current
            </button>
          )}
        </div>

        {savedResponses && savedResponses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {savedResponses.map((resp) => {
              const isActive = activeSource?.type === 'saved' && activeSource.id === resp.id;
              return (
              <div
                key={resp.id}
                className={cn(
                  "flex items-stretch rounded-xl border transition-all group overflow-hidden",
                  isActive
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <button
                  onClick={() => {
                    setActiveSource({ type: 'saved', id: resp.id });
                    setStatusCode(resp.statusCode);
                    setHeaderRows(toRows(resp.headers));
                    setBody(resp.body);
                    onChange({ statusCode: resp.statusCode, headers: resp.headers, body: resp.body });
                  }}
                  className="flex flex-1 items-center gap-3 p-3 text-left"
                >
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-black font-mono rounded border shrink-0',
                      resp.statusCode < 300
                        ? 'text-emerald-400 border-emerald-400/30'
                        : resp.statusCode < 500
                          ? 'text-amber-400 border-amber-400/30'
                          : 'text-rose-400 border-rose-400/30',
                    )}
                  >
                    {resp.statusCode}
                  </span>
                  <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors flex-1">
                    {resp.name}
                  </p>
                </button>
                <button
                  onClick={() => deleteSavedResponse.mutate(resp.id)}
                  className="px-2.5 border-l border-border/50 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all shrink-0"
                  aria-label="Delete saved response"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/40 font-mono px-1">
            No saved responses yet — configure a response and click Save current.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
          <Hash className="w-3.5 h-3.5" />
          Status Code
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_PRESETS.map((code) => (
            <button
              key={code}
              onClick={() => {
                setStatusCode(code);
                commit(headerRows, code, body);
              }}
              className={cn(
                'px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors duration-75',
                statusCode === code
                  ? 'bg-mode-mock/20 border-mode-mock text-mode-mock shadow-sm'
                  : 'bg-muted border-border text-muted-foreground hover:border-mode-mock/40 hover:text-foreground',
              )}
            >
              {code}
            </button>
          ))}
          <input
            type="number"
            value={statusCode}
            onChange={(e) => setStatusCode(Number(e.target.value))}
            onBlur={() => commit(headerRows, statusCode, body)}
            className={cn(
              'w-16 px-2.5 py-1.5 text-xs font-mono font-bold bg-background border rounded-lg focus:ring-1 focus:ring-mode-mock focus:border-mode-mock outline-none transition-colors duration-75',
              !STATUS_PRESETS.includes(statusCode)
                ? 'bg-mode-mock/20 border-mode-mock text-mode-mock shadow-sm'
                : 'border-border text-muted-foreground hover:border-mode-mock/20',
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5" />
              Headers
            </label>
            <button
              onClick={addRow}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
              aria-label="Add header"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADD_HEADERS.map((h) => (
              <button
                key={`${h.key}:${h.value}`}
                onClick={() => quickAddHeader(h.key, h.value)}
                className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border border-border bg-muted text-muted-foreground hover:border-mode-mock/40 hover:text-foreground hover:bg-accent transition-all"
              >
                {h.label}
              </button>
            ))}
          </div>

          <datalist id="header-names">
            {COMMON_HEADER_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="space-y-1.5">
            {headerRows.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 font-mono px-1 py-2">
                No headers — use quick-add or + Add
              </p>
            )}
            {headerRows.map((row, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    list="header-names"
                    value={row.key}
                    onChange={(e) => updateRow(i, 'key', e.target.value)}
                    onBlur={() => commit(headerRows, statusCode, body)}
                    placeholder="Header-Name"
                    aria-label="Header name"
                    className="w-[45%] px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-mode-mock shadow-inner"
                  />
                  <span className="text-muted-foreground/40 text-xs font-mono shrink-0">:</span>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateRow(i, 'value', e.target.value)}
                    onBlur={() => commit(headerRows, statusCode, body)}
                    placeholder="value"
                    aria-label="Header value"
                    className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-mode-mock shadow-inner"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    className="p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                    aria-label="Remove header"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {row.key.toLowerCase() === 'content-type' && (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {CONTENT_TYPE_PRESETS.map((ct) => (
                      <button
                        key={ct}
                        onClick={() => {
                          updateRow(i, 'value', ct);
                          const next = headerRows.map((r, j) =>
                            j === i ? { ...r, value: ct } : r,
                          );
                          commit(next, statusCode, body);
                        }}
                        className={cn(
                          'px-1.5 py-0.5 text-[9px] font-mono rounded border transition-all',
                          row.value === ct
                            ? 'border-mode-mock/50 text-mode-mock bg-mode-mock/10'
                            : 'border-border text-muted-foreground/60 hover:border-mode-mock/30 hover:text-muted-foreground',
                        )}
                      >
                        {ct}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              <Braces className="w-3.5 h-3.5" />
              Body
            </label>
            <button
              onClick={formatJson}
              disabled={!!jsonError || !body.trim()}
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Format JSON"
            >
              <WrapText className="w-3 h-3" />
              Format
            </button>
          </div>
          <div className={cn(
            "rounded-xl border bg-background overflow-hidden shadow-inner focus-within:ring-1",
            jsonError ? "border-destructive/50 focus-within:ring-destructive/50" : "border-border focus-within:ring-mode-mock"
          )}>
            <CodeMirror
              value={body}
              onChange={setBody}
              onBlur={() => commit(headerRows, statusCode, body)}
              extensions={[json()]}
              height="150px"
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
              }}
              className="text-[11px] font-mono"
            />
          </div>
          {jsonError && (
            <div className="flex items-start gap-1.5 px-1">
              <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
              <p data-testid="json-error" className="text-[10px] text-destructive font-mono leading-tight">{jsonError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
