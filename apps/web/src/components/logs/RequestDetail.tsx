import type { ProxyLogEntry } from '@interceptr/shared';
import { MethodBadge } from '@/components/endpoints/MethodBadge';
import { StatusBadge } from './StatusBadge';
import { X, Clock, Zap, Layers, Braces, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestDetailProps {
  entry: ProxyLogEntry;
  onClose: () => void;
}

export function RequestDetail({ entry, onClose }: RequestDetailProps) {
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
             <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-success rotate-180" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Response Details</h3>
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
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                   <Braces className="w-3 h-3" /> Body
                 </div>
                 <div className="rounded-xl border border-border bg-muted overflow-hidden shadow-inner">
                   <pre className="text-[11px] font-mono font-medium p-4 overflow-auto max-h-80 leading-relaxed text-foreground/90">
                     {tryFormatJson(entry.responseBody)}
                   </pre>
                 </div>
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
