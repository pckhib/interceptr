import { useState, useRef, useEffect } from 'react';
import { useProjects, useActiveProject, useCreateProject, useSwitchProject, useDeleteProject } from '@/hooks/use-projects';
import { FolderOpen, Plus, ChevronDown, Trash2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectSwitcher() {
  const { data: projects } = useProjects();
  const { data: activeProject } = useActiveProject();
  const createProject = useCreateProject();
  const switchProject = useSwitchProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
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
        <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border shadow-2xl rounded-xl py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-1 mb-1 border-b border-border/40">
             <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">Switch Project</span>
          </div>
          <div className="max-h-60 overflow-y-auto px-1.5">
            {projects?.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all',
                  p.id === activeProject?.id 
                    ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <button
                  className="flex-1 text-left truncate flex items-center gap-2"
                  onClick={() => {
                    switchProject.mutate(p.id);
                    setOpen(false);
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5 opacity-40" />
                  {p.name}
                </button>
                {p.id !== activeProject?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject.mutate(p.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
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
