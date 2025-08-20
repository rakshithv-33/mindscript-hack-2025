import * as vscode from 'vscode';
import { HttpClient } from './http';
import { PromptCache } from './storage';
import { PromptService } from './promptService';
import { insertTextIntoChatOrEditor } from './insert';
import { createPromptAttachment, openAttachment } from './attachments';
import { revealFileForManualAttach, tryAttachFileToChat } from './chatAttach';

export async function activate(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('prompts');
  const ttlMs = cfg.get<number>('cacheTtlMs') ?? 24 * 60 * 60 * 1000;
  const maxBodies = cfg.get<number>('maxBodies') ?? 200;

  const http = new HttpClient(context);
  const cache = new PromptCache(context, ttlMs, maxBodies);
  const service = new PromptService(http, cache, context);

  const output = vscode.window.createOutputChannel('System Prompts');

  async function withProgress<T>(title: string, task: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, task);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`${title} failed: ${msg}`);
      output.appendLine(`[error] ${title}: ${msg}`);
      return undefined;
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.setApiKey', async () => {
      await service.setApiKeyInteractive();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.refreshCache', async () => {
      await withProgress('Refreshing prompts', async () => {
        await service.listPrompts();
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.clearCache', async () => {
      const answer = await vscode.window.showWarningMessage(
        'Clear cached prompts? This will force a full reload from the API.',
        { modal: true },
        'Clear'
      );
      if (answer !== 'Clear') return;
      await cache.clearAll();
      vscode.window.showInformationMessage('Prompts cache cleared. Run "Prompts: Refresh Prompts Cache" next.');
    })
  );

  // Status command used by status bar item
  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.attachFromStatus', async () => {
      await vscode.commands.executeCommand('prompts.attachDefault');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.insertDefault', async () => {
      const defaultId = vscode.workspace.getConfiguration('prompts').get<string>('defaultPromptId')?.trim();
      if (!defaultId) {
        vscode.window.showErrorMessage('Set prompts.defaultPromptId in settings first.');
        return;
      }
      const text = await withProgress('Fetching prompt', async () => service.getPromptBody(defaultId));
      if (typeof text === 'string' && text.length) {
        await insertTextIntoChatOrEditor(text);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.choose', async () => {
      const items = await withProgress('Loading prompts', async () => service.listPrompts());
      if (!items || !items.length) {
        vscode.window.showWarningMessage('No prompts found. Configure prompts.apiBaseUrl and try again.');
        return;
      }
      const selected = await vscode.window.showQuickPick(
        items.map((p) => ({ label: p.title || p.id, description: p.id })),
        { placeHolder: 'Select a prompt to insert' }
      );
      if (!selected) return;
      const id = selected.description || selected.label;
      const text = await withProgress('Fetching prompt', async () => service.getPromptBody(id));
      if (typeof text === 'string' && text.length) {
        await insertTextIntoChatOrEditor(text);
      }
    })
  );

  // Attachment variants
  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.attachDefault', async () => {
      const defaultId = vscode.workspace.getConfiguration('prompts').get<string>('defaultPromptId')?.trim();
      if (!defaultId) {
        vscode.window.showErrorMessage('Set prompts.defaultPromptId in settings first.');
        return;
      }
      const [items, body] = await Promise.all([
        withProgress('Loading prompts', async () => service.listPrompts()),
        withProgress('Fetching prompt', async () => service.getPromptBody(defaultId)),
      ]);
      const title = items?.find((i) => i.id === defaultId)?.title || defaultId;
      if (!body) return;
      const uri = await createPromptAttachment(context, defaultId, title, body);
      await openAttachment(uri);
      const attached = await tryAttachFileToChat(uri);
      if (!attached) await revealFileForManualAttach(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prompts.chooseAttach', async () => {
      const items = await withProgress('Loading prompts', async () => service.listPrompts());
      if (!items || !items.length) {
        vscode.window.showWarningMessage('No prompts found. Configure prompts.apiBaseUrl and try again.');
        return;
      }
      const selected = await vscode.window.showQuickPick(
        items.map((p) => ({ label: p.title || p.id, description: p.id })),
        { placeHolder: 'Select a prompt to attach' }
      );
      if (!selected) return;
      const id = selected.description || selected.label;
      const body = await withProgress('Fetching prompt', async () => service.getPromptBody(id));
      if (!body) return;
      const title = items.find((i) => i.id === id)?.title || id;
      const uri = await createPromptAttachment(context, id, title, body);
      await openAttachment(uri);
      const attached = await tryAttachFileToChat(uri);
      if (!attached) await revealFileForManualAttach(uri);
    })
  );

  // Optional: try to warm index on startup (best-effort)
  try {
    await service.listPrompts();
  } catch (err) {
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

export function deactivate() {}


