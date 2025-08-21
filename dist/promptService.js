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
exports.PromptService = void 0;
const vscode = __importStar(require("vscode"));
class PromptService {
    http;
    cache;
    context;
    constructor(http, cache, context) {
        this.http = http;
        this.cache = cache;
        this.context = context;
    }
    get ttlMs() {
        const cfg = vscode.workspace.getConfiguration('prompts');
        return cfg.get('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
    }
    async ensureIndex() {
        const cached = this.cache.getIndex();
        if (cached.items.length && this.cache.isIndexFresh())
            return cached.items;
        try {
            const result = await this.http.fetchIndex(this.cache.getIndexEtag());
            if (result.notModified)
                return cached.items;
            if (result.items)
                this.cache.saveIndex(result.items, result.etag);
            return this.cache.getIndex().items;
        }
        catch (err) {
            // If offline or error, fall back to cached
            return cached.items ?? [];
        }
    }
    async listPrompts() {
        return this.ensureIndex();
    }
    async getPromptBody(id) {
        // Allow override for default prompt
        const cfg = vscode.workspace.getConfiguration('prompts');
        const defaultId = cfg.get('defaultPromptId')?.trim();
        const override = cfg.get('defaultPromptOverrideBody')?.trim();
        if (override && defaultId && id === defaultId) {
            return override;
        }
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
        }
        catch (err) {
            return cached?.body ?? '';
        }
    }
    async setApiKeyInteractive() {
        const key = await vscode.window.showInputBox({
            placeHolder: 'Enter API key (will be stored in VS Code Secret Storage)',
            ignoreFocusOut: true,
            password: true,
        });
        if (!key)
            return;
        await this.http.setApiKey(key);
        vscode.window.showInformationMessage('Prompts API key saved.');
    }
}
exports.PromptService = PromptService;
//# sourceMappingURL=promptService.js.map