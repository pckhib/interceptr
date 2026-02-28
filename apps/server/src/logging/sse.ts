import type { ProxyLogEntry } from '@interceptr/shared';

type SSEClient = (data: string) => void;

class SSEEmitter {
  private clients = new Set<SSEClient>();

  addClient(send: SSEClient): () => void {
    this.clients.add(send);
    return () => this.clients.delete(send);
  }

  emit(entry: ProxyLogEntry): void {
    const data = JSON.stringify(entry);
    for (const client of this.clients) {
      try {
        client(data);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const sseEmitter = new SSEEmitter();
