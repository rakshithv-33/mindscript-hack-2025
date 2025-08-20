import * as vscode from 'vscode';
import { HttpClient } from './http';
import { PromptCache } from './storage';
import { PromptBody, PromptIndexItem } from './types';

export class PromptService {
  constructor(
    private readonly http: HttpClient,
    private readonly cache: PromptCache,
    private readonly context: vscode.ExtensionContext
  ) {}

  private get ttlMs(): number {
    const cfg = vscode.workspace.getConfiguration('prompts');
    return cfg.get<number>('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
  }

  async ensureIndex(): Promise<PromptIndexItem[]> {
    const cached = this.cache.getIndex();
    if (cached.items.length && this.cache.isIndexFresh()) return cached.items;
    try {
      const result = await this.http.fetchIndex(this.cache.getIndexEtag());
      if (result.notModified) return cached.items;
      if (result.items) this.cache.saveIndex(result.items, result.etag);
      return this.cache.getIndex().items;
    } catch (err) {
      // If offline or error, fall back to cached
      return cached.items ?? [];
    }
  }

  async listPrompts(): Promise<PromptIndexItem[]> {
    return this.ensureIndex();
  }

  async getPromptBody(id: string): Promise<string> {
    const bodyKey = id; // with current API, versioning optional. Can be extended to `${id}:${version}`.
    const cached = this.cache.getBody(bodyKey);
    if (cached && this.cache.isBodyFresh(cached)) {
      this.cache.markUsed(bodyKey);
      return cached.body;
    }

    try {
      const res = await this.http.fetchBody(id, cached?.etag);
      if (res.notModified && cached) {
        this.cache.markUsed(bodyKey);
        return cached.body;
      }
      if (res.content) {
        this.cache.saveBody(bodyKey, { body: res.content, etag: res.etag });
        return res.content;
      }
      // if no content returned, fallback to cached
      return cached?.body ?? '';
    } catch (err) {
      return cached?.body ?? '';
    }
  }

  async setApiKeyInteractive() {
    const key = await vscode.window.showInputBox({
      placeHolder: 'Enter API key (will be stored in VS Code Secret Storage)',
      ignoreFocusOut: true,
      password: true,
    });
    if (!key) return;
    await this.http.setApiKey(key);
    vscode.window.showInformationMessage('Prompts API key saved.');
  }
}


