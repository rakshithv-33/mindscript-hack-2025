import * as vscode from 'vscode';
import { FetchBodyResult, FetchIndexResult } from './types';

function getConfigString(name: string, def: string = ''): string {
  const cfg = vscode.workspace.getConfiguration('prompts');
  const val = cfg.get<string>(name);
  return (val ?? def).trim();
}

function dotGet(obj: any, path: string | undefined): any {
  if (!path) return obj;
  const parts = path.split('.').filter(Boolean);
  return parts.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

export class HttpClient {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private async getBaseUrl(): Promise<string> {
    const cfg = vscode.workspace.getConfiguration('prompts');
    const base = cfg.get<string>('apiBaseUrl')?.trim() ?? '';
    if (!base) throw new Error('Set prompts.apiBaseUrl in settings.');
    return base.replace(/\/$/, '');
  }

  private async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get('prompts.apiKey');
  }

  async setApiKey(key: string) {
    await this.context.secrets.store('prompts.apiKey', key);
  }

  async fetchIndex(etag?: string): Promise<FetchIndexResult> {
    const base = await this.getBaseUrl();
    const indexPath = getConfigString('indexPath', '/prompts');
    const idField = getConfigString('fieldMap.id', 'id');
    const titleField = getConfigString('fieldMap.title', 'title');
    const versionField = getConfigString('fieldMap.version', 'version');
    const updatedAtField = getConfigString('fieldMap.updatedAt', 'updatedAt');
    const indexResponsePath = getConfigString('indexResponsePath', '');
    const apiKey = await this.getApiKey();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    // Always bypass ETag when cache TTL is 0 (force refresh)
    const ttl = vscode.workspace.getConfiguration('prompts').get<number>('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
    if (etag && ttl > 0) headers['If-None-Match'] = etag;
    // NOTE: Replace path with your actual endpoint
    const res = await fetch(`${base}${indexPath}`, { headers });
    if (res.status === 304) return { notModified: true };
    if (!res.ok) throw new Error(`Index request failed (${res.status})`);
    const raw = await res.json();
    const list: any[] = Array.isArray(raw) ? raw : Array.isArray(dotGet(raw, indexResponsePath)) ? dotGet(raw, indexResponsePath) : [];
    return {
      items: list.map((p) => ({
        id: String(p?.[idField]),
        title: String(p?.[titleField] ?? p?.name ?? p?.[idField]),
        version: p?.[versionField],
        updatedAt: p?.[updatedAtField],
      })).filter((x) => x.id),
      etag: res.headers.get('ETag') ?? undefined,
    };
  }

  async fetchBody(id: string, etag?: string): Promise<FetchBodyResult> {
    const base = await this.getBaseUrl();
    const itemTpl = getConfigString('itemPathTemplate', '/prompts/{id}');
    const bodyField = getConfigString('fieldMap.body', 'body');
    const apiKey = await this.getApiKey();
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const ttl = vscode.workspace.getConfiguration('prompts').get<number>('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
    if (etag && ttl > 0) headers['If-None-Match'] = etag;
    const path = itemTpl.replace('{id}', encodeURIComponent(id));
    const res = await fetch(`${base}${path}`, { headers });
    if (res.status === 304) return { notModified: true };
    if (!res.ok) throw new Error(`Body request failed (${res.status})`);
    const data = (await res.json()) as any;
    const fromMap = dotGet(data, bodyField);
    const body = typeof fromMap === 'string' ? fromMap : typeof data?.content === 'string' ? data.content : '';
    return { content: body, etag: res.headers.get('ETag') ?? undefined };
  }
}


