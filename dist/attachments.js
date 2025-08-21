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
exports.createPromptAttachment = createPromptAttachment;
exports.openAttachment = openAttachment;
const vscode = __importStar(require("vscode"));
function slugify(input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'prompt';
}
async function getAttachmentDir(context) {
    const wf = vscode.workspace.workspaceFolders?.[0];
    if (wf) {
        const dir = vscode.Uri.joinPath(wf.uri, '.vscode', 'prompts');
        await vscode.workspace.fs.createDirectory(dir);
        return dir;
    }
    const dir = vscode.Uri.joinPath(context.globalStorageUri, 'prompts');
    await vscode.workspace.fs.createDirectory(dir);
    return dir;
}
async function createPromptAttachment(context, id, title, body) {
    const dir = await getAttachmentDir(context);
    const base = slugify(title || id);
    const filename = `${base}.md`;
    const uri = vscode.Uri.joinPath(dir, filename);
    const includeHeader = vscode.workspace.getConfiguration('prompts').get('attachIncludeHeader') ?? false;
    const header = includeHeader ? `# ${title || id}\n\n<!-- prompt-id: ${id} -->\n\n` : '';
    const content = `${header}${body}\n`;
    const data = Buffer.from(content, 'utf8');
    await vscode.workspace.fs.writeFile(uri, data);
    return uri;
}
async function openAttachment(uri) {
    await vscode.window.showTextDocument(uri, { preview: false });
}
//# sourceMappingURL=attachments.js.map