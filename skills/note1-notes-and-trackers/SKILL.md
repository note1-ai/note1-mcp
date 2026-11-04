---
name: note1-notes-and-trackers
description: Read and edit note1.ai meeting notes and agendas, and manage topic trackers, through the note1 MCP server. Use when the user wants to see, add to or rewrite the notes or shared agenda of a meeting, prepare talking points, or asks to track, watch, rename or stop tracking a phrase or topic across meetings.
---

# note1 notes and topic trackers

Every tool takes an optional `teamId` (omit it for the active team) and acts with the signed-in user's own permissions.

## Meeting notes and agenda

A meeting has two layers of notes:

- **Personal notes**: talking points and reminders, private to the user.
- **Shared agenda**: visible to the people in the meeting.

`note1_get_meeting_notes` (with `meetingId`) returns both. Every block has a `ref`. Find the `meetingId` first with `note1_search_meetings`, `note1_list_meetings` or `note1_get_calendar` when the user did not give one.

### Edit

**Always read first** with `note1_get_meeting_notes`, then merge into what is already there. Then call `note1_update_meeting_notes`:

- `scope`: `personal` (default) or `shared`. Shared edits change what other people see and need edit access to the meeting. Use `shared` only when the user says agenda, shared or team notes, and mention that others will see it. If it is refused for lack of access, say so and offer to put it in their personal notes instead.
- `operations` (up to 60), each with `op` of `insert`, `update` or `delete`:
  - `update` and `delete` target a block by `ref` from the read.
  - `insert` places a block `after` a ref (or `"start"` / `"end"`), or `under` a heading's name so it lands at the end of that section (the heading is created when missing). `type` is one of `p`, `h2`, `bullet`, `number`, `todo`, `quote`, `code`, and defaults to `bullet`. `checked` is for `todo`.
- `replaceWith`: markdown that replaces **every** block. Use it only when the user asked to rewrite everything, and show or summarize what will be lost first. Prefer operations otherwise.

Use either `operations` or `replaceWith` in one call. After the call, tell the user what changed, and read the notes again before a second edit rather than reusing old refs.

## Topic trackers

A topic tracker is a named set of phrases note1 watches for across meetings. Each phrase is `broad` (matches variations) or `exact` (the words as written).

- **See what exists and what came up**: `note1_list_topic_trackers`. Optional `name` filter and `limit` (1 to 100, default 30 mentions). It returns the trackers the user can see and recent mentions with quotes, newest first. For a meeting-level view use `note1_get_meeting_insights` with `kind: "trackers"`.
- **Check before creating.** List trackers first. If one already covers the topic, extend it with `note1_update_topic_tracker` instead of creating a duplicate.
- **Create**: `note1_create_topic_tracker` with `name` and up to 40 `phrases`. It is **personal by default**. `scope: "team"` makes it visible to the whole workspace and takes a team admin, so use it only when the user asks for a team tracker, and if it is refused tell them an admin has to create it.
- **Update**: `note1_update_topic_tracker` takes `tracker` (id or exact name) and any of `name`, `addPhrases` and `removePhrases`.
- **Delete**: `note1_delete_topic_tracker`. It stops watching the phrases for good, so confirm the tracker name with the user before calling it. Do not delete to "tidy up" unless asked.

## Example requests

- "Show me my notes for the 2pm product review."
- "Add a talking point to my notes for tomorrow's board meeting: ask about the Q4 hiring plan."
- "Add 'Decide on vendor' as a todo to the shared agenda of Friday's planning meeting."
- "Start tracking mentions of pricing and discount across our meetings."
- "Where did 'churn' come up this week?"
- "Add 'renewal' to my pricing tracker and rename it to 'Pricing and renewals'."
