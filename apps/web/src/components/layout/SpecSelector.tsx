import { useState, useRef, useEffect, useCallback } from 'react';
import yaml from 'js-yaml';
import { useSpecs, useToggleSpec, useDeleteSpec, useUploadSpec, useUploadSpecFromUrl, useUpdateSpec, useReimportSpec } from '@/hooks/use-specs';
import { Braces, ChevronDown, Trash2, Plus, Upload, FileJson, Link, Globe, Loader2, X, Check, RefreshCw, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SpecSelector() {
  const { data: specs } = useSpecs();
  const toggleSpec = useToggleSpec();
  const deleteSpec = useDeleteSpec();
  const uploadSpec = useUploadSpec();
  const uploadFromUrl = useUploadSpecFromUrl();
  const updateSpec = useUpdateSpec();
  const reimportSpec = useReimportSpec();
  
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [importMode, setImportMode] = useState<'file' | 'url'>('url');
  const [specName, setSpecName] = useState('');
  const [specUrl, setSpecUrl] = useState('');
  
  const [editUpstream, setEditUpstream] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowImport(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!specName.trim()) return alert('Enter a spec name');
    try {
      const text = await file.text();
      const isYaml = /\.ya?ml$/i.test(file.name);
      const spec = isYaml ? yaml.load(text) : JSON.parse(text);
      uploadSpec.mutate({ spec: spec as object, name: specName.trim() }, {
        onSuccess: () => { setSpecName(''); setShowImport(false); setOpen(false); }
      });
    } catch { alert('Invalid file'); }
  }, [uploadSpec, specName]);

  const handleUrlImport = () => {
    if (!specUrl.trim() || !specName.trim()) return;
    uploadFromUrl.mutate({ url: specUrl.trim(), name: specName.trim() }, {
      onSuccess: () => { setSpecUrl(''); setSpecName(''); setShowImport(false); setOpen(false); }
    });
  };

  const handleReimport = (spec: any) => {
    if (spec.metadata.sourceUrl) {
      reimportSpec.mutate({ specId: spec.id });
    } else {
      // For file-based specs, we need to trigger a file picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const text = await file.text();
            const isYaml = /\.ya?ml$/i.test(file.name);
            const parsed = isYaml ? yaml.load(text) : JSON.parse(text);
            reimportSpec.mutate({ specId: spec.id, spec: parsed as object });
          } catch { alert('Invalid file'); }
        }
      };
      input.click();
    }
  };

  const saveUpstream = (id: string) => {
    updateSpec.mutate({ specId: id, data: { upstreamUrl: editUpstream.trim() } }, {
      onSuccess: () => setEditingId(null)
    });
  };

  const activeSpecs = specs?.filter(s => s.active) ?? [];
  const currentSpecName = activeSpecs.length === 1 ? activeSpecs[0].name : 
                         activeSpecs.length > 1 ? `${activeSpecs.length} Specs` : 'Select Spec';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all border shrink-0",
          open ? "bg-accent border-primary/20" : "bg-muted/30 border-border/40 hover:bg-accent/40 hover:border-border/60"
        )}
      >
        <Braces className="w-3.5 h-3.5 text-mode-mock opacity-70" />
        <span className="font-bold truncate max-w-[150px]">{currentSpecName}</span>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border shadow-2xl rounded-xl py-1.5 min-w-[340px] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-1 mb-1 border-b border-border/40 flex items-center justify-between">
             <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">API Specifications</span>
             <button 
               onClick={() => { setShowImport(!showImport); setEditingId(null); setSpecName(''); setSpecUrl(''); }}
               className="p-1 hover:bg-primary/10 text-primary rounded-md transition-all"
             >
                {showImport ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
             </button>
          </div>

          <div className="max-h-[450px] overflow-y-auto px-1.5 py-1 ">
            {showImport ? (
              <div className="p-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Spec Identifier</label>
                   <input
                     autoFocus
                     type="text"
                     placeholder="e.g. staging-api"
                     value={specName}
                     onChange={(e) => setSpecName(e.target.value)}
                     className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                   />
                </div>

                <div className="flex p-0.5 bg-muted rounded-lg border border-border/40">
                   <button 
                     onClick={() => setImportMode('url')}
                     className={cn("flex-1 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all", importMode === 'url' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                   >
                     <Globe className="w-3 h-3" /> URL
                   </button>
                   <button 
                     onClick={() => setImportMode('file')}
                     className={cn("flex-1 flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all", importMode === 'file' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
                   >
                     <Upload className="w-3 h-3" /> File
                   </button>
                </div>

                {importMode === 'url' ? (
                  <div className="space-y-3">
                    <div className="relative group">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                      <input
                        type="url"
                        placeholder="https://api.example.com/spec.json"
                        value={specUrl}
                        onChange={(e) => setSpecUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                      />
                    </div>
                    <button 
                      onClick={handleUrlImport}
                      disabled={!specUrl.trim() || !specName.trim() || uploadFromUrl.isPending}
                      className="w-full py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                      {uploadFromUrl.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Import from URL
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/60 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                    <FileJson className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary transition-colors mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Click to select file</span>
                    <input type="file" accept=".json,.yaml,.yml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {specs?.length === 0 && (
                  <div className="py-10 text-center px-6 space-y-2">
                    <Braces className="w-8 h-8 mx-auto text-muted-foreground opacity-20" />
                    <p className="text-[11px] font-bold text-muted-foreground/60 leading-tight">No specifications yet. Import one to start intercepting.</p>
                  </div>
                )}
                {specs?.map((spec) => (
                  <div key={spec.id} className="space-y-1">
                    <div
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all border border-transparent cursor-pointer relative overflow-hidden',
                        spec.active ? 'bg-primary/10 border-primary/20 shadow-sm ring-1 ring-primary/5' : 'text-muted-foreground/60 hover:bg-accent/40'
                      )}
                      onClick={() => toggleSpec.mutate(spec.id)}
                    >
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                            <span className={cn("font-black truncate text-xs uppercase tracking-tight", spec.active ? "text-foreground" : "text-muted-foreground")}>
                              {spec.name}
                            </span>
                            {spec.active && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />}
                         </div>
                         <p className="text-[10px] font-bold opacity-40 truncate leading-none mt-1">{spec.metadata.title} (v{spec.metadata.version})</p>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingId(editingId === spec.id ? null : spec.id);
                            setEditUpstream(spec.upstreamUrl);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-all"
                          title="Configure"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete spec "${spec.name}"?`)) deleteSpec.mutate(spec.id); }}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {editingId === spec.id && (
                      <div className="mx-2 p-3 rounded-xl bg-muted/40 border border-border/40 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-inner">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Upstream URL</label>
                           <div className="flex gap-2">
                              <input
                                autoFocus
                                type="url"
                                value={editUpstream}
                                onChange={(e) => setEditUpstream(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                              />
                              <button 
                                onClick={() => saveUpstream(spec.id)}
                                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1">
                           <button 
                             onClick={() => handleReimport(spec)}
                             disabled={reimportSpec.isPending}
                             className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-muted border border-border/60 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-accent transition-all"
                           >
                              {reimportSpec.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              Reimport
                           </button>
                           <button 
                             onClick={() => setEditingId(null)}
                             className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                           >
                              Cancel
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-border mt-1.5 pt-2 px-3 pb-1">
             <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                <span>Total: {specs?.length ?? 0}</span>
                <span className="text-primary/60">{activeSpecs.length} Active</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
