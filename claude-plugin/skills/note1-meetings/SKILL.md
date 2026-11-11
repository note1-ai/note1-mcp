---
name: note1-meetings
description: Find, read and cite note1.ai meetings through the note1 MCP server. Use when the user asks what was said or decided in meetings, wants a meeting summary, transcript, export or participants, asks who spoke the most or what questions were asked, or wants to list meetings by date or status. Covers search versus analysis mode, source citations, get versus export, insights, teams and private meetings.
---

# note1 meetings

note1.ai records meetings, transcribes them and writes summaries and action items. You reach a user's meetings through the note1 MCP tools. Every tool acts with the signed-in user's own permissions.

## Pick the right tool

- **A question about content** ("what did we decide about pricing?"): `note1_search_meetings` with `mode: "analysis"`. It returns an `answer` plus the `matches` it is based on.
- **Finding where something was said**: `note1_search_meetings` with the default `mode: "search"`. It returns ranked snippets. Narrow with `kind` (`title`, `summary`, `transcript`, `action_item`, `topic`, `question`) when the user names one.
- **Browsing** ("meetings last week", "failed recordings"): `note1_list_meetings` with `callAtAfter`, `callAtBefore` (ISO dates, the latter exclusive) and `status` (comma list such as `scheduled,ready,failed`). Use `mine: true` for meetings the user took part in and `sameSeriesAs` with a meeting id for other occurrences of a recurring meeting. Results are paged: pass the returned `nextPage` as `page` to continue, and keep going until the user has what they asked for.
- **One meeting**: `note1_get_meeting` returns the summary, sections, participants, status, the recurring series (previous and next occurrence) and the link. Prefer it for "summarize the meeting".
- **Full content or a document to save**: `note1_export_meeting` with `content` (`summary`, `transcript` or `both`) and `format` (`markdown` or `json`). Use it for verbatim quotes or paste-ready text. Do not export a transcript to answer a question search can answer.
- **Who spoke, what was asked, topics, tracker hits, highlights**: `note1_get_meeting_insights` with `kind` (`speakers`, `questions`, `topics`, `trackers`, `highlights`, `all`). Never read the transcript for "who spoke the most" or "which questions went unanswered".

## Always cite sources

Search matches carry `meetingId`, `title`, `date`, `timestamp` and a `snippet`. When you state a fact from a meeting, name the meeting title, its date and the timestamp, and link it: `https://note1.ai/dashboard/meeting/<meetingId>` (`note1_get_meeting` also returns the exact `url`). Quote the snippet, do not paraphrase it into something stronger. If the matches do not support an answer, say so instead of guessing, and offer to search with other words or another `kind`.

## Long transcripts

An export of a long transcript is cut into pages. When the result ends with a note that the transcript continues from a timestamp, the rest is not in your answer yet. Pass that timestamp as `from` if `note1_export_meeting` lists that argument. If it does not, say the export was cut, use `note1_search_meetings` or `note1_get_meeting_insights` to reach the part the user needs, and point them to the meeting link for the full transcript. Never present a cut transcript as complete.

## Teams

Every tool takes an optional `teamId`. Omit it and the user's active team is used. When the user names another team or workspace, pass its `teamId` (`note1_get_account` lists their teams when it is available). Meeting ids belong to a team: use the same `teamId` for every related call about that meeting, and when a meeting is "not found" consider that it may sit in another team before concluding it does not exist.

## Private meetings

Results match exactly what the user sees in the note1 dashboard. A meeting you cannot find may be private to someone else, so an empty result means "not visible to you", not "it did not happen". Do not try to work around access. In an export, the header says whether the user spoke in the meeting, and the transcript marks their own lines "(you)".

## Example requests

- "What did we decide about pricing in last week's meetings?"
- "Export yesterday's standup transcript as markdown."
- "Who spoke the most in Monday's planning meeting, and which questions went unanswered?"
- "List my failed recordings from this month."
- "Summarize all my meetings with the design team since the first of the month, with links."
