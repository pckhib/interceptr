import { useState } from 'react';
import { EndpointList } from '@/components/endpoints/EndpointList';
import { GlobalHeadersPanel, GlobalHeadersTrigger } from '@/components/endpoints/GlobalHeadersPanel';
import { PresetBar } from '@/components/presets/PresetBar';
import { ActivityFeed } from '@/components/logs/ActivityFeed';
import { Layers, Activity as ActivityIcon } from 'lucide-react';

export function EndpointsPage() {
  const [globalHeadersOpen, setGlobalHeadersOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left Panel: Endpoints */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border/60 bg-background">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border/60 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                <Layers className="w-4 h-4" />
             </div>
             <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Endpoints Registry</h2>
          </div>
          <div className="flex items-center gap-2">
            <GlobalHeadersTrigger open={globalHeadersOpen} onToggle={() => setGlobalHeadersOpen((v) => !v)} />
            <PresetBar />
          </div>
        </div>

        <GlobalHeadersPanel open={globalHeadersOpen} />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <EndpointList />
          </div>
        </div>
      </div>

      {/* Right Panel: Activity Feed */}
      <div className="w-[400px] lg:w-[450px] xl:w-[500px] hidden lg:flex flex-col bg-muted/5 shrink-0">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border/60 bg-muted/30 shrink-0">
           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <ActivityIcon className="w-4 h-4" />
           </div>
           <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Traffic Monitor</h2>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ActivityFeed isCompact />
        </div>
      </div>
    </div>
  );
}
