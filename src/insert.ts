import * as vscode from 'vscode';

async function tryExecuteCommand(commandId: string): Promise<boolean> {
  try {
    await vscode.commands.executeCommand(commandId);
    return true;
  } catch {
    return false;
  }
}

async function focusChatIfPossible(): Promise<boolean> {
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
      if (ok) return true;
    }
  }
  return false;
}

export async function insertTextIntoChatOrEditor(text: string): Promise<void> {
  const focused = await focusChatIfPossible();
  // Try to paste into current focus
  await vscode.env.clipboard.writeText(text);
  const pasted = await tryExecuteCommand('editor.action.clipboardPasteAction');
  if (pasted) return;

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


