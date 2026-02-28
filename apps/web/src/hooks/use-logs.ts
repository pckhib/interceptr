import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProxyLogEntry } from '@interceptr/shared';
import { api } from '@/lib/api';

export function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: () => api.logs.get(),
  });
}

export function useLogStream() {
  const [entries, setEntries] = useState<ProxyLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  // Fetch historical logs on mount
  useEffect(() => {
    api.logs.get(500).then(({ entries: historical }) => {
      setEntries((live) => {
        // Merge: live entries on top, deduplicate by id
        const seen = new Set(live.map((e) => e.id));
        const merged = [...live];
        for (const entry of historical) {
          if (!seen.has(entry.id)) {
            merged.push(entry);
          }
        }
        return merged.slice(0, 500);
      });
      setLoaded(true);
    });
  }, []);

  // SSE for real-time entries
  useEffect(() => {
    const es = new EventSource('/api/logs/stream');
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('log', (event) => {
      const entry: ProxyLogEntry = JSON.parse(event.data);
      setEntries((prev) => [entry, ...prev].slice(0, 500));
    });

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    api.logs.clear().then(() => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });
  }, [queryClient]);

  return { entries, connected, clear, loaded };
}
