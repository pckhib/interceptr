import { useState, useRef, useEffect } from 'react';
import { useProjects, useActiveProject, useCreateProject, useSwitchProject, useDeleteProject, useRenameProject } from '@/hooks/use-projects';
import { FolderOpen, Plus, ChevronDown, Trash2, LayoutGrid, Settings2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectSwitcher() {
  const { data: projects } = useProjects();
  const { data: activeProject } = useActiveProject();
  const createProject = useCreateProject();
  const switchProject = useSwitchProject();
  const deleteProject = useDeleteProject();
  const renameProject = useRenameProject();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setCreating(false);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    renameProject.mutate({ id, name: editName.trim() }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete project "${name}"?`)) deleteProject.mutate(id);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject.mutate(newName.trim(), {
      onSuccess: () => {
        setNewName('');
        setCreating(false);
      },
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all border shrink-0",
          open
            ? "bg-accent border-primary/20"
            : "bg-muted/30 border-border/40 hover:bg-accent/40 hover:border-border/60"
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-primary opacity-70" />
        <span className="font-bold truncate max-w-[120px]">
          {activeProject?.name ?? 'Select Project'}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border shadow-2xl rounded-xl py-1.5 min-w-[260px] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-1 mb-1 border-b border-border/40">
             <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Switch Project</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-1.5">
            {projects?.map((p) => (
              <div key={p.id} className="space-y-1">
                <div
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all',
                    p.id === activeProject?.id
                      ? 'bg-primary/10 text-primary font-bold shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer',
                  )}
                >
                  <button
                    className="flex-1 text-left truncate flex items-center gap-2"
                    onClick={() => {
                      if (p.id !== activeProject?.id) {
                        switchProject.mutate(p.id);
                        setOpen(false);
                      }
                    }}
                  >
                    <FolderOpen className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    {p.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editingId === p.id ? setEditingId(null) : openEdit(p.id, p.name);
                    }}
                    className={cn(
                      'p-1 rounded-md transition-all opacity-0 group-hover:opacity-100',
                      editingId === p.id
                        ? 'opacity-100 text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10',
                    )}
                    title="Edit project"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                </div>

                {editingId === p.id && (
                  <div className="mx-2 p-3 rounded-xl bg-muted/40 border border-border/40 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-inner">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Name</label>
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(p.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                        />
                        <button
                          onClick={() => handleRename(p.id)}
                          disabled={!editName.trim()}
                          className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-40"
                          aria-label="Confirm rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Project ID</span>
                      <p className="px-1 text-[10px] font-mono text-muted-foreground/60 truncate">{p.id}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => { setEditingId(null); handleDelete(p.id, p.name); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 rounded-lg transition-all border border-transparent hover:border-destructive/20"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
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

          <div className="border-t border-border mt-1.5 pt-1.5 px-1.5">
            {creating ? (
              <div className="px-1 py-1 flex gap-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="Name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') setCreating(false);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-primary hover:bg-primary/5 rounded-lg transition-all font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                New Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
