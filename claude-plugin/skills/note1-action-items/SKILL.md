---
name: note1-action-items
description: List, create, update and complete note1.ai action items through the note1 MCP server, including their linked tickets in GitHub, Linear, Jira and other task tools. Use when the user asks about their tasks or to-dos from meetings, wants to add, reassign, complete or dismiss one, asks whether a ticket was closed, wants action items sent to a task tool, or answers a ticket suggestion.
---

# note1 action items

Action items are the tasks note1 pulls out of meetings. When a task tool such as GitHub, Linear or Jira is connected, an item can be linked to a ticket there. Every tool acts with the signed-in user's own permissions, and takes an optional `teamId` (omit it for the active team).

## List

`note1_list_action_items` returns open items by default.

- `mine: true` for the user's own items, otherwise the whole team's that they can see.
- `status`: `open`, `completed`, `dismissed` or `all`.
- `meetingId` for one meeting's items; `before` and `after` (ISO dates) filter by the meeting date.
- Each item has an `id`, owner, status and a board link. Include the link when you list items.
- `linkedTickets` is always an array. Each entry has `tool`, `identifier`, `url` and `closeStatus`. `closeStatus: "pending_ask"` means a close is waiting for the user's decision.
- `possiblyDone` is `null` or `{ source, tool?, ticket?, quote? }`. It means note1 saw signs the item is already done, said in a meeting or seen on the linked ticket. Treat it as a proposal: show the quote, ask whether to mark the item done, and do nothing until the user agrees.

## Create

`note1_create_action_item` takes `text` (one line), optional `description`, optional `meetingId` and `assignee`. Use `"me"` for the user, a person's name or email for someone else, or leave `assignee` out for unassigned. File it under a meeting only when the user names one (find the id with search or list first). Give the user the returned link.

## Update

`note1_update_action_item` takes the `actionItemId` plus any of `text`, `description`, `assignee` (`"me"`, a name, an email or `"nobody"`), `status` (`open` to reopen, `completed`, `dismissed` for "won't do") and `closeLinkedTickets`. Provide at least one change.

**Bulk status changes.** The tool changes one item per call. When the user asks to change many ("mark all of the standup's items done", "dismiss everything older than two months"), list the matching items first, tell the user the count with a few example texts, and wait for a yes before making the calls. Report how many succeeded and name any that failed.

## Linked tickets when completing

Marking an item `completed` applies each connected tool's "done in note1" setting to its linked tickets. The result lists `linkedTickets` and may include a `linkedTicketsNote`.

- If the note says tickets are waiting for a decision, **ask the user** whether to close them, naming the tickets (for example "GitHub #7 and the Notion page"). Only after a yes, call `note1_update_action_item` again with `closeLinkedTickets: true`. Never set `closeLinkedTickets` on your own.
- `closeLinkedTickets` only works on a completed item. On an open one nothing is closed, and the result says so.
- If a ticket failed to close, say so and offer the same retry with `closeLinkedTickets: true`.
- Dismissing or reopening does not close tickets.

## Sending items to task tools

`note1_sync_action_items` sends action items to the connected tools that have a target set. Pass exactly one of `actionItemId` (a forced retry for that item, for example after a failed sync) or `meetingId` (all of that meeting's items). It needs edit access to the meeting and runs in the background, so report which tools it queued, not that the tickets exist yet. If no tool has a target, point the user to the `note1-integrations` skill.

## Ticket suggestions

note1 may suggest linking an existing ticket or creating a new one for an item. `note1_decide_ticket_suggestion` takes `actionItemId` and `decision`: `link` (the matching existing ticket), `create` (a new ticket) or `dismiss`. It answers every pending suggestion on that item, one per connected tool. Ask the user which they want when it is not obvious. "Already handled" means someone decided it, so do not retry.

## Example requests

- "What are my open action items? Mark the deck one as done."
- "Mark the deck one as done and close its GitHub issue."
- "Add an action item for me: send the contract to Dana by Friday, under yesterday's sales call."
- "Reassign the pricing page task to sam@example.com."
- "Which of my open items look like they are already done?"
- "Retry sending the standup's action items to Linear."
