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
exports.tryAttachFileToChat = tryAttachFileToChat;
exports.revealFileForManualAttach = revealFileForManualAttach;
const vscode = __importStar(require("vscode"));
async function tryExec(commandId, ...args) {
    try {
        await vscode.commands.executeCommand(commandId, ...args);
        return true;
    }
    catch {
        return false;
    }
}
async function tryAttachFileToChat(uri) {
    // Try to focus chat first so attach commands can target it
    await focusChatIfPossible();
    const all = await vscode.commands.getCommands(true);
    const candidates = [
        'workbench.action.chat.attachFiles',
        'vscode.chat.attachFiles',
        'github.copilot.chat.attachFiles',
        'cursor.chat.attachFiles',
        'cursor.attachFilesToChat',
        // Windsurf and other forks may expose their own attach command ids
        'windsurf.chat.attachFiles',
        'windsurf.attachFilesToChat',
    ].filter((c) => all.includes(c));
    for (const cmd of candidates) {
        // Some commands may accept an array of URIs
        if (await tryExec(cmd, [uri]))
            return true;
        // Or a single URI
        if (await tryExec(cmd, uri))
            return true;
    }
    return false;
}
async function revealFileForManualAttach(uri) {
    try {
        await vscode.commands.executeCommand('revealInExplorer', uri);
    }
    catch {
        // ignore
    }
    try {
        await vscode.env.clipboard.writeText(uri.fsPath);
        vscode.window.showInformationMessage('Prompt file ready. Drag it into the chat to attach (path copied to clipboard).');
    }
    catch {
        // ignore
    }
}
async function focusChatIfPossible() {
    const known = [
        'workbench.action.chat.open',
        'cursor.openChat',
        'vscode.chat.focus',
        'workbench.action.openChat',
        // Windsurf focus/open chat if available
        'windsurf.openChat',
        'windsurf.chat.open',
    ];
    const all = await vscode.commands.getCommands(true);
    for (const cmd of known) {
        if (all.includes(cmd)) {
            try {
                await vscode.commands.executeCommand(cmd);
                return true;
            }
            catch {
                // try next
            }
        }
    }
    return false;
}
//# sourceMappingURL=chatAttach.js.map