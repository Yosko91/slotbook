# F-08 Filter availability - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. |
| 1.1 | 23 Nov 2026 | Yohann MOSCATO, Heloise SAVOYE | Authors corrected: team document of both members (written by Heloise with AI assistance, reviewed and approved by Yohann in the PR). |

Linked requirements: FR-12, NFR-07.

## Feature design

Behavior. In "Find a session", under the subject select, the student has three filters: "From" (date), "To" (date) and "Tutor" (All tutors, or one tutor of the schedule). The list is loaded again when a filter changes. "Clear filters" resets them. When nothing matches: "No available slot for these filters."

Workflow. The client sends the filters as query parameters. The API validates them (400 with details), converts the Bangkok days to UTC (from = day 00:00 Bangkok, to = next day 00:00 Bangkok, so "to" is inclusive), and adds them to the Sprint 1 query (open, not removed, starts in 3 hours or more since CH-09).

Business rules and validation.
- from and to: format YYYY-MM-DD and a real date, both optional. If both are given, from <= to.
- tutorId: optional positive integer. A tutor that is not in the schedule just gives an empty list (no error, no information leak).
- Days are Bangkok days (NFR-07, A-02, UTC+7).
- The pure function is `parseAvailabilityFilter(query)` in server/src/rules/filterRules.ts.

Failure and boundary cases. from = to = a day: only the slots of that Bangkok day, also a slot at 08:00 Bangkok (01:00 UTC) and at 19:30. "2026-13-01" or "2026-02-30": 400. from after to: 400. tutorId "abc" or 0: 400.

Permissions. Same as Sprint 1 available slots: any logged in user (401 for anonymous). GET /api/schedules/:id/tutors: same.

## UI

Find a session: a row of filters (From date input, To date input, Tutor select, "Clear filters" button). An API 400 is shown in the red box. All filters stay when the student books and the list is reloaded.

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/schedules/:id/available-slots | query: from=2026-11-25, to=2026-11-27, tutorId=3 (all optional) | 200 same shape as Sprint 1 | 400 { error: "Validation failed", details: { from, to, tutorId } }, 401, 404 |
| GET /api/schedules/:id/tutors | cookie | 200 [ { id, name } ] sorted by name | 401, 404 { error: "Schedule not found" } |

Messages: "Date must be in the format YYYY-MM-DD", "From must be before or equal to To", "tutorId must be a positive integer".

## Data

No change. The index (scheduleId, startsAt) of Sprint 1 is used by the date filter.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-42 | from and to keep only the slots whose start is in the Bangkok days from..to (inclusive), still only open slots that start in 3 hours or more (CH-09). |
| AC-43 | tutorId keeps only the slots of this tutor. GET /api/schedules/:id/tutors gives the tutors of the schedule. |
| AC-44 | A bad date, from after to, or a bad tutorId gives 400 with details. A tutor not in the schedule gives an empty list. |
| AC-45 | In the UI the student filters by tutor and by date, sees only matching slots, and "Clear filters" shows all slots again. |

Tests: TEST-58 to TEST-62 in sts.md.

## Definition of Done

Product DoD applies. Layers changed: UI (Find a session), API (query parameters, new tutors endpoint). Data: no change.
