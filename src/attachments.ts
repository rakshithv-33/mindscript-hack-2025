import * as vscode from 'vscode';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'prompt';
}

async function getAttachmentDir(context: vscode.ExtensionContext): Promise<vscode.Uri> {
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

export async function createPromptAttachment(
  context: vscode.ExtensionContext,
  id: string,
  title: string,
  body: string
): Promise<vscode.Uri> {
  const dir = await getAttachmentDir(context);
  const base = slugify(title || id);
  const filename = `${base}.md`;
  const uri = vscode.Uri.joinPath(dir, filename);
  const includeHeader = vscode.workspace.getConfiguration('prompts').get<boolean>('attachIncludeHeader') ?? false;
  const header = includeHeader ? `# ${title || id}\n\n<!-- prompt-id: ${id} -->\n\n` : '';
  const content = `${header}${body}\n`;
  const data = Buffer.from(content, 'utf8');
  await vscode.workspace.fs.writeFile(uri, data);
  return uri;
}

export async function openAttachment(uri: vscode.Uri): Promise<void> {
  await vscode.window.showTextDocument(uri, { preview: false });
}


