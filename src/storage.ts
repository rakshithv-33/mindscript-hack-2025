import * as vscode from 'vscode';
import { CacheSchema, PromptBody, PromptIndexItem, PromptsIndex } from './types';

const GLOBAL_STATE_KEY = 'promptCache.memento';
const STORAGE_FILENAME = 'prompt-cache.json';

export class PromptCache {
  private inMemory: CacheSchema;
  private readonly context: vscode.ExtensionContext;
  private readonly ttlMs: number;
  private readonly maxBodies: number;

  constructor(context: vscode.ExtensionContext, ttlMs: number, maxBodies: number) {
    this.context = context;
    this.ttlMs = ttlMs;
    this.maxBodies = maxBodies;
    const persisted = context.globalState.get<CacheSchema>(GLOBAL_STATE_KEY);
    this.inMemory = persisted ?? { index: { items: [] }, bodies: {} };
  }

  getIndex(): PromptsIndex {
    return this.inMemory.index ?? { items: [] };
  }

  getIndexEtag(): string | undefined {
    return this.inMemory.index?.etag;
  }

  isIndexFresh(): boolean {
    const last = this.inMemory.index?.lastSyncAt ? Date.parse(this.inMemory.index.lastSyncAt) : 0;
    if (!last) return false;
    return Date.now() - last < this.ttlMs;
  }

  saveIndex(items: PromptIndexItem[], etag?: string) {
    this.inMemory.index = { items, etag, lastSyncAt: new Date().toISOString() };
    this.persist();
  }

  getBody(id: string): PromptBody | undefined {
    return this.inMemory.bodies[id];
  }

  isBodyFresh(body: PromptBody): boolean {
    const t = body.cachedAt ? Date.parse(body.cachedAt) : 0;
    if (!t) return false;
    return Date.now() - t < this.ttlMs;
  }

  saveBody(id: string, partial: Partial<PromptBody> & { body: string }) {
    const existing = this.inMemory.bodies[id];
    const updated: PromptBody = {
      id,
      body: partial.body,
      version: partial.version ?? existing?.version,
      updatedAt: partial.updatedAt ?? existing?.updatedAt,
      etag: partial.etag ?? existing?.etag,
      lastUsedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
    };
    this.inMemory.bodies[id] = updated;
    this.evictIfNeeded();
    this.persist();
  }

  markUsed(id: string) {
    const b = this.inMemory.bodies[id];
    if (b) {
      b.lastUsedAt = new Date().toISOString();
      this.persist();
    }
  }

  private evictIfNeeded() {
    const ids = Object.keys(this.inMemory.bodies);
    if (ids.length <= this.maxBodies) return;
    const sorted = ids
      .map((id) => ({ id, lastUsed: this.inMemory.bodies[id].lastUsedAt ? Date.parse(this.inMemory.bodies[id].lastUsedAt!) : 0 }))
      .sort((a, b) => a.lastUsed - b.lastUsed);
    const removeCount = ids.length - this.maxBodies;
    for (let i = 0; i < removeCount; i++) {
      delete this.inMemory.bodies[sorted[i].id];
    }
  }

  private async persist() {
    // Persist to memento
    await this.context.globalState.update(GLOBAL_STATE_KEY, this.inMemory);
    // Also persist to file for durability
    const uri = vscode.Uri.joinPath(this.context.globalStorageUri, STORAGE_FILENAME);
    const data = Buffer.from(JSON.stringify(this.inMemory, null, 2), 'utf8');
    try {
      await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
      await vscode.workspace.fs.writeFile(uri, data);
    } catch (err) {
      // best-effort
    }
  }

  async clearAll() {
    this.inMemory = { index: { items: [] }, bodies: {} };
    await this.persist();
  }
}


