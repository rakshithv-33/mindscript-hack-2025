"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const vscode = __importStar(require("vscode"));
function getConfigString(name, def = '') {
    const cfg = vscode.workspace.getConfiguration('prompts');
    const val = cfg.get(name);
    return (val ?? def).trim();
}
function dotGet(obj, path) {
    if (!path)
        return obj;
    const parts = path.split('.').filter(Boolean);
    return parts.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}
class HttpClient {
    context;
    constructor(context) {
        this.context = context;
    }
    async getBaseUrl() {
        const cfg = vscode.workspace.getConfiguration('prompts');
        const base = cfg.get('apiBaseUrl')?.trim() ?? '';
        if (!base)
            throw new Error('Set prompts.apiBaseUrl in settings.');
        return base.replace(/\/$/, '');
    }
    async getApiKey() {
        return await this.context.secrets.get('prompts.apiKey');
    }
    async setApiKey(key) {
        await this.context.secrets.store('prompts.apiKey', key);
    }
    async fetchIndex(etag) {
        const base = await this.getBaseUrl();
        const indexPath = getConfigString('indexPath', '/prompts');
        const idField = getConfigString('fieldMap.id', 'id');
        const titleField = getConfigString('fieldMap.title', 'title');
        const versionField = getConfigString('fieldMap.version', 'version');
        const updatedAtField = getConfigString('fieldMap.updatedAt', 'updatedAt');
        const indexResponsePath = getConfigString('indexResponsePath', '');
        const apiKey = await this.getApiKey();
        const headers = { 'Accept': 'application/json' };
        if (apiKey)
            headers['Authorization'] = `Bearer ${apiKey}`;
        // Always bypass ETag when cache TTL is 0 (force refresh)
        const ttl = vscode.workspace.getConfiguration('prompts').get('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
        if (etag && ttl > 0)
            headers['If-None-Match'] = etag;
        // NOTE: Replace path with your actual endpoint
        const res = await fetch(`${base}${indexPath}`, { headers });
        if (res.status === 304)
            return { notModified: true };
        if (!res.ok)
            throw new Error(`Index request failed (${res.status})`);
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : Array.isArray(dotGet(raw, indexResponsePath)) ? dotGet(raw, indexResponsePath) : [];
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
    async fetchBody(id, etag) {
        const base = await this.getBaseUrl();
        const itemTpl = getConfigString('itemPathTemplate', '/prompts/{id}');
        const bodyField = getConfigString('fieldMap.body', 'body');
        const apiKey = await this.getApiKey();
        const headers = { 'Accept': 'application/json' };
        if (apiKey)
            headers['Authorization'] = `Bearer ${apiKey}`;
        const ttl = vscode.workspace.getConfiguration('prompts').get('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
        if (etag && ttl > 0)
            headers['If-None-Match'] = etag;
        const path = itemTpl.replace('{id}', encodeURIComponent(id));
        const res = await fetch(`${base}${path}`, { headers });
        if (res.status === 304)
            return { notModified: true };
        if (!res.ok)
            throw new Error(`Body request failed (${res.status})`);
        const data = (await res.json());
        const fromMap = dotGet(data, bodyField);
        const body = typeof fromMap === 'string' ? fromMap : typeof data?.content === 'string' ? data.content : '';
        return { content: body, etag: res.headers.get('ETag') ?? undefined };
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http.js.map