import { useState } from 'react';
import { useProxyStatus, useStartProxy, useStopProxy } from '@/hooks/use-proxy';
import { Power, Settings, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectSwitcher } from './ProjectSwitcher';
import { SpecSelector } from './SpecSelector';
import { useTheme } from './use-theme';
import { SettingsModal } from './SettingsModal';
import logoFull from '@/assets/logo-full.png';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { data: status } = useProxyStatus();
  const startProxy = useStartProxy();
  const stopProxy = useStopProxy();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const running = status?.running ?? false;
  const isPending = startProxy.isPending || stopProxy.isPending;

  return (
    <>
      <header className="h-14 border-b-2 border-border/60 bg-card header-gradient flex items-center justify-between px-4 shrink-0 z-50 relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5" />
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center group cursor-pointer h-8">
            <img 
              src={logoFull} 
              alt="Interceptr" 
              className="h-7 w-auto object-contain transition-transform duration-75 group-hover:scale-105" 
            />
          </div>

          <div className="h-6 w-px bg-border/40 mx-1 hidden sm:block" />
          
          <ProjectSwitcher />
          <SpecSelector />
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300",
            running 
              ? "bg-success/10 border-success/30 text-success shadow-[0_0_10px_-2px_rgba(34,197,94,0.3)]" 
              : "bg-muted border-border text-muted-foreground/60"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              running ? "bg-success animate-pulse" : "bg-muted-foreground/20"
            )} />
            <span>{running ? `:${status?.port}` : 'Offline'}</span>
          </div>

          <button
            onClick={() => (running ? stopProxy.mutate() : startProxy.mutate())}
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border',
              running
                ? 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground'
                : 'bg-primary border-primary/20 text-primary-foreground hover:bg-primary/90',
              isPending && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{running ? 'Stop' : 'Start'}</span>
          </button>

          <div className="h-6 w-px bg-border/40 mx-1" />

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
