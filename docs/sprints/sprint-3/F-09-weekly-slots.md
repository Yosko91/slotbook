# F-09 Weekly slots - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. Status at the checkpoint of 29 Nov: planned. |

Linked requirements: FR-13, BR-04 to BR-08.

## Feature design

Behavior. In the "Add a slot" form of My schedules, a new field "Repeat every week" (No, or 2 to 8 weeks). With N weeks the tutor creates N slots: the same weekday, start time and length, one per week starting from the chosen date.

Workflow. The API validates the input, builds the N dates (date + 7 days x k, in Bangkok time, so always the same local time, A-02), checks EVERY slot with `validateSlot` (BR-05 to BR-07) and with the overlap check (BR-08, against the existing slots and against the other slots of the series). If one week fails, nothing is created (one transaction) and the answer lists the failed weeks. Else all N slots are created.

Business rules. weeks is an integer from 2 to 8. Every slot must respect BR-05 to BR-08. The last slot must be within 60 days (BR-07), so 8 weeks from a date more than 11 days ahead fails. All or nothing, so the tutor never gets half a series without knowing it.

Permissions. Same as F-02: tutor of the schedule (else 403), student 403, anonymous 401.

## UI

"Repeat every week" select (No, 2 ... 8 weeks). Success: "4 slots added, every Tuesday at 10:00." Failure: the red box with the API message and the list of the refused dates and their reason.

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| POST /api/staff/schedules/:id/slots/weekly | { startsAt, durationMinutes, weeks: 4 } | 201 [ slot ] (N slots, sorted) | 400 { error: "Validation failed", details: { weeks } } or { error: "Some weeks are not valid", weeks: [ { week: 3, startsAt, error } ] }, 401, 403, 404, 409 { error: "Some weeks overlap your slots", code: "SLOT_OVERLAP", weeks: [ ... ] } |

## Data

No change (N normal Slot rows).

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-51 | With weeks = 4 the tutor gets 4 slots at the same Bangkok weekday and time, 7 days apart, all Open. |
| AC-52 | If one week breaks a slot rule (BR-05 to BR-07) or overlaps (BR-08), no slot is created and the answer lists the refused weeks. |
| AC-53 | weeks smaller than 2, bigger than 8 or not an integer gives 400. |
| AC-54 | Same permissions as F-02 (403 for another tutor or a student, 401 anonymous). |

Tests (planned): TEST-72 to TEST-76 in sts.md.
