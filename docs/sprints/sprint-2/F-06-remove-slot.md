# F-06 Remove an open slot - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. |

Linked requirements: FR-11, BR-16, BR-04, BR-08. Part of R-01.

## Feature design

Behavior. In "My schedules", an Open slot that has not started has a "Remove" button. The tutor clicks it and confirms ("Remove this slot?" with "Yes, remove" and "No"). The slot disappears from his table and from the available slots of the students.

Workflow. The API checks session and role STAFF (requireRole), loads the slot with the tutors of its schedule. Unknown or already removed slot: 404. Tutor not in the schedule: 403 (same as the slot endpoints of Sprint 1). Slot already started: 422. Then in one transaction: lock the slot row (`SELECT ... FOR UPDATE`), count the ACTIVE bookings (409 if one exists), set `removedAt = now()`. The booking endpoints lock the same slot row before they insert, so a student cannot book the slot between the check and the remove.

Why a soft delete. A slot that had a cancelled booking must keep its history for the summary (F-11). If we delete the row, the cascade deletes the cancelled bookings too. So we set `removedAt` and all slot queries ignore removed slots.

Business rules and validation.
- BR-16: a slot can be removed only if it has no ACTIVE booking. Cancelled bookings do not block.
- A slot that already started cannot be removed (it is history).
- BR-04: only a tutor of the schedule of the slot.
- BR-08: a removed slot does not count for the overlap check, so the tutor can create a new slot at the same time after.

Failure and boundary cases. Booked slot: 409. Slot whose only booking is CANCELLED: 204. Slot started 1 minute ago: 422. Second remove of the same slot: 404. Slot id not a number: 404.

Permissions. Tutor of the schedule only. Other tutor: 403. Student: 403. Anonymous: 401.

## UI

My schedules: new last column with a "Remove" button only for Open slots (Booked slots show nothing). Confirmation inside the row. While it runs the button shows "Removing...". Success: green box "Slot removed." and the table is loaded again. A 409 (a student just booked it) is shown in the red box and the table is loaded again.

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| DELETE /api/staff/slots/:id | cookie | 204 | 401, 403 { error: "You do not manage this schedule" }, 404 { error: "Slot not found" }, 409 { error: "This slot has an active booking. Cancel the booking first.", code: "SLOT_HAS_BOOKING" }, 422 { error: "This slot has already started", code: "SLOT_STARTED" } |

Changed: GET /api/staff/schedules/:id/slots, GET /api/schedules/:id/available-slots, POST /api/bookings, POST /api/staff/schedules/:id/slots (overlap check) ignore slots with removedAt.

## Data

Migration 4 (`f04_f06_cancel_remove`): Slot gets `removedAt TIMESTAMP(3) NULL`.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-34 | A tutor removes an Open future slot of his schedule: 204, removedAt is set, the slot is not in his table, not in the available slots, and POST /api/bookings on it gives 404. |
| AC-35 | A slot with an ACTIVE booking gives 409 SLOT_HAS_BOOKING and stays. A slot with only a CANCELLED booking can be removed. |
| AC-36 | A slot that has started gives 422 SLOT_STARTED. |
| AC-37 | A tutor who does not manage the schedule gets 403, a student 403, anonymous 401, an unknown or removed slot 404. After a remove, the tutor can create a new slot at the same time (201). |

Tests: TEST-47 to TEST-51 in sts.md.

## Definition of Done

Product DoD applies. Layers changed: UI (My schedules), API (new endpoint, filters on existing queries), data (migration 4).
