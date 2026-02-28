import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveProject, useRenameProject } from '@/hooks/use-projects';
import { Download, Upload, Pencil, Check, X, Server, Database, User, Globe, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoFull from '@/assets/logo-full.png';
import { SiGithub } from '@icons-pack/react-simple-icons';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'config' | 'about';

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: api.config.get });
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.health });
  const { data: activeProject } = useActiveProject();
  const renameProject = useRenameProject();

  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [proxyPort, setProxyPort] = useState(4000);
  const [editingName, setEditingName] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (config) setProxyPort(config.proxyPort);
  }, [config]);

  useEffect(() => {
    if (activeProject) setProjectName(activeProject.name);
  }, [activeProject]);

  const updateConfig = useMutation({
    mutationFn: () => api.config.update({ proxyPort }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      onClose();
    },
  });

  const handleExport = async () => {
    const data = await api.config.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interceptr-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    await api.config.import(data);
    queryClient.invalidateQueries();
  };

  const handleRename = () => {
    if (!activeProject || !projectName.trim()) return;
    renameProject.mutate(
      { id: activeProject.id, name: projectName.trim() },
      { onSuccess: () => setEditingName(false) },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-card border border-border/60 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/40 bg-muted flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">System Control</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-75">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/20 bg-muted/30 shrink-0 px-4">
          <button
            onClick={() => setActiveTab('config')}
            className={cn(
              "px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all duration-75",
              activeTab === 'config' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={cn(
              "px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all duration-75",
              activeTab === 'about' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            About
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {activeTab === 'config' ? (
            <>
              {/* Project Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Project Identity</span>
                </div>

                {activeProject && (
                  <div className="space-y-3">
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl border border-primary/20 bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                        />
                        <div className="flex items-center gap-1.5">
                          <button onClick={handleRename} className="p-2.5 bg-success/10 text-success rounded-xl hover:bg-success hover:text-success-foreground transition-colors duration-75 shadow-sm">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setProjectName(activeProject.name); setEditingName(false); }} className="p-2.5 bg-muted text-muted-foreground rounded-xl transition-colors duration-75">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/10 group">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground">{activeProject.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase mt-0.5 tracking-tighter">Project ID: {activeProject.id}</span>
                        </div>
                        <button
                          onClick={() => setEditingName(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-all border border-transparent hover:border-primary/20"
                        >
                          <Pencil className="w-3 h-3" />
                          Rename
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Network Settings */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 px-1">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Network Environment</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-black text-foreground uppercase tracking-tight leading-none mb-1">Proxy Port</p>
                    <p className="text-[10px] text-muted-foreground/60 font-medium">Internal server interface listener port.</p>
                  </div>
                  <input
                    type="number"
                    value={proxyPort}
                    onChange={(e) => setProxyPort(Number(e.target.value))}
                    className="w-32 px-4 py-2 text-sm font-mono font-black rounded-xl border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner text-right"
                  />
                </div>
              </div>

              {/* Data Portability */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 px-1">
                  <Database className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Data Sovereignty</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border/60 bg-card/40 hover:bg-accent/40 hover:border-primary/20 transition-all shadow-sm group"
                  >
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    Backup
                  </button>
                  <label className="flex items-center justify-center gap-2.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border/60 bg-card/40 hover:bg-accent/40 hover:border-primary/20 transition-all shadow-sm cursor-pointer group">
                    <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    Restore
                    <input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImport(file); }} />
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center space-y-8 py-4">
              <div className="max-w-[300px] p-4">
                <img src={logoFull} alt="Interceptr Full Logo" className="w-full h-auto object-contain" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter uppercase">Interceptr</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Version {health?.version ?? '—'}</p>
              </div>

              <div className="max-w-md">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  A professional-grade HTTP interception proxy and mocking tool designed specifically for modern engineering workflows.
                </p>
              </div>

              <div className="w-full grid grid-cols-1 gap-3 pt-4">
                <a
                  href="https://github.com/pckhib/interceptr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-muted/10 hover:bg-primary/5 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background border border-border/40 flex items-center justify-center">
                      <SiGithub className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">GitHub Repository</p>
                      <p className="text-[11px] font-bold text-muted-foreground">Contribute or report issues.</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>

                <a
                  href="https://github.com/pckhib"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-muted/10 hover:bg-primary/5 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background border border-border/40 flex items-center justify-center">
                      <Info className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Developer</p>
                      <p className="text-[11px] font-bold text-muted-foreground">Patrick Hieber</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              </div>

              <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] pt-4">
                API Simulation Made Simple.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/40 bg-muted flex justify-end gap-3 px-6 shrink-0">
          {activeTab === 'config' ? (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-75"
              >
                Cancel
              </button>
              <button
                onClick={() => updateConfig.mutate()}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                Persist Settings
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest bg-foreground text-background rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
