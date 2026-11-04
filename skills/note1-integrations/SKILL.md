---
name: note1-integrations
description: View and manage a note1.ai team's integrations (Slack, Linear, Jira, GitHub, Asana, Trello, Todoist, Motion, Notion) through the note1 MCP server. Use when the user asks which tools are connected, where action item tickets go, wants to change an integration's settings, connect or disconnect a tool, or fix one that needs to reconnect. Changes are limited to team admins.
---

# note1 integrations

Integrations connect a team's note1 to Slack and to task tools, so action items can become tickets. The integrations are shared by the team, and changing them takes a team admin. All tools take an optional `teamId` (omit it for the active team). The `tool` argument is one of `slack`, `linear`, `jira`, `github`, `asana`, `trello`, `todoist`, `motion`, `notion`.

## Start by listing

Always call `note1_list_integrations` first. It returns `canManage` (true for team admins) and, for each integration, `connected`, `status` (`active` or `needs_reauth`), the workspace and the settings. Task tools show `target` (where tickets go), `matchMode`, `autoCreate`, `closedTicketMode`, `doneInNote1Mode` and, for Trello, `doneList`. Slack shows `defaultChannel` and `postByDefault`.

If the user only wants to know what is connected, stop there and summarize in plain words.

## Who can change things

`note1_update_integration`, `note1_connect_integration` and `note1_disconnect_integration` are for team admins. When `canManage` is false, do not call them. Tell the user a team admin has to do it, and offer to say exactly what to change. If a call returns "Only team admins can manage integrations", relay that, do not retry.

These three tools also need the `integrations:write` scope. Personal access tokens carry it. A client connected through OAuth before it existed does not have it, and the tools are then missing from the tool list. In that case tell the user to disconnect and reconnect (or re-add) the note1 app in their client and approve "Manage team integrations" on the consent page, or to use a personal access token.

## Change settings

1. `note1_list_integration_options` with the `tool` shows what a setting can be: the targets (Linear teams, Jira projects, GitHub repos, Trello lists and so on), Trello's done lists, or Slack's channels. The tool must be connected.
2. `note1_update_integration` changes only the fields you pass, by name or id:
   - `target`: an id or exact name from the options.
   - `matchMode`: `suggest` asks before linking an existing ticket, `auto_link` links it.
   - `autoCreate`: create a ticket for every new action item.
   - `closedTicketMode`: when a linked ticket is closed in the tool, `suggest` completing the item, `auto_close` completes it, `off`.
   - `doneInNote1Mode`: when an item is marked done in note1, `ask`, `close` the ticket, `comment` on it, or `off`.
   - Trello only: `doneList` (id or name, `none` for no done list, `auto` for the list named Done).
   - Slack only: `defaultChannel` (id or name, `none` to clear) and `postByDefault`.
3. If a name matches several options the tool lists the ids; ask the user which one. Read back the new settings it returns.

Turning on `autoCreate`, `auto_link`, `auto_close` or `close` makes note1 act on tickets without asking each time. Say what changes and get a yes first.

## Connect

`note1_connect_integration` returns a link. Give the user the link and, if your client can open a browser, open it for them. It expires in 10 minutes, so request a new one rather than reusing an old link. The user finishes the sign-in in the browser; afterwards call `note1_list_integrations` to confirm it is `active`. **Motion** connects with an API key that should not pass through a chat, so the tool returns the dashboard integrations page instead: send the user there and never ask them to paste the key.

A connected tool also needs a `target` before tickets are created. After connecting, list the options and ask where tickets should go.

## Needs reauth

`status: "needs_reauth"` means the provider rejected the saved authorization, and nothing syncs until it is renewed. Run `note1_connect_integration` for that tool (admins only) and have the user sign in again.

## Disconnect

`note1_disconnect_integration` stops syncing for the whole team. Do it only after the user names the tool explicitly and confirms, for example "Disconnect Linear for the whole team?". Pass `confirmed: true` only after that yes. Tickets already created or linked keep their links, settings are kept, and connecting again resumes. Never infer consent from a vague request such as "clean up my integrations".

## Example requests

- "Which integrations are connected, and where do tickets go?"
- "Send new action items from the standup to Linear's Growth team."
- "Turn off automatic ticket creation for GitHub."
- "Trello should not use a done list."
- "Connect Jira for our team."
- "Slack says it needs to reconnect. Fix it."
- "Disconnect Asana."
