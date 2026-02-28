import { useState, useEffect, useCallback } from 'react';
import type { MockResponse, SpecResponse } from '@interceptr/shared';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { Hash, Layers, Braces, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MockEditorProps {
  mock: MockResponse;
  specResponses?: SpecResponse[];
  onChange: (mock: MockResponse) => void;
}

const STATUS_PRESETS = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];

export function MockEditor({ mock, specResponses, onChange }: MockEditorProps) {
  const [statusCode, setStatusCode] = useState(mock.statusCode);
  const [body, setBody] = useState(mock.body);
  const [headersText, setHeadersText] = useState(
    Object.entries(mock.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n'),
  );
  const [source, setSource] = useState<'preset' | 'manual'>(
    STATUS_PRESETS.includes(mock.statusCode) ? 'preset' : 'manual'
  );

  useEffect(() => {
    setStatusCode(mock.statusCode);
    setBody(mock.body);
    setHeadersText(
      Object.entries(mock.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
    );
    if (!STATUS_PRESETS.includes(mock.statusCode)) {
      setSource('manual');
    }
  }, [mock.statusCode, mock.body, mock.headers]);

  const commit = useCallback(() => {
    const headers: Record<string, string> = {};
    for (const line of headersText.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    onChange({ statusCode, headers, body });
  }, [statusCode, headersText, body, onChange]);

  const selectSpecResponse = (resp: SpecResponse) => {
    setStatusCode(resp.statusCode);
    setSource('manual');
    const newHeaders = resp.headers || { 'content-type': 'application/json' };
    setHeadersText(Object.entries(newHeaders).map(([k, v]) => `${k}: ${v}`).join('\n'));
    setBody(resp.body || '');
    
    onChange({ 
      statusCode: resp.statusCode, 
      headers: newHeaders, 
      body: resp.body || '' 
    });
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
            {specResponses.map((resp, i) => (
              <button
                key={i}
                onClick={() => selectSpecResponse(resp)}
                className="flex items-start gap-3 p-3 text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <span className={cn(
                  "px-1.5 py-0.5 text-[10px] font-black font-mono rounded border shrink-0",
                  resp.statusCode < 300 ? "text-emerald-400 border-emerald-400/30" : 
                  resp.statusCode < 500 ? "text-amber-400 border-amber-400/30" : "text-rose-400 border-rose-400/30"
                )}>
                  {resp.statusCode}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {resp.name}
                  </p>
                  {resp.description && resp.description !== resp.name && (
                    <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{resp.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
                setSource('preset');
                const headers: Record<string, string> = {};
                for (const line of headersText.split('\n')) {
                  const idx = line.indexOf(':');
                  if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
                }
                onChange({ statusCode: code, headers, body });
              }}
              className={cn(
                "px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors duration-75",
                source === 'preset' && statusCode === code
                  ? "bg-mode-mock/20 border-mode-mock text-mode-mock shadow-sm"
                  : "bg-muted border-border text-muted-foreground hover:border-mode-mock/40 hover:text-foreground"
              )}
            >
              {code}
            </button>
          ))}
          <input
            type="number"
            value={statusCode}
            onChange={(e) => {
              setStatusCode(Number(e.target.value));
              setSource('manual');
            }}
            onFocus={() => setSource('manual')}
            onBlur={commit}
            className={cn(
              "w-16 px-2.5 py-1.5 text-xs font-mono font-bold bg-background border rounded-lg focus:ring-1 focus:ring-mode-mock focus:border-mode-mock outline-none transition-colors duration-75",
              source === 'manual'
                ? "bg-mode-mock/20 border-mode-mock text-mode-mock shadow-sm" 
                : "border-border text-muted-foreground hover:border-mode-mock/20"
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
            <Layers className="w-3.5 h-3.5" />
            Headers
          </label>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            onBlur={commit}
            rows={6}
            className="w-full text-[11px] font-mono rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-1 focus:ring-mode-mock resize-none shadow-inner leading-relaxed"
            placeholder="content-type: application/json"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
            <Braces className="w-3.5 h-3.5" />
            Body
          </label>
          <div className="rounded-xl border border-border bg-background overflow-hidden shadow-inner focus-within:ring-1 focus-within:ring-mode-mock">
            <CodeMirror
              value={body}
              onChange={setBody}
              onBlur={commit}
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
        </div>
      </div>
    </div>
  );
}
