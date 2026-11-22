# F-11 Appointment summary - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. Status at the checkpoint of 29 Nov: planned (depends on F-10, which is implemented). |

Linked requirements: FR-15. Uses the data of F-04, F-05, F-06 and F-10.

## Feature design

Behavior. In My schedules, a third view "Summary". The tutor chooses a date range (default: the last 30 days) and sees five numbers for the schedule: Open, Booked, Cancelled, Attended, No-show.

Workflow and definitions. The API takes the slots of the schedule that start in the Bangkok days from..to and are not removed, and counts:
- Open: slots without ACTIVE booking.
- Booked: slots with an ACTIVE booking (past or future, with or without attendance).
- Cancelled: CANCELLED bookings of these slots (a move counts as one cancelled booking on the old slot).
- Attended / No-show: ACTIVE bookings with this attendance.
The counting is a pure function `summarize(slots)` in server/src/rules/summaryRules.ts, unit tested.

Business rules and validation. from and to are required, YYYY-MM-DD, from <= to, at most 92 days (same parser as F-08, plus the length check). Removed slots are not counted.

Permissions. Tutor of the schedule (else 403), student 403, anonymous 401.

## UI

"Summary" view: From and To date inputs, five number cards with the labels above, "No slot in this period." when all are 0.

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/staff/schedules/:id/summary?from=2026-11-01&to=2026-11-30 | cookie | 200 { from, to, open, booked, cancelled, attended, noShow } | 400 { error: "Validation failed", details }, 401, 403, 404 |

## Data

No change.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-60 | For a range with known slots and bookings, the five numbers are exactly the expected ones (definitions above). |
| AC-61 | Removed slots are not counted. A moved booking counts as 1 cancelled on the old slot and 1 booked on the new slot. |
| AC-62 | Missing date, bad date, from after to or more than 92 days gives 400. |
| AC-63 | Another tutor and a student get 403, anonymous 401. |

Tests (planned): TEST-84 to TEST-88 in sts.md.
