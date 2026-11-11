# note1 for Claude

[note1](https://note1.ai) is an AI meeting notetaker. It joins your calls, records them and turns each meeting into a searchable summary with a speaker-attributed transcript and action items. This plugin connects Claude to that meeting data and teaches Claude how to use it well.

## Install

In Claude Code:

```
/plugin install note1 --marketplace note1-ai/note1-mcp
```

In Claude (web, desktop and mobile), add note1 from the [directory](https://claude.ai/directory).

## What you can do

- **Ask about your meetings.** Ask what was decided or discussed and get an answer that cites the meeting titles, dates and timestamps it is based on. Search by keyword and meaning across summaries, transcripts, action items, topics and questions.
- **Read meeting details.** See who spoke and for how long, which questions were asked and answered, and which topics came up. Read a summary, export it with the transcript as markdown or JSON.
- **Follow through on action items.** List, create, reassign, edit, complete or dismiss action items, see the tickets linked to them in GitHub, Linear, Jira, Asana, Trello, Todoist, Motion or Notion, and choose whether to close those tickets.
- **Track topics and prepare.** Create topic trackers that watch phrases across meetings, and read or edit a meeting's personal notes and shared agenda.
- **Recordings and calendar.** See which upcoming calendar events note1 will record, send the recording bot to a meeting link, reschedule or cancel it, or upload an existing audio or video recording.
- **Integrations.** See which Slack and task-tool integrations your team has connected. Team admins can change, connect and disconnect them.

## What the plugin contains

- **One remote MCP server:** `https://api.note1.ai/mcp`, operated by note1.ai. It is the only endpoint the plugin connects to. The plugin runs no local code, hooks or scripts.
- **Five skills** that explain to Claude how to use the note1 tools: `note1-meetings`, `note1-action-items`, `note1-notes-and-trackers`, `note1-recordings` and `note1-integrations`.

## Sign-in and permissions

You need a note1 account. The first time Claude uses a note1 tool, it opens note1 in your browser so you can sign in and approve access (OAuth 2.1). Every tool runs with your own note1 permissions: private meetings stay private, and results match what you see in the note1 dashboard. Tools that change data are marked as such, so Claude asks before it runs them.

## Data

The plugin sends only what each tool call needs (for example a search query or an action item's new status) to note1's API, and returns note1 data you already have access to. It does not read your Claude conversations, memory or files. See the [privacy policy](https://note1.ai/docs/privacy-policy) for how note1 handles meeting data.

## Help

- Documentation: [note1.ai/docs/mcp-server](https://note1.ai/docs/mcp-server)
- Support: [note1.ai/docs/support](https://note1.ai/docs/support)
- Issues: [github.com/note1-ai/note1-mcp/issues](https://github.com/note1-ai/note1-mcp/issues)
