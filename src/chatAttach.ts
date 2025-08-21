import * as vscode from 'vscode';

async function tryExec(commandId: string, ...args: any[]): Promise<boolean> {
  try {
    await vscode.commands.executeCommand(commandId, ...args);
    return true;
  } catch {
    return false;
  }
}

export async function tryAttachFileToChat(uri: vscode.Uri): Promise<boolean> {
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
    if (await tryExec(cmd, [uri])) return true;
    // Or a single URI
    if (await tryExec(cmd, uri)) return true;
  }
  return false;
}

export async function revealFileForManualAttach(uri: vscode.Uri) {
  try {
    await vscode.commands.executeCommand('revealInExplorer', uri);
  } catch {
    // ignore
  }
  try {
    await vscode.env.clipboard.writeText(uri.fsPath);
    vscode.window.showInformationMessage('Prompt file ready. Drag it into the chat to attach (path copied to clipboard).');
  } catch {
    // ignore
  }
}

async function focusChatIfPossible(): Promise<boolean> {
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
      } catch {
        // try next
      }
    }
  }
  return false;
}


