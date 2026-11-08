# note1 MCP Server

**Upload recordings and work with your meeting notes, transcripts, and action items from Claude, ChatGPT, Cursor, or any MCP client.**

[note1](https://note1.ai) is an AI meeting notetaker that joins your calls, records them, and turns every meeting into a searchable summary with action items. This MCP (Model Context Protocol) server connects AI tools directly to that meeting data — search across conversations with cited sources, read who spoke how much and what was asked, export summaries and speaker-attributed transcripts, list, create and complete action items (and close their linked tickets in GitHub, Linear, Jira and more), manage topic trackers, connect and configure team integrations, read and update your meeting notes, check which calendar events are being recorded, and schedule or manage recordings, all from a conversation.

Every tool acts with the authenticated user's own permissions: private meetings stay private, and results match exactly what the user sees in the note1 dashboard.

- **Server URL:** `https://api.note1.ai/mcp` (Streamable HTTP)
- **Registry:** [`ai.note1/mcp`](https://registry.modelcontextprotocol.io/v0/servers?search=note1) in the official MCP Registry
- **Docs:** [note1.ai/docs/mcp-server](https://note1.ai/docs/mcp-server)
- **Auth:** OAuth 2.1 (sign in to note1 in your browser) or a personal access token

## Connect without this package

Clients that support remote MCP servers can connect to `https://api.note1.ai/mcp` directly and sign in to note1 in the browser. You need neither this package nor a token.

- **Claude and ChatGPT:** add note1 from the Claude Connectors Directory or the ChatGPT plugin directory once listed, or add a custom connector with the URL `https://api.note1.ai/mcp`. Then sign in to note1 and approve access. Custom connectors depend on your plan.
- **Claude Code:** run `claude mcp add --transport http note1 https://api.note1.ai/mcp`, then run `/mcp` and sign in.
- **Cursor and VS Code:** add the URL as a remote MCP server and sign in when asked.
- **Slack (Slackbot):** workspaces connected to note1 get zero-config access. Open a DM with **Slackbot**, choose **Apps**, and add **note1**. Slack identifies you by your workspace email.

## Setup with this package

You need a note1 account ([note1.ai](https://note1.ai)). Every client below runs the same command, `npx -y @note1ai/mcp`. Requires Node.js 18 or newer.

The first time the server starts, the package opens note1 in your browser. Sign in and approve access. The sign-in is saved in `~/.mcp-auth` on your computer, so you do not repeat it every time.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "note1": {
      "command": "npx",
      "args": ["-y", "@note1ai/mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project). Cursor can also connect directly; use this package if Cursor's own sign-in fails.

```json
{
  "mcpServers": {
    "note1": {
      "command": "npx",
      "args": ["-y", "@note1ai/mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "note1": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@note1ai/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add note1 -- npx -y @note1ai/mcp
```

### Any other MCP client

Configure a stdio server with command `npx` and arguments `-y @note1ai/mcp`.

### Use a token instead

Browser sign-in needs a browser on the same computer as the MCP client. Over SSH, in CI or in a container, or to skip the sign-in, set `NOTE1_API_TOKEN` to a personal access token (starts with `n1_`). Create one at [note1.ai/dashboard/account/tokens](https://note1.ai/dashboard/account/tokens). It is shown once, so copy it.

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

With Claude Code:

```bash
claude mcp add note1 --env NOTE1_API_TOKEN=n1_YOURTOKEN -- npx -y @note1ai/mcp
```

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NOTE1_API_TOKEN` | no | Your note1 personal access token. Must start with `n1_`. Without it, the package signs in through your browser. |

The token is passed to `mcp-remote` through its environment, not on the command line, so it does not show up in process lists. Extra arguments given to the command are forwarded to `mcp-remote`. The server URL is fixed to `https://api.note1.ai/mcp`.

## Tools

| Tool | Description |
| --- | --- |
| `note1_get_account` | Your plan, seats, what's left of this period's meeting allowance, the upload size limit, and your teams. Check it before uploading a recording. |
| `note1_search_meetings` | Search meetings by keyword and meaning. Mode `search` returns ranked snippets; mode `analysis` returns an AI answer with cited, timestamped sources. |
| `note1_list_meetings` | Browse meetings by status and date range. Returns up to 20 meetings per call, newest first, with a `nextPage` cursor when more exist. |
| `note1_get_meeting` | One meeting's summary, sections, participants, status, recurring series (previous and next occurrence), and link. |
| `note1_get_meeting_insights` | Speakers with talk-time share, questions asked and answered, topics with time ranges, topic-tracker mentions, or highlights. Use instead of the transcript for "who spoke most" or "what was asked". |
| `note1_export_meeting` | Full summary and/or speaker-attributed transcript as paste-ready markdown or structured JSON. |
| `note1_list_action_items` | Tracked action items for a meeting or the team, with status, owner, meeting, date and page; `mine` for your own. Each item lists its `linkedTickets` (tool, identifier, url, close status) and `possiblyDone` when note1 saw signs it is already done, in a meeting or on the linked ticket. Returns at most 200 items; narrow with `meetingId`, `mine`, `status`, `before` or `after`. |
| `note1_create_action_item` | Create an action item under a meeting or with none, for you, a named person, or nobody. |
| `note1_update_action_item` | Edit text, description or owner, or mark open, completed or dismissed. Completing an item applies each connected tool's "done in note1" setting to its linked tickets; when tickets wait for a decision, ask the user and call again with `closeLinkedTickets: true` to close them. The result lists the linked tickets and their close status. |
| `note1_list_topic_trackers` | Topic trackers you can see and where their phrases came up recently, with quotes. |
| `note1_create_topic_tracker` | Create a tracker: a named set of phrases watched across meetings. Personal by default; team trackers take an admin. |
| `note1_update_topic_tracker` | Rename a tracker or add and remove its phrases. |
| `note1_delete_topic_tracker` | Delete a tracker. |
| `note1_get_meeting_notes` | A meeting's personal notes and shared agenda, each block with a ref. |
| `note1_update_meeting_notes` | Change the notes block by block, or replace them with markdown. Personal by default; the shared agenda needs edit access. |
| `note1_list_integrations` | The team's integrations (Slack, Linear, Jira, GitHub, Asana, Trello, Todoist, Motion, Notion): connected or not, status (`active`, `needs_reauth` or `disconnected`), workspace, where tickets go, settings, and whether you can manage them (`canManage`, team admins only). |
| `note1_list_integration_options` | What an integration can be set to: its targets (teams, projects, repos, lists), Trello's done lists, or Slack's channels. |
| `note1_update_integration` | Change an integration's settings by name or id: target, match mode, auto-create, closed-ticket mode, what happens to the ticket when an item is done in note1, Trello's done list (or none), Slack's default channel. Team admins only; needs the `integrations:write` scope. |
| `note1_connect_integration` | Get the link to open in a browser to connect an integration (expires in 10 minutes). Motion points to the dashboard, since its API key should not be shared in a chat. Team admins only; needs `integrations:write`. |
| `note1_disconnect_integration` | Disconnect an integration: syncing stops, linked tickets and settings are kept, and connecting again resumes. Requires `confirmed: true` after the user agreed. Team admins only; needs `integrations:write`. |
| `note1_sync_action_items` | Send one action item, or all of a meeting's, to the connected task tools. Needs edit access to the meeting. |
| `note1_decide_ticket_suggestion` | Link, create or dismiss the ticket note1 suggested for an action item. |
| `note1_get_calendar` | Calendar events with per-event recording status. |
| `note1_get_scheduling_link` | A prefilled calendar link (Google Meet or Teams) with the note1 bot pre-invited, which you open to create the event in your own calendar. Use it when the user wants to schedule or book a meeting. It changes nothing in note1, and note1 cannot create calendar events itself. |
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

## Agent Skills

The [`skills`](skills) folder has [Agent Skills](https://agentskills.io) that teach an agent how to use these tools well: citing meeting sources, handling linked tickets, asking before closing or disconnecting anything, and transferring recordings in chunks. They work with the MCP server; they do not replace it.

| Skill | Use it for |
| --- | --- |
| [`note1-meetings`](skills/note1-meetings/SKILL.md) | Finding, reading and exporting meetings, cited answers, insights, teams and private meetings |
| [`note1-action-items`](skills/note1-action-items/SKILL.md) | Listing, creating and completing action items, linked tickets, syncing and ticket suggestions |
| [`note1-integrations`](skills/note1-integrations/SKILL.md) | Seeing, configuring, connecting and disconnecting Slack and task tools (team admins) |
| [`note1-recordings`](skills/note1-recordings/SKILL.md) | Scheduling and cancelling the recording bot, calendar status, and uploading an existing recording |
| [`note1-notes-and-trackers`](skills/note1-notes-and-trackers/SKILL.md) | Meeting notes and agendas, and topic trackers |

Install them with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add note1-ai/note1-mcp
```

Or copy a skill folder into `~/.claude/skills/` (Claude Code, every project) or `.claude/skills/` (one project). In the Claude apps, upload the skill folder as a ZIP file in the Skills settings.

The same skills are published at [note1.ai/.well-known/agent-skills/index.json](https://note1.ai/.well-known/agent-skills/index.json) for agents that discover skills from a site.

## ChatGPT plugin source

[`openai-plugin/`](openai-plugin) holds the source of note1's ChatGPT plugin listing: `plugin.json`, `mcp.json` (the hosted server with OAuth dynamic client registration), brand assets and one consolidated skill. It is not part of the npm package. Run `npm run plugin:validate` to check it against the directory limits and `npm run plugin:build` to create `openai-plugin/dist/note1-plugin.zip` for upload at platform.openai.com/plugins.

## Example prompts

- *"What did we decide about pricing in last week's meetings?"*
- *"Export the transcript of yesterday's standup as markdown"*
- *"Which of my meetings tomorrow are being recorded?"*
- *"Who spoke the most in yesterday's standup, and which questions went unanswered?"*
- *"What are my open action items? Mark the deck one as done."*
- *"Mark the deck one as done and close its GitHub issue"*
- *"Which integrations are connected? Send new action items from the standup to Linear's Growth team"*
- *"Start tracking mentions of pricing across our meetings"*
- *"Record my 3pm meeting: https://meet.google.com/abc-defg-hij"*
- *"Summarize all my meetings with the design team this month"*
- *"Upload this interview recording and summarize it"*
- *"How much of this month's meeting allowance do I have left?"*

## How this package works

The hosted MCP server lives at `https://api.note1.ai/mcp`. This package (`@note1ai/mcp`) is a thin stdio bridge for clients that launch MCP servers as commands: it wraps [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) with the note1 URL, and either signs you in through your browser or sends your `NOTE1_API_TOKEN`. Clients with native remote support (claude.ai, Cursor) can connect to the URL directly and skip it.

The hosted server also reports its title, website, icons and usage instructions to clients when they connect (the MCP `serverInfo` and `instructions` fields).

Tool availability comes from the deployed hosted server and your granted scopes, not from this package's version. The bridge itself does not read or upload local files; use your client's HTTP/file tools or the browser fallback. Refresh the client's cached tool list when hosted tools change.

## Security

- Tokens are shown once at creation and stored only as SHA-256 hashes server-side. Revoke anytime under **Account → API tokens**.
- OAuth connections appear under **Connected apps** with one-click revocation. The browser sign-in of this package is stored in `~/.mcp-auth`; delete that folder to sign out locally.
- This package passes `NOTE1_API_TOKEN` to `mcp-remote` through its environment, never on the command line, and never prints it.
- Write tools (schedule/update/cancel) are annotated so clients prompt for confirmation; read tools are marked read-only.
- Managing team integrations is limited to team admins and sits behind its own OAuth scope, `integrations:write` ("Manage team integrations" on the consent page). Existing connections don't get it automatically; reconnect to grant it. Personal access tokens carry every scope.
- note1 holds no calendar write permissions — scheduling tools control note1's recording bot only and never create or modify calendar events.
- Recording transfer permissions are private, upload-only secrets valid for one hour. Renewal rotates the permission without extending upload retention. Expiry, rotation, cancellation, completion, or workspace membership removal invalidates it. Revoking a PAT or OAuth connection alone does **not** immediately revoke an already issued upload permission; never paste the upload header into public logs or chats.

## Pricing

See [note1.ai/#pricing](https://note1.ai/#pricing).

## Support

support@note1.ai

## Links

- [note1](https://note1.ai) — product
- [MCP server docs](https://note1.ai/docs/mcp-server) — full setup guide and troubleshooting
- [Model Context Protocol](https://modelcontextprotocol.io) — the standard

## License

MIT. Copyright (c) 2026 note1.ai (one1.dev).
