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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const http_1 = require("./http");
const storage_1 = require("./storage");
const promptService_1 = require("./promptService");
const insert_1 = require("./insert");
const attachments_1 = require("./attachments");
const chatAttach_1 = require("./chatAttach");
async function activate(context) {
    const cfg = vscode.workspace.getConfiguration('prompts');
    const ttlMs = cfg.get('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
    const maxBodies = cfg.get('maxBodies') ?? 200;
    const http = new http_1.HttpClient(context);
    const cache = new storage_1.PromptCache(context, ttlMs, maxBodies);
    const service = new promptService_1.PromptService(http, cache, context);
    const output = vscode.window.createOutputChannel('System Prompts');
    async function withProgress(title, task) {
        try {
            const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, task);
            return result;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`${title} failed: ${msg}`);
            output.appendLine(`[error] ${title}: ${msg}`);
            return undefined;
        }
    }
    context.subscriptions.push(vscode.commands.registerCommand('prompts.setApiKey', async () => {
        await service.setApiKeyInteractive();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('prompts.refreshCache', async () => {
        await withProgress('Refreshing prompts', async () => {
            await service.listPrompts();
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('prompts.clearCache', async () => {
        const answer = await vscode.window.showWarningMessage('Clear cached prompts? This will force a full reload from the API.', { modal: true }, 'Clear');
        if (answer !== 'Clear')
            return;
        await cache.clearAll();
        vscode.window.showInformationMessage('Prompts cache cleared. Run "Prompts: Refresh Prompts Cache" next.');
    }));
    // Status command used by status bar item
    context.subscriptions.push(vscode.commands.registerCommand('prompts.attachFromStatus', async () => {
        await vscode.commands.executeCommand('prompts.attachDefault');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('prompts.insertDefault', async () => {
        const defaultId = vscode.workspace.getConfiguration('prompts').get('defaultPromptId')?.trim();
        if (!defaultId) {
            vscode.window.showErrorMessage('Set prompts.defaultPromptId in settings first.');
            return;
        }
        const text = await withProgress('Fetching prompt', async () => service.getPromptBody(defaultId));
        if (typeof text === 'string' && text.length) {
            await (0, insert_1.insertTextIntoChatOrEditor)(text);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('prompts.choose', async () => {
        const items = await withProgress('Loading prompts', async () => service.listPrompts());
        if (!items || !items.length) {
            vscode.window.showWarningMessage('No prompts found. Configure prompts.apiBaseUrl and try again.');
            return;
        }
        const selected = await vscode.window.showQuickPick(items.map((p) => ({ label: p.title || p.id, description: p.id })), { placeHolder: 'Select a prompt to insert' });
        if (!selected)
            return;
        const id = selected.description || selected.label;
        const text = await withProgress('Fetching prompt', async () => service.getPromptBody(id));
        if (typeof text === 'string' && text.length) {
            await (0, insert_1.insertTextIntoChatOrEditor)(text);
        }
    }));
    // Attachment variants
    context.subscriptions.push(vscode.commands.registerCommand('prompts.attachDefault', async () => {
        const defaultId = vscode.workspace.getConfiguration('prompts').get('defaultPromptId')?.trim();
        if (!defaultId) {
            vscode.window.showErrorMessage('Set prompts.defaultPromptId in settings first.');
            return;
        }
        const [items, body] = await Promise.all([
            withProgress('Loading prompts', async () => service.listPrompts()),
            withProgress('Fetching prompt', async () => service.getPromptBody(defaultId)),
        ]);
        const title = items?.find((i) => i.id === defaultId)?.title || defaultId;
        if (!body)
            return;
        const uri = await (0, attachments_1.createPromptAttachment)(context, defaultId, title, body);
        await (0, attachments_1.openAttachment)(uri);
        const attached = await (0, chatAttach_1.tryAttachFileToChat)(uri);
        if (!attached)
            await (0, chatAttach_1.revealFileForManualAttach)(uri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('prompts.chooseAttach', async () => {
        const items = await withProgress('Loading prompts', async () => service.listPrompts());
        if (!items || !items.length) {
            vscode.window.showWarningMessage('No prompts found. Configure prompts.apiBaseUrl and try again.');
            return;
        }
        const selected = await vscode.window.showQuickPick(items.map((p) => ({ label: p.title || p.id, description: p.id })), { placeHolder: 'Select a prompt to attach' });
        if (!selected)
            return;
        const id = selected.description || selected.label;
        const body = await withProgress('Fetching prompt', async () => service.getPromptBody(id));
        if (!body)
            return;
        const title = items.find((i) => i.id === id)?.title || id;
        const uri = await (0, attachments_1.createPromptAttachment)(context, id, title, body);
        await (0, attachments_1.openAttachment)(uri);
        const attached = await (0, chatAttach_1.tryAttachFileToChat)(uri);
        if (!attached)
            await (0, chatAttach_1.revealFileForManualAttach)(uri);
    }));
    // Optional: try to warm index on startup (best-effort)
    try {
        await service.listPrompts();
    }
    catch (err) {
        // ignore
    }
    // Status bar button to attach default prompt quickly
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusItem.text = '$(notebook-send) Attach Prompt';
    statusItem.tooltip = 'Attach default system prompt as a file';
    statusItem.command = 'prompts.attachFromStatus';
    statusItem.show();
    context.subscriptions.push(statusItem);
    const statusChoose = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    statusChoose.text = '$(list-selection) Choose Prompt';
    statusChoose.tooltip = 'Choose and attach a system prompt as a file';
    statusChoose.command = 'prompts.chooseAttach';
    statusChoose.show();
    context.subscriptions.push(statusChoose);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map