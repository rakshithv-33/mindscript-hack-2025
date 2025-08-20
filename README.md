# System Prompt Inserter (VS Code/Cursor)

Insert system prompts from your API into chat/editor with caching. Attach long prompts as Markdown files to keep chat clean.

## Setup
1. Open this folder in VS Code.
2. Run `npm install`.
3. Press F5 to launch the Extension Development Host.

### Local test with mock API
1. In a terminal, start the mock server:
   ```bash
   npm run mock
   ```
2. VS Code settings (User or Workspace):
   - `prompts.apiBaseUrl`: `http://localhost:3000`
   - `prompts.defaultPromptId`: `welcome` (or `coding` / `analysis`)
3. Use commands from the Command Palette (Cmd/Ctrl+Shift+P) or the status bar buttons (bottom-left).

## Configure
- **API base URL**: `prompts.apiBaseUrl` (e.g., `http://localhost:8081`).
- **Default prompt**: `prompts.defaultPromptId` used by quick-attach.
- **Caching**: `prompts.cacheTtlMs` (ms) and `prompts.maxBodies`.
- **Auth**: Run `Prompts: Set/Update API Key` to store a token in Secret Storage if required.

Advanced mapping (no code changes needed):
- `prompts.indexPath`: list endpoint path (e.g., `/api/prompts?size=1000&sort=title,ASC`).
- `prompts.itemPathTemplate`: single endpoint path (e.g., `/api/prompts/{id}`).
- `prompts.indexResponsePath`: dot-path to array if wrapped (e.g., `content`).
- `prompts.fieldMap.id|title|version|updatedAt|body`: field names in your JSON. `body` supports dot-path (e.g., `data.body`).

## Commands
- `Prompts: Insert Default System Prompt` — fetch and insert the default prompt text.
- `Prompts: Choose and Insert System Prompt` — pick from list, then insert text.
- `Prompts: Attach Default Prompt as File` — save the default prompt to `.vscode/prompts/*.md` and open it (no chat message inserted).
- `Prompts: Choose and Attach Prompt as File` — pick from list, save/open file (no chat message inserted).
- `Prompts: Refresh Prompts Cache` — refresh the prompts index.
- `Prompts: Clear Prompts Cache` — clear persisted index/bodies (forces full reload next time).
- `Prompts: Set/Update API Key` — store API key in Secret Storage.

## Backend mapping (Spring Boot example)
- List: `GET /api/prompts` (paged). Set:
  - `prompts.indexPath`: `/api/prompts?size=1000&sort=title,ASC`
  - `prompts.indexResponsePath`: `content`
- Single: `GET /api/prompts/{id}`. Set:
  - `prompts.itemPathTemplate`: `/api/prompts/{id}`
  - `prompts.fieldMap.body`: `content`
Defaults in this repo are pre-set for the above.

## Chat insertion / attachments
- Insert text: focuses a chat input when possible and pastes; falls back to editor/clipboard if not supported by your editor.
- Attach file: creates a Markdown file under `.vscode/prompts/` and opens it. The extension attempts to attach programmatically where supported; otherwise reveal + drag/drop into chat. No text is posted into chat automatically.

## Storage
- Cache stored in global storage as `prompt-cache.json` and mirrored in Memento.
- API keys stored in Secret Storage.
- Attachments saved under workspace `.vscode/prompts/*.md` (or global storage if no workspace).

## Shortcuts and quick access
- Keybindings (customizable in Keyboard Shortcuts):
  - Attach Default: Cmd+Alt+P (macOS) / Ctrl+Alt+P (Win/Linux)
  - Choose & Attach: Cmd+Alt+Shift+P / Ctrl+Alt+Shift+P
- Status Bar: “Attach Prompt” button on the left to attach the default prompt.

## Install globally (VSIX)
- Build and install once to use in any folder:
  1. `npm run compile`
  2. `npm i -g @vscode/vsce && vsce package`
  3. Install the generated `.vsix` (Extensions → … → Install from VSIX… or `code --install-extension <file>.vsix --force`)

## Shortcuts and quick access
- Keybindings (customizable): Attach Default — Cmd+Alt+P (macOS) / Ctrl+Alt+P (Win/Linux); Choose & Attach — Cmd/Ctrl+Alt+Shift+P.
- Status Bar: “Attach Prompt” and “Choose Prompt” buttons (bottom-left).

## Troubleshooting
- See logs: View → Output → select “System Prompts”.
- Force a fresh sync: set `prompts.cacheTtlMs = 0`, run `Prompts: Clear Prompts Cache`, Reload Window, then `Prompts: Refresh Prompts Cache`.
- Clear cache file manually if needed:
  - VS Code macOS: `~/Library/Application Support/Code/User/globalStorage/your-publisher.system-prompt-inserter/`
  - Cursor macOS: `~/Library/Application Support/Cursor/User/globalStorage/your-publisher.system-prompt-inserter/`
  - Windsurf macOS: `~/Library/Application Support/Windsurf/User/globalStorage/your-publisher.system-prompt-inserter/`
- Ensure mock server on port 3000 is stopped when targeting your backend on 8081.


