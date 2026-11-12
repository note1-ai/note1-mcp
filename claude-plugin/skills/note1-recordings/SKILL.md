---
name: note1-recordings
description: Record meetings with note1.ai and upload existing recordings through the note1 MCP server. Use when the user wants note1's bot to join a meeting, asks which calendar events are being recorded, wants a scheduling link with the bot pre-invited, needs to reschedule or cancel a recording, or wants to upload an audio or video file to be transcribed and summarized.
---

# note1 recordings

note1 records meetings with a bot that joins the call, and also accepts recordings the user already has. Every tool takes an optional `teamId` (omit it for the active team). note1 holds no calendar write access: these tools control note1's bot only and never create or change calendar events or invite anyone.

## Schedule the bot

`note1_schedule_recording` needs exactly one of:

- `calendarEventId` (from `note1_get_calendar`) to record an existing calendar event. Add `applyToSeries: true` to record every occurrence of a recurring event.
- `callUrl` to send the bot to any meeting link, with `callAt` (ISO start time, default now) and an optional `title`.

`callUrl` takes the meeting link. If the bot cannot join it, relay the error; the scheduling link below is limited to Google Meet and Teams.

Convert relative times ("3pm today") to an absolute ISO time with the user's time zone, and repeat the time back when you confirm. Reply with the `meetingId` and status it returns.

## Create a new meeting with the bot already invited

note1 cannot create calendar events. For "set up / book a meeting", call `note1_get_scheduling_link` with `platform` `meet` or `teams` (Zoom is not supported there; add an IANA `timezone`, default UTC). Give the user the returned link: they open it and create the event in their own calendar, with note1 pre-invited.

## Which events are recorded

`note1_get_calendar` lists events with their per-event recording status. It defaults to upcoming events; set `upcoming: false` for past ones and `limit` (1 to 100) to bound the list. Use it for "which of my meetings tomorrow are being recorded?" and to find a `calendarEventId`.

## Change or cancel

- `note1_update_meeting` changes the title, bot time (`callAt`, must be in the future) or link (`callUrl`), summary `style`, `language` and `recordVideo`. Time and link changes retarget note1's bot only, attendees' calendars are untouched. Pass at least one field. `applyToSeries: true` applies it to this and future occurrences.
- `note1_cancel_recording` calls off the bot. A meeting that goes unrecorded cannot be recorded afterwards, so confirm first. For a recurring meeting, ask whether to cancel only this occurrence or the series, and set `cancelSeries: true` only for the series.

State what changed once the call returns.

## Upload an existing recording

Only for a file the user already has (not for live meetings). The upload tools need the `meetings:write` scope and the **user's approval**. One upload becomes one private meeting; no bot is launched.

1. **Check the account and the limit.** Call `note1_get_account` when it is available (plan, what is left of this period's meeting allowance, size limit) and always call `note1_get_recording_upload_options`. It returns `maxSizeBytes`, the allowed `extensions`, a `connectivityCheckUrl` and a `browserUploadUrl`. Stop and tell the user if the file is too large, has the wrong type or the allowance is used up. No meeting is reserved yet.
2. **Choose the path before reserving.** Transfer directly (steps 3 to 8) only if you can read the file **and** a GET of `connectivityCheckUrl` succeeds from where the bytes will be sent, for example a chat attachment in Claude's code-execution sandbox. Otherwise call `note1_open_recording_upload` (optional `teamId`) and stop: in Claude web and desktop it shows an upload card where the user picks the file, edits the title and presses Upload, which is their approval and uses one allowance. The card reports the meeting link back to you. Opening it reserves nothing. Clients without cards get a `browserUploadUrl` to give the user.
3. **Ask for approval.** Initializing uses one meeting allowance, and cancelling or abandoning does not give it back. Say which file, which team and the title you will use.
4. **Reserve.** `note1_upload_recording` takes a fresh UUID `requestId`, `title`, `file: { name, size, mimeType? }` (the file's base name only, never a local path), optional `language` and `style`. It returns `uploadId`, `fileId`, and `transfer` with the method, a `urlTemplate`, headers and the exact `chunks` (`index`, `offset`, `size`). Never send bytes, base64 or paths through MCP arguments.
5. **Transfer outside MCP.** For each chunk, **POST** the exact slice (`offset`, `size`) to `urlTemplate` with only `{index}` replaced by the integer chunk index. Send the returned `Content-Type: application/octet-stream` and `X-Note1-Upload-Token` headers. Never put the upload token in a URL, and never print it in chat or logs. Retrying an identical chunk is safe and is not charged twice.
6. **Recover from a lost response.** `note1_get_recording_upload` (with `uploadId`) shows the acknowledged chunks and meeting state. To renew an expired permission (it lasts one hour), call `note1_upload_recording` again with the **same `requestId` and identical file metadata**. A new `requestId` would reserve another meeting.
7. **Complete.** When every chunk is acknowledged, call `note1_complete_recording_upload` with `uploadId` and `fileId`. It is safe to retry. Accepted does not mean ready: transcription and summary run afterwards, so use `note1_get_meeting` later and give the user the `meetingUrl`.
8. **Cancel** a pending upload only if the user asks: `note1_cancel_recording_upload`. If completion already won it returns a conflict; open the existing meeting instead of claiming it was canceled.

Keep the same resolved `teamId` on every call of one upload.

**Reserved but cannot finish the transfer?** Call `note1_open_recording_upload` with that `uploadId` so the user finishes it in the card with the same file, without using another allowance. Do not reserve a new upload: it would use another allowance.

**Client without cards?** Give the user the `browserUploadUrl` **before** reserving anything. They sign in, check the workspace and submit the file themselves. Opening the page creates nothing, the browser starts its own upload (it does not resume one you reserved), and finishing it does not notify the chat. Before switching from a direct upload to the browser, continue or cancel the existing reservation, since starting over uses another allowance.

## Example requests

- "Record my 3pm meeting: https://meet.google.com/abc-defg-hij"
- "Which of my meetings tomorrow are being recorded?"
- "Set up a Teams call with Sam on Friday and have note1 record it."
- "Move the bot for the vendor call to 4:30pm."
- "Stop recording the weekly sync from now on."
- "Upload ~/Recordings/interview.wav and summarize it."
- "Upload this attached recording."
- "I want to upload a recording of yesterday's call."
