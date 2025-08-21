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
exports.insertTextIntoChatOrEditor = insertTextIntoChatOrEditor;
const vscode = __importStar(require("vscode"));
async function tryExecuteCommand(commandId) {
    try {
        await vscode.commands.executeCommand(commandId);
        return true;
    }
    catch {
        return false;
    }
}
async function focusChatIfPossible() {
    // Try known chat focus commands (varies across VS Code versions and Cursor)
    const known = [
        'workbench.action.chat.open',
        'cursor.openChat',
        'vscode.chat.focus',
        'workbench.action.openChat',
    ];
    const all = await vscode.commands.getCommands(true);
    for (const cmd of known) {
        if (all.includes(cmd)) {
            const ok = await tryExecuteCommand(cmd);
            if (ok)
                return true;
        }
    }
    return false;
}
async function insertTextIntoChatOrEditor(text) {
    const focused = await focusChatIfPossible();
    // Try to paste into current focus
    await vscode.env.clipboard.writeText(text);
    const pasted = await tryExecuteCommand('editor.action.clipboardPasteAction');
    if (pasted)
        return;
    if (focused) {
        // If chat is focused but paste action isn't available, at least notify
        vscode.window.showInformationMessage('Prompt copied to clipboard. Paste it into chat.');
        return;
    }
    // Fallback: insert into active editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        await editor.edit((builder) => {
            builder.insert(editor.selection.active, text);
        });
        return;
    }
    // Final fallback: clipboard only
    vscode.window.showInformationMessage('Prompt copied to clipboard.');
}
//# sourceMappingURL=insert.js.map