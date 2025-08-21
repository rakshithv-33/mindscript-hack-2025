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
exports.PromptCache = void 0;
const vscode = __importStar(require("vscode"));
const GLOBAL_STATE_KEY = 'promptCache.memento';
const STORAGE_FILENAME = 'prompt-cache.json';
class PromptCache {
    inMemory;
    context;
    ttlMs;
    maxBodies;
    constructor(context, ttlMs, maxBodies) {
        this.context = context;
        this.ttlMs = ttlMs;
        this.maxBodies = maxBodies;
        const persisted = context.globalState.get(GLOBAL_STATE_KEY);
        this.inMemory = persisted ?? { index: { items: [] }, bodies: {} };
    }
    getIndex() {
        return this.inMemory.index ?? { items: [] };
    }
    getIndexEtag() {
        return this.inMemory.index?.etag;
    }
    isIndexFresh() {
        const last = this.inMemory.index?.lastSyncAt ? Date.parse(this.inMemory.index.lastSyncAt) : 0;
        if (!last)
            return false;
        return Date.now() - last < this.ttlMs;
    }
    saveIndex(items, etag) {
        this.inMemory.index = { items, etag, lastSyncAt: new Date().toISOString() };
        this.persist();
    }
    getBody(id) {
        return this.inMemory.bodies[id];
    }
    isBodyFresh(body) {
        const t = body.cachedAt ? Date.parse(body.cachedAt) : 0;
        if (!t)
            return false;
        return Date.now() - t < this.ttlMs;
    }
    saveBody(id, partial) {
        const existing = this.inMemory.bodies[id];
        const updated = {
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
    markUsed(id) {
        const b = this.inMemory.bodies[id];
        if (b) {
            b.lastUsedAt = new Date().toISOString();
            this.persist();
        }
    }
    evictIfNeeded() {
        const ids = Object.keys(this.inMemory.bodies);
        if (ids.length <= this.maxBodies)
            return;
        const sorted = ids
            .map((id) => ({ id, lastUsed: this.inMemory.bodies[id].lastUsedAt ? Date.parse(this.inMemory.bodies[id].lastUsedAt) : 0 }))
            .sort((a, b) => a.lastUsed - b.lastUsed);
        const removeCount = ids.length - this.maxBodies;
        for (let i = 0; i < removeCount; i++) {
            delete this.inMemory.bodies[sorted[i].id];
        }
    }
    async persist() {
        // Persist to memento
        await this.context.globalState.update(GLOBAL_STATE_KEY, this.inMemory);
        // Also persist to file for durability
        const uri = vscode.Uri.joinPath(this.context.globalStorageUri, STORAGE_FILENAME);
        const data = Buffer.from(JSON.stringify(this.inMemory, null, 2), 'utf8');
        try {
            await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
            await vscode.workspace.fs.writeFile(uri, data);
        }
        catch (err) {
            // best-effort
        }
    }
    async clearAll() {
        this.inMemory = { index: { items: [] }, bodies: {} };
        await this.persist();
    }
}
exports.PromptCache = PromptCache;
//# sourceMappingURL=storage.js.map