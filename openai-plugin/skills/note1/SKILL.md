---
name: note1
description: Use note1 tools to answer questions about the user's meetings, manage action items and trackers, and schedule or upload recordings, citing meeting sources and asking before destructive actions.
---

# note1

note1 records meetings, transcribes them and writes summaries and action items. These tools reach the signed-in user's own meetings. Every tool acts with that user's permissions, so private meetings stay private and results match the note1 dashboard. Every tool takes an optional `teamId`; omit it for the active team, and reuse the same `teamId` for all calls about one meeting.

## Pick the right tool

- **A question about content** ("what did we decide about pricing?"): `note1_search_meetings` with `mode: "analysis"`. It returns an answer plus the matches it is based on. Use the default `mode: "search"` to find where something was said.
- **Browsing by date or status**: `note1_list_meetings`. Results are paged, newest first; pass the returned `nextPage` as `page` to continue.
- **One meeting**: `note1_get_meeting` for the summary, sections, participants and link. `note1_export_meeting` only when the user wants verbatim text or a document to save.
- **Who spoke, what was asked, topics, tracker hits**: `note1_get_meeting_insights`. Use insights instead of reading the transcript.
- **Which meetings are being recorded**: `note1_get_calendar`.

## Cite your sources

When you state a fact from a meeting, name the meeting title, its date and the timestamp, and link it as `https://note1.ai/dashboard/meeting/<meetingId>`. Quote snippets instead of paraphrasing them into something stronger. If the matches do not support an answer, say so, and offer to search with other words. An empty result means "not visible to you", not "it did not happen".

## Action items and trackers

- `note1_list_action_items` returns open items by default (`mine: true` for the user's own). Each has an id, owner, status, `linkedTickets` and sometimes `possiblyDone`. Treat `possiblyDone` as a proposal: show the quote and ask before marking anything done.
- `note1_create_action_item` and `note1_update_action_item` change one item per call. For a bulk change, list the matching items, tell the user the count, and wait for a yes first.
- Completing an item applies each connected tool's "done in note1" setting to its linked tickets. If the result says tickets wait for a decision, ask the user and only then call again with `closeLinkedTickets: true`.
- Before creating a topic tracker, check `note1_list_topic_trackers` and extend an existing one instead of duplicating it. Trackers are personal by default; team trackers need a team admin.

## Ask before anything destructive

Confirm with the user, naming the exact item, before you:

- close linked tickets (`closeLinkedTickets: true`),
- cancel a recording or a series (`note1_cancel_recording`),
- delete a topic tracker (`note1_delete_topic_tracker`),
- disconnect an integration (`note1_disconnect_integration`, which needs `confirmed: true` only after the user agreed),
- replace all notes with `replaceWith` in `note1_update_meeting_notes`, or edit the shared agenda that others see.

Changing integrations is limited to team admins. Never ask the user to paste a Motion API key into chat; `note1_connect_integration` sends them to the dashboard for Motion instead. When `note1_list_integrations` shows `canManage: false`, tell the user an admin has to do it.

## Recordings

- `note1_schedule_recording` sends note1's bot to a calendar event or a meeting link. `note1_get_scheduling_link` returns a prefilled Google Meet or Teams calendar link that the user opens themselves. note1 holds no calendar write access and never creates calendar events.
- To upload an existing recording: check `note1_get_account` and `note1_get_recording_upload_options`. Transfer directly only if you can read the file and a GET of the returned `connectivityCheckUrl` succeeds from where the bytes will be sent: ask the user for approval (a reservation uses one meeting allowance), reserve with `note1_upload_recording`, transfer the file bytes outside MCP with an HTTP client, then call `note1_complete_recording_upload`. If a call fails and you retry `note1_upload_recording`, reuse the same `requestId` and identical file metadata so no second meeting is reserved. Never send file bytes, base64, local paths or the upload token through tool arguments or into chat. Otherwise, before reserving anything, call `note1_open_recording_upload`: it shows an upload card where the user picks the file and presses Upload (pass `title`, `language` or `style` only when the user mentioned them or they are obvious, otherwise the user picks them in the card), or returns a browser link to give the user in clients without cards. If you reserved but cannot finish the transfer, call `note1_open_recording_upload` with that `uploadId` instead of reserving again.
- Accepted does not mean ready: use `note1_get_meeting` later for the result.

## Example requests

- "What did we decide about pricing in last week's meetings?"
- "What are my open action items from this week's meetings?"
- "Who spoke the most in yesterday's standup?"
- "Which of my meetings tomorrow are being recorded?"
- "Start tracking mentions of renewals across our meetings."
