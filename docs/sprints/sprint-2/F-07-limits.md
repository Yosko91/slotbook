# F-07 Booking limits - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. |

Linked requirements: BR-13, BR-14, NFR-04.

## Feature design

Behavior. When a student books (F-03) or moves (F-05), the API refuses the booking if he already has 3 active upcoming bookings, or if he already has an active booking at an overlapping time (in any schedule). The student sees the message in the red box of "Find a session".

Workflow. Inside the transaction of POST /api/bookings: lock the row of the student in User (`SELECT id FROM "User" WHERE id = :id FOR UPDATE`), then read his ACTIVE bookings whose slot has not ended, then check the limit and the overlap, then lock the slot and insert. Two requests of the same student wait for each other on this lock, so two parallel bookings cannot both pass the limit. We use a row lock and not a unique index, because "3 bookings" and "overlap" cannot be written as a simple unique index.

Business rules and validation.
- BR-13: count = ACTIVE bookings of the student whose slot starts after now. If count >= 3 the new booking is refused (422). Past and cancelled bookings do not count.
- BR-14: refused (409) if a booking of the student is ACTIVE and its slot overlaps the new slot (`a.start < b.end and b.start < a.end`, same function `overlaps` as BR-08). Touching slots (10:00-10:30 and 10:30-11:00) are allowed.
- Order of the checks: slot exists (404), booking time (422 BOOKING_CLOSED), slot free (409 SLOT_TAKEN), limit (422 BOOKING_LIMIT), overlap (409 BOOKING_OVERLAP).
- The pure rule is a function `checkStudentLimits(existing, newSlot, now)` in server/src/rules/bookingRules.ts, unit tested without database.

Failure and boundary cases. 2 active upcoming: the 3rd is ok. 3 active upcoming: the 4th is refused. 3 active but one is in the past: ok. 3 bookings with one CANCELLED: ok. Overlap in another schedule: refused. Touching: ok. Two parallel bookings of a student with 2 active bookings: exactly one 201.

Permissions. No new endpoint. Same as F-03.

## UI

Find a session: the 409/422 message is shown in the red box (existing behavior). New texts: "You already have 3 upcoming bookings. Cancel one before you book another." and "You already have a booking at this time".

## API

POST /api/bookings gets two new errors: 422 { error: "You already have 3 upcoming bookings. Cancel one before you book another.", code: "BOOKING_LIMIT" } and 409 { error: "You already have a booking at this time", code: "BOOKING_OVERLAP" }. POST /api/bookings/:id/move uses BOOKING_OVERLAP (F-05).

## Data

No change.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-38 | A student with 3 ACTIVE upcoming bookings gets 422 BOOKING_LIMIT for a 4th and nothing is stored. After he cancels one, he can book again. |
| AC-39 | Past bookings and CANCELLED bookings do not count for the limit. |
| AC-40 | A booking that overlaps an ACTIVE booking of the same student (also in another schedule) gives 409 BOOKING_OVERLAP. A booking that only touches is accepted. |
| AC-41 | When a student with 2 active bookings sends two bookings at the same time, exactly one gets 201 and he has 3 active bookings. |

Tests: TEST-52 to TEST-57 in sts.md.

## Definition of Done

Product DoD applies. Layers changed: API (rules in the booking transaction), UI texts only. Data: no change.
