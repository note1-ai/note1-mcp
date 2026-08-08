# note1 MCP Server

**Query your meeting notes, transcripts, and action items from Claude, ChatGPT, Cursor, or any MCP client.**

[note1](https://note1.ai) is an AI meeting notetaker that joins your calls, records them, and turns every meeting into a searchable summary with action items. This MCP (Model Context Protocol) server connects AI tools directly to that meeting data — search across conversations with cited sources, export summaries and speaker-attributed transcripts, check which calendar events are being recorded, and schedule or manage recordings, all from a conversation.

Every tool acts with the authenticated user's own permissions: private meetings stay private, and results match exactly what the user sees in the note1 dashboard.

- **Server URL:** `https://api.note1.ai/mcp` (Streamable HTTP)
- **Registry:** [`ai.note1/mcp`](https://registry.modelcontextprotocol.io/v0/servers?search=note1) in the official MCP Registry
- **Docs:** [note1.ai/docs/mcp-server](https://note1.ai/docs/mcp-server)
- **Auth:** OAuth 2.1 (automatic browser consent) or Personal Access Tokens

## Tools

| Tool | Description |
| --- | --- |
| `note1_search_meetings` | Search meetings with AI-powered Deep Search. Mode `search` returns ranked snippets; mode `analysis` returns an AI answer with cited, timestamped sources. |
| `note1_list_meetings` | Browse meetings by status and date range, paginated. |
| `note1_get_meeting` | One meeting's summary, sections, participants, status, and link. |
| `note1_export_meeting` | Full summary and/or speaker-attributed transcript as paste-ready markdown or structured JSON. |
| `note1_get_calendar` | Calendar events with per-event recording status. |
| `note1_get_scheduling_link` | Prefilled calendar link (Google Meet / Teams) with the note1 bot pre-invited — create the event in your own calendar with recording pre-wired. |
| `note1_schedule_recording` | Send note1's recording bot to an existing calendar event or any meeting link at a given time. |
| `note1_update_meeting` | Edit title, bot time/link, summary style, language, or video — optionally for a recurring series. |
| `note1_cancel_recording` | Call off the bot for a meeting or its series. |

## Quick start

You need a note1 account ([note1.ai](https://note1.ai)). For token-based setups, create a Personal Access Token under **Account → API tokens** (shown once — copy it).

### Claude (web) — OAuth, no token

1. [Claude Settings → Connectors](https://claude.ai/settings/connectors) → **Add custom connector**
2. Name: `note1` — URL: `https://api.note1.ai/mcp` — leave the OAuth fields empty
3. **Add**, then approve access on the note1 consent page

### Claude Desktop — via `npx @note1/mcp`

```json
{
  "mcpServers": {
    "note1": {
      "command": "npx",
      "args": ["-y", "@note1/mcp"],
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
- *"Record my 3pm meeting: https://meet.google.com/abc-defg-hij"*
- *"Summarize all my meetings with the design team this month"*

## How this package works

The hosted MCP server lives at `https://api.note1.ai/mcp`. This package (`@note1/mcp`) is a thin stdio bridge for clients that launch MCP servers as commands: it wraps [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with the note1 URL and your `NOTE1_API_TOKEN`. Clients with native remote support (claude.ai, Cursor) can connect to the URL directly and skip it.

## Security

- Tokens are shown once at creation and stored only as SHA-256 hashes server-side. Revoke anytime under **Account → API tokens**.
- OAuth connections appear under **Connected apps** with one-click revocation.
- Write tools (schedule/update/cancel) are annotated so clients prompt for confirmation; read tools are marked read-only.
- note1 holds no calendar write permissions — scheduling tools control note1's recording bot only and never create or modify calendar events.

## Links

- [note1](https://note1.ai) — product
- [MCP server docs](https://note1.ai/docs/mcp-server) — full setup guide and troubleshooting
- [Model Context Protocol](https://modelcontextprotocol.io) — the standard

## License

MIT
