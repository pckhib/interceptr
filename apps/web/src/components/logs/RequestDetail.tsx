import { useState } from 'react';
import type { ProxyLogEntry } from '@interceptr/shared';
import { MethodBadge } from '@/components/endpoints/MethodBadge';
import { StatusBadge } from './StatusBadge';
import { useCreateSavedResponse } from '@/hooks/use-saved-responses';
import { X, Clock, Zap, Layers, Braces, ArrowRight, Copy, Check, Bookmark, Plus, AlertTriangle } from 'lucide-react';

interface RequestDetailProps {
  entry: ProxyLogEntry;
  onClose: () => void;
}

export function RequestDetail({ entry, onClose }: RequestDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saved, setSaved] = useState(false);
  const createSavedResponse = useCreateSavedResponse();

  const copyBody = () => {
    navigator.clipboard.writeText(tryFormatJson(entry.responseBody ?? ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    createSavedResponse.mutate(
      {
        name: saveName.trim(),
        statusCode: entry.statusCode,
        headers: entry.responseHeaders ?? {},
        body: entry.responseBody ?? '',
      },
      { onSuccess: () => { setSaveName(''); setShowSaveForm(false); setSaved(true); setTimeout(() => setSaved(false), 2000); } },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />
      
      <div
        className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2">
               <MethodBadge method={entry.method} />
               <StatusBadge status={entry.statusCode} />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">
                 {entry.mode}
               </span>
            </div>
            <h2 className="text-sm font-black font-mono text-foreground truncate break-all">
              {entry.path}
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
             <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-75">
                <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-4">
             <div className="bg-muted rounded-xl p-3 border border-border">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                   <Clock className="w-3 h-3" /> Latency
                </div>
                <div className="text-sm font-black font-mono text-primary">
                   {entry.latencyMs}<span className="text-[10px] ml-0.5 opacity-60">ms</span>
                </div>
             </div>
             <div className="bg-muted rounded-xl p-3 border border-border">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                   <Zap className="w-3 h-3" /> Status
                </div>
                <div className="text-sm font-black font-mono text-foreground">
                   {entry.statusCode}
                </div>
             </div>
             <div className="bg-muted rounded-xl p-3 border border-border">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                   <Clock className="w-3 h-3" /> Timestamp
                </div>
                <div className="text-xs font-bold text-foreground truncate">
                   {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
             </div>
          </div>

          {/* Request Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Request Details</h3>
             </div>
             
             {entry.requestHeaders && (
               <div className="space-y-2">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                   <Layers className="w-3 h-3" /> Headers
                 </div>
                 <pre className="text-[11px] font-mono font-medium bg-muted border border-border rounded-xl p-4 overflow-auto max-h-48 shadow-inner leading-relaxed">
                   {Object.entries(entry.requestHeaders)
                     .map(([k, v]) => `${k}: ${v}`)
                     .join('\n')}
                 </pre>
               </div>
             )}
          </div>

          {/* Response Section */}
          <div className="space-y-4 border-t border-border pt-8">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <ArrowRight className="w-4 h-4 text-success rotate-180" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Response Details</h3>
               </div>
               {showSaveForm ? (
                 <div className="flex items-center gap-1.5">
                   <input
                     autoFocus
                     type="text"
                     placeholder="Name..."
                     value={saveName}
                     onChange={(e) => setSaveName(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') handleSave();
                       if (e.key === 'Escape') { setShowSaveForm(false); setSaveName(''); }
                     }}
                     className="px-2 py-1 text-[11px] font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner w-32"
                   />
                   <button
                     onClick={handleSave}
                     disabled={!saveName.trim() || createSavedResponse.isPending}
                     className="p-1 text-primary hover:bg-primary/10 rounded-md transition-all disabled:opacity-40"
                     aria-label="Confirm save response"
                   >
                     <Check className="w-3.5 h-3.5" />
                   </button>
                   <button
                     onClick={() => { setShowSaveForm(false); setSaveName(''); }}
                     className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-all"
                     aria-label="Cancel save response"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ) : saved ? (
                 <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-success">
                   <Check className="w-3 h-3" />
                   Saved
                 </span>
               ) : (
                 <button
                   onClick={() => setShowSaveForm(true)}
                   className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                   aria-label="Save as mock response"
                 >
                   <Bookmark className="w-3 h-3" />
                   <Plus className="w-2.5 h-2.5 -ml-0.5" />
                   Save as mock
                 </button>
               )}
             </div>

             {entry.responseHeaders && (
               <div className="space-y-2">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                   <Layers className="w-3 h-3" /> Headers
                 </div>
                 <pre className="text-[11px] font-mono font-medium bg-muted border border-border rounded-xl p-4 overflow-auto max-h-48 shadow-inner leading-relaxed">
                   {Object.entries(entry.responseHeaders)
                     .map(([k, v]) => `${k}: ${v}`)
                     .join('\n')}
                 </pre>
               </div>
             )}

             {entry.responseBody && (
               <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                     <Braces className="w-3 h-3" /> Body
                   </div>
                   <button
                     onClick={copyBody}
                     className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                     aria-label="Copy response body"
                   >
                     {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                     {copied ? 'Copied' : 'Copy'}
                   </button>
                 </div>
                 <div className="rounded-xl border border-border bg-muted overflow-hidden shadow-inner">
                   <pre className="text-[11px] font-mono font-medium p-4 overflow-auto max-h-80 leading-relaxed text-foreground/90">
                     {tryFormatJson(entry.responseBody)}
                   </pre>
                 </div>
                 {entry.responseBodyTruncated && (
                   <div className="flex items-center gap-1.5 px-1 pt-1">
                     <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                     <p className="text-[10px] text-amber-400 font-mono">
                       Response body truncated — only the first 100 KB is shown.
                     </p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted flex justify-end gap-3 px-6">
           <button 
             onClick={onClose}
             className="px-6 py-2 text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-75 shadow-sm"
           >
             Dismiss
           </button>
        </div>
      </div>
    </div>
  );
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
