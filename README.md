# System Prompt Inserter (VS Code/Cursor)

Insert system prompts from your API into chat/editor with caching and minimal setup.

## Setup
1. Open this folder in VS Code.
2. Run `npm install`.
3. Press F5 to launch the Extension Development Host.

### Local test with mock API
1. In a terminal, start the mock server:
   ```bash
   npm run mock
   ```
2. In VS Code settings set:
   - `prompts.apiBaseUrl`: `http://localhost:3000`
   - `prompts.defaultPromptId`: `welcome` (or `coding` / `analysis`)
3. Use commands from the Command Palette (Cmd/Ctrl+Shift+P):
   - Prompts: Insert Default System Prompt
   - Prompts: Choose and Insert System Prompt
   - Prompts: Attach Default Prompt as File
   - Prompts: Choose and Attach Prompt as File

## Configure
- Set `prompts.apiBaseUrl` (e.g., `https://api.example.com`).
- Run command: `Prompts: Set/Update API Key` to store your API key in Secret Storage (optional if your API is public).
- Optionally set `prompts.defaultPromptId`.
- Adjust `prompts.cacheTtlMs` and `prompts.maxBodies` as needed.

## Commands
- `Prompts: Insert Default System Prompt`: fetches and inserts the default prompt.
- `Prompts: Choose and Insert System Prompt`: shows a list from the API, then inserts.
- `Prompts: Attach Default Prompt as File`: saves the default prompt to `.vscode/prompts/*.md`, opens it, and posts a link into chat/editor.
- `Prompts: Choose and Attach Prompt as File`: choose a prompt, save to file, open it, and post a link.
- `Prompts: Refresh Prompts Cache`: refreshes the prompts index.
- `Prompts: Set/Update API Key`: stores your API key securely.

## Endpoints (wire yours)
- GET `/prompts`: returns an array of `{ id, title, version?, updatedAt? }`.
- GET `/prompts/{id}`: returns `{ body }` (or `{ content }`).

Edit `src/http.ts` if your schema differs. ETags are supported via `ETag` header for efficient caching.

## Chat insertion
The extension tries to focus a chat view and paste. If that isn't available (Cursor variants), it copies to clipboard and inserts into the current editor as a fallback. Attachment commands create a Markdown file and paste a reference so chats stay clean for long prompts.

## Storage
- Cache stored in VS Code global storage directory as `prompt-cache.json` and mirrored in Memento for speed.
- API keys stored in Secret Storage.
 - Attachments saved under workspace `.vscode/prompts/*.md` when a workspace is open; otherwise, under global storage.

## Shortcuts and quick access
- Keybindings (customizable in Keyboard Shortcuts):
  - Attach Default: Cmd+Alt+P (macOS) / Ctrl+Alt+P (Win/Linux)
  - Choose & Attach: Cmd+Alt+Shift+P / Ctrl+Alt+Shift+P
- Status Bar: “Attach Prompt” button on the left to attach the default prompt.

## Notes
- The cache uses a TTL and basic LRU pruning by `lastUsedAt`.

