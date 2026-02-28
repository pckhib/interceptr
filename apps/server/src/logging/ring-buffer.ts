import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { ProxyLogEntry } from '@interceptr/shared';

const MAX_SIZE = 500;
const LOG_FILE = join(process.cwd(), 'data', 'logs.json');

export class RingBuffer {
  private entries: ProxyLogEntry[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  push(entry: ProxyLogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_SIZE) {
      this.entries.shift();
    }
    this.scheduleSave();
  }

  getAll(): ProxyLogEntry[] {
    return [...this.entries].reverse();
  }

  getRecent(count: number): ProxyLogEntry[] {
    return this.getAll().slice(0, count);
  }

  clear(): void {
    this.entries = [];
    this.scheduleSave();
  }

  get size(): number {
    return this.entries.length;
  }

  load(): void {
    try {
      if (existsSync(LOG_FILE)) {
        const raw = readFileSync(LOG_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          this.entries = data.slice(-MAX_SIZE);
        }
      }
    } catch {
      // Ignore corrupt log file
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveToDisk();
    }, 1000);
  }

  private saveToDisk(): void {
    try {
      const dir = dirname(LOG_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(LOG_FILE, JSON.stringify(this.entries));
    } catch {
      // Ignore write errors
    }
  }
}

export const logBuffer = new RingBuffer();
