import { useState, useEffect } from 'react';
import type { DelayConfig } from '@interceptr/shared';
import { Clock, Zap } from 'lucide-react';

interface DelayEditorProps {
  delay: DelayConfig;
  onChange: (delay: DelayConfig) => void;
}

export function DelayEditor({ delay, onChange }: DelayEditorProps) {
  const [ms, setMs] = useState(delay.ms);
  const [jitter, setJitter] = useState(delay.jitterMs ?? 0);

  useEffect(() => {
    setMs(delay.ms);
    setJitter(delay.jitterMs ?? 0);
  }, [delay.ms, delay.jitterMs]);

  const handleCommit = () => {
    onChange({ ms, jitterMs: jitter || undefined });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl py-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5 text-mode-delay" />
            Base Delay
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={ms}
              onChange={(e) => setMs(Number(e.target.value))}
              onBlur={handleCommit}
              className="w-20 px-2 py-1 text-xs font-mono font-bold bg-background border border-border/60 rounded-md focus:ring-1 focus:ring-mode-delay focus:border-mode-delay outline-none text-right"
            />
            <span className="text-[10px] font-bold text-muted-foreground">ms</span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={50}
          value={ms}
          onChange={(e) => setMs(Number(e.target.value))}
          onMouseUp={handleCommit}
          className="w-full accent-mode-delay h-4 bg-transparent cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
          <span>0ms</span>
          <span>5,000ms</span>
          <span>10,000ms</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 text-mode-delay/60" />
            Jitter (±)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={jitter}
              onChange={(e) => setJitter(Number(e.target.value))}
              onBlur={handleCommit}
              className="w-16 px-2 py-1 text-xs font-mono font-bold bg-background border border-border/60 rounded-md focus:ring-1 focus:ring-mode-delay/40 focus:border-mode-delay/40 outline-none text-right"
            />
            <span className="text-[10px] font-bold text-muted-foreground">ms</span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={10}
          value={jitter}
          onChange={(e) => setJitter(Number(e.target.value))}
          onMouseUp={handleCommit}
          className="w-full accent-mode-delay/60 h-4 bg-transparent cursor-pointer"
        />
        <div className="flex justify-between text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
          <span>0ms</span>
          <span>1,000ms</span>
          <span>2,000ms</span>
        </div>
      </div>
    </div>
  );
}
