import { cn } from '@/lib/utils';
import type { ProxyMode } from '@interceptr/shared';
import { ArrowRight, Clock, FileCode } from 'lucide-react';

const modes: { value: ProxyMode; label: string; icon: typeof ArrowRight; activeClass: string }[] = [
  { 
    value: 'passthrough', 
    label: 'Pass', 
    icon: ArrowRight, 
    activeClass: 'bg-mode-passthrough/20 text-mode-passthrough border-mode-passthrough/30 shadow-[0_0_8px_-2px_rgba(var(--mode-passthrough),0.3)]'
  },
  { 
    value: 'delay', 
    label: 'Delay', 
    icon: Clock, 
    activeClass: 'bg-mode-delay/20 text-mode-delay border-mode-delay/30 shadow-[0_0_8px_-2px_rgba(var(--mode-delay),0.3)]'
  },
  { 
    value: 'mock', 
    label: 'Mock', 
    icon: FileCode, 
    activeClass: 'bg-mode-mock/20 text-mode-mock border-mode-mock/30 shadow-[0_0_8px_-2px_rgba(var(--mode-mock),0.3)]'
  },
];

interface ModeToggleProps {
  value: ProxyMode;
  onChange: (mode: ProxyMode) => void;
}

function isButtonActive(buttonMode: ProxyMode, currentMode: ProxyMode): boolean {
  if (buttonMode === 'passthrough') return currentMode === 'passthrough';
  if (buttonMode === 'delay') return currentMode === 'delay' || currentMode === 'mock-delay';
  if (buttonMode === 'mock') return currentMode === 'mock' || currentMode === 'mock-delay';
  return false;
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1 shadow-inner backdrop-blur-sm">
      {modes.map(({ value: mode, label, icon: Icon, activeClass }) => {
        const active = isButtonActive(mode, value);
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all duration-200 border border-transparent',
              active
                ? cn('font-bold', activeClass)
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5',
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "animate-in zoom-in-75 duration-300" : "opacity-50")} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
