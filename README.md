# note1 MCP Server

**Upload recordings and work with your meeting notes, transcripts, and action items from Claude, ChatGPT, Cursor, or any MCP client.**

[note1](https://note1.ai) is an AI meeting notetaker that joins your calls, records them, and turns every meeting into a searchable summary with action items. This MCP (Model Context Protocol) server connects AI tools directly to that meeting data — search across conversations with cited sources, read who spoke how much and what was asked, export summaries and speaker-attributed transcripts, list, create and complete action items, manage topic trackers, read and update your meeting notes, check which calendar events are being recorded, and schedule or manage recordings, all from a conversation.

Every tool acts with the authenticated user's own permissions: private meetings stay private, and results match exactly what the user sees in the note1 dashboard.

- **Server URL:** `https://api.note1.ai/mcp` (Streamable HTTP)
- **Registry:** [`ai.note1/mcp`](https://registry.modelcontextprotocol.io/v0/servers?search=note1) in the official MCP Registry
- **Docs:** [note1.ai/docs/mcp-server](https://note1.ai/docs/mcp-server)
- **Auth:** OAuth 2.1 (automatic browser consent) or Personal Access Tokens

## Tools

| Tool | Description |
| --- | --- |
| `note1_search_meetings` | Search meetings by keyword and meaning. Mode `search` returns ranked snippets; mode `analysis` returns an AI answer with cited, timestamped sources. |
| `note1_list_meetings` | Browse meetings by status and date range, paginated. |
| `note1_get_meeting` | One meeting's summary, sections, participants, status, recurring series (previous and next occurrence), and link. |
| `note1_get_meeting_insights` | Speakers with talk-time share, questions asked and answered, topics with time ranges, topic-tracker mentions, or highlights. Use instead of the transcript for "who spoke most" or "what was asked". |
| `note1_export_meeting` | Full summary and/or speaker-attributed transcript as paste-ready markdown or structured JSON. |
| `note1_list_action_items` | Tracked action items for a meeting or the team, with status, owner, meeting, date and page; `mine` for your own. |
| `note1_create_action_item` | Create an action item under a meeting or with none, for you, a named person, or nobody. |
| `note1_update_action_item` | Edit text, description or owner, or mark open, completed or dismissed. |
| `note1_list_topic_trackers` | Topic trackers you can see and where their phrases came up recently, with quotes. |
| `note1_create_topic_tracker` | Create a tracker: a named set of phrases watched across meetings. Personal by default; team trackers take an admin. |
| `note1_update_topic_tracker` | Rename a tracker or add and remove its phrases. |
| `note1_delete_topic_tracker` | Delete a tracker. |
| `note1_get_meeting_notes` | A meeting's personal notes and shared agenda, each block with a ref. |
| `note1_update_meeting_notes` | Change the notes block by block, or replace them with markdown. Personal by default; the shared agenda needs edit access. |
| `note1_get_calendar` | Calendar events with per-event recording status. |
| `note1_get_scheduling_link` | Prefilled calendar link (Google Meet / Teams) with the note1 bot pre-invited — create the event in your own calendar with recording pre-wired. |
| `note1_schedule_recording` | Send note1's recording bot to an existing calendar event or any meeting link at a given time. |
| `note1_update_meeting` | Edit title, bot time/link, summary style, language, or video — optionally for a recurring series. |
| `note1_cancel_recording` | Call off the bot for a meeting or its series. |
| `note1_get_recording_upload_options` | Check upload policy and get a workspace-specific browser link without reserving a meeting. |
| `note1_upload_recording` | Reserve one recording upload and return limited HTTP transfer instructions. File bytes stay outside MCP. |
| `note1_get_recording_upload` | Read the original uploader's acknowledged chunks, byte progress, and meeting state. |
| `note1_complete_recording_upload` | Confirm the recording and queue existing processing once. Safe to retry. |
| `note1_cancel_recording_upload` | Cancel a pending upload; returns a conflict if completion already won. |

## Upload an existing recording

Recording uploads require `meetings:write` and the user's approval. One private meeting holds one immutable original audio/video recording; uploads never launch a meeting bot. Use `note1_get_recording_upload_options` first to check the current workspace limit (initially 2,000,000,000 bytes).

For direct transfer, your assistant needs local-file access and an HTTP client. Call `note1_upload_recording` with metadata only:

```json
{
  "requestId": "fe926ddd-03bf-4917-8f1b-b44d3f290049",
  "title": "Customer interview",
  "file": { "name": "interview.wav", "size": 123456, "mimeType": "audio/wav" },
  "language": "en",
  "style": "interview"
}
```

The tool reserves a meeting and returns IDs plus `transfer` instructions. Outside MCP, **POST** each exact file slice using the returned `offset`, `size`, and integer chunk index in `urlTemplate`. Send the returned `Content-Type: application/octet-stream` and `X-Note1-Upload-Token` headers. Never pass bytes, base64, local paths, or account-wide credentials through upload tool arguments; never put the upload token in a URL.

Check acknowledged chunks with `note1_get_recording_upload` after a lost response. Retry initialization with the **same requestId and frozen file metadata** to recover or renew the upload permission. Identical chunk retries do not charge twice. After all bytes are acknowledged, call `note1_complete_recording_upload` with `uploadId` and `fileId`; processing may still be running, so use `note1_get_meeting` for results. Keep the same resolved `teamId` throughout.

If your assistant cannot transfer local files, use the browser link from `note1_get_recording_upload_options` **before reserving**. Sign in, verify or explicitly switch to the requested workspace, then choose and submit a file. If login sends you to the dashboard, reopen the assistant's link. Opening the page or form creates no meeting. The browser starts its own upload, not cross-tab resume; continue an existing direct reservation or confirm cancellation before starting over. Completion opens the meeting page, without an automatic callback into the chat.

Initialization reserves one meeting allowance; normal storage, transfer, and processing accounting applies. Cancellation does not refund meeting allowance or transfer usage. If completion already won, check status and open the existing meeting rather than claiming cancellation.

## Quick start

You need a note1 account ([note1.ai](https://note1.ai)). For token-based setups, create a Personal Access Token under **Account → API tokens** (shown once — copy it).

### Claude (web) — OAuth, no token

1. [Claude Settings → Connectors](https://claude.ai/settings/connectors) → **Add custom connector**
2. Name: `note1` — URL: `https://api.note1.ai/mcp` — leave the OAuth fields empty
3. **Add**, then approve access on the note1 consent page

### Claude Desktop — via `npx @note1ai/mcp`

```json
{
  "mcpServers": {
    "note1": {
      "command": "npx",
      "args": ["-y", "@note1ai/mcp"],
      "env": { "NOTE1_API_TOKEN": "n1_YOURTOKEN" }
    }
  }
}
```

### Claude Code

```bash
claude mcp add note1 --transport http https://api.note1.ai/mcp \
  --header "Authorization: Bearer n1_YOURTOKEN"
```

### Cursor

```json
{
  "mcpServers": {
    "note1": {
      "url": "https://api.note1.ai/mcp",
      "headers": { "Authorization": "Bearer n1_YOURTOKEN" }
    }
  }
}
```

### Slack (Slackbot)

Workspaces connected to note1 get zero-config access: open a DM with **Slackbot** → **Apps** → add **note1**. Slack identifies you by your workspace email.

## Example prompts

- *"What did we decide about pricing in last week's meetings?"*
- *"Export the transcript of yesterday's standup as markdown"*
- *"Which of my meetings tomorrow are being recorded?"*
- *"Who spoke the most in yesterday's standup, and which questions went unanswered?"*
- *"What are my open action items? Mark the deck one as done."*
- *"Start tracking mentions of pricing across our meetings"*
- *"Record my 3pm meeting: https://meet.google.com/abc-defg-hij"*
- *"Summarize all my meetings with the design team this month"*
- *"Upload this interview recording and summarize it"*

## How this package works

The hosted MCP server lives at `https://api.note1.ai/mcp`. This package (`@note1ai/mcp`) is a thin stdio bridge for clients that launch MCP servers as commands: it wraps [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with the note1 URL and your `NOTE1_API_TOKEN`. Clients with native remote support (claude.ai, Cursor) can connect to the URL directly and skip it.

Tool availability comes from the deployed hosted server and your granted scopes, not from this package's version. The bridge itself does not read or upload local files; use your client's HTTP/file tools or the browser fallback. Refresh the client's cached tool list when hosted tools change.

## Security

- Tokens are shown once at creation and stored only as SHA-256 hashes server-side. Revoke anytime under **Account → API tokens**.
- OAuth connections appear under **Connected apps** with one-click revocation.
- Write tools (schedule/update/cancel) are annotated so clients prompt for confirmation; read tools are marked read-only.
- note1 holds no calendar write permissions — scheduling tools control note1's recording bot only and never create or modify calendar events.
- Recording transfer permissions are private, upload-only secrets valid for one hour. Renewal rotates the permission without extending upload retention. Expiry, rotation, cancellation, completion, or workspace membership removal invalidates it. Revoking a PAT or OAuth connection alone does **not** immediately revoke an already issued upload permission; never paste the upload header into public logs or chats.

## Links

- [note1](https://note1.ai) — product
- [MCP server docs](https://note1.ai/docs/mcp-server) — full setup guide and troubleshooting
- [Model Context Protocol](https://modelcontextprotocol.io) — the standard

## License

MIT
