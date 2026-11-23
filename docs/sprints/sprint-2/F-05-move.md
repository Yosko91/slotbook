# F-05 Move a booking - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. |
| 1.1 | 23 Nov 2026 | Yohann MOSCATO, Heloise SAVOYE | Authors corrected: team document of both members (written by Heloise with AI assistance, reviewed and approved by Yohann in the PR). |

Linked requirements: FR-10, BR-09, BR-10, BR-14, BR-15. Uses the cancel logic of F-04.

## Feature design

Behavior. On the detail of his ACTIVE booking, a student clicks "Move to another slot". The page lists the available slots of the same schedule (same list as "Find a session", without the slot of the booking). He clicks "Move here" on one slot. In one step the old booking is cancelled and a new ACTIVE booking with the same topic is created on the new slot. The client opens the detail of the new booking with the message "Your booking is moved."

Workflow. The API checks session and role STUDENT, validates slotId (400), loads the booking (404 if not his), checks ACTIVE (409) and the 12 hours rule on the OLD slot (422). It loads the new slot (404 if unknown or removed), checks it is not the same slot (422), is in the same schedule (422) and starts in 1 hour or more (422). Then in ONE database transaction: lock the row of the student (`SELECT ... FOR UPDATE`, same lock as F-07), lock the new slot row, check again that the new slot has no ACTIVE booking (409), check that the new time does not overlap another ACTIVE booking of the student (409), cancel the old booking (`WHERE status = 'ACTIVE'`, 0 rows means it was cancelled meanwhile: 409), insert the new booking. If any step fails, nothing is changed: the old booking stays ACTIVE. If the partial unique index refuses the insert (another student was faster), the transaction is rolled back and the answer is 409 SLOT_TAKEN.

Business rules and validation.
- BR-15: move allowed only while the OLD slot starts in 12 hours or more.
- BR-10: the NEW slot must start in 1 hour or more.
- BR-09: the new slot must have no ACTIVE booking, in the code and with the index.
- BR-14: the new time must not overlap another ACTIVE upcoming booking of the student. The old booking is not counted (a move to a slot that overlaps only the old one is allowed).
- BR-13 (3 active bookings): a move does not change the number of active bookings, so it is allowed even with 3 active bookings.
- Same schedule only. A move to another subject is a new booking.
- The old booking gets cancelReason "Moved to another slot" and cancelledBy STUDENT.

Failure and boundary cases. Old slot in 11 h 59 min: 422. New slot in 59 min: 422. New slot = old slot: 422. New slot in another schedule: 422. New slot booked: 409 and old booking still ACTIVE. slotId missing or not an integer: 400. New slot removed (F-06): 404.

Permissions. Only the student of the booking. Other student: 404. Tutor: 403. Anonymous: 401.

Dependencies. F-03, F-04, F-07 (same lock and overlap rule).

## UI

Booking detail, button "Move to another slot" (same visibility rule as "Cancel booking" for a student). It shows a table (Date, Time, Length, Tutor, "Move here") with the available slots of the schedule, or "No other available slot for this schedule.". While the request runs all "Move here" buttons are disabled. A 409 or 422 is shown in the red box and the list is loaded again. Success navigates to /bookings/:newId with the green box "Your booking is moved."

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| POST /api/bookings/:id/move | { slotId: 15 } | 201 new booking (booking shape) with status ACTIVE and the same topic | 400 { error: "Validation failed", details: { slotId: "slotId is required" } }, 401, 403, 404 { error: "Booking not found" } or { error: "Slot not found" }, 409 SLOT_TAKEN / BOOKING_OVERLAP { error: "You already have a booking at this time", code: "BOOKING_OVERLAP" } / BOOKING_NOT_ACTIVE, 422 CHANGE_CLOSED { error: "You can move only until 12 hours before the start" } / SAME_SLOT { error: "This is already the slot of your booking" } / DIFFERENT_SCHEDULE { error: "You can move only to a slot of the same schedule" } / BOOKING_CLOSED |

## Data

No new column. Uses the columns of migration 4 for the old booking.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-28 | A student moves his ACTIVE booking (old slot in 12 hours or more) to an open slot of the same schedule: 201, a new ACTIVE booking with the same topic is stored, the old one is CANCELLED with reason "Moved to another slot", the old slot is available again and the new slot is not. |
| AC-29 | If the old slot starts in less than 12 hours the answer is 422 CHANGE_CLOSED and nothing changes. |
| AC-30 | A new slot in another schedule (422 DIFFERENT_SCHEDULE), the same slot (422 SAME_SLOT), a slot in less than 1 hour (422 BOOKING_CLOSED) or an unknown slot (404) is refused and nothing changes. |
| AC-31 | If the new slot is already booked the answer is 409 SLOT_TAKEN and the old booking is still ACTIVE (the move is all or nothing). |
| AC-32 | A new slot that overlaps another ACTIVE booking of the student gives 409 BOOKING_OVERLAP. A student who has 3 active bookings can still move one. |
| AC-33 | Another student gets 404, a tutor gets 403, anonymous gets 401, and nothing changes. |

Tests: TEST-40 to TEST-46 in sts.md.

## Definition of Done

Product DoD applies. Layers changed: UI (Booking detail), API (new endpoint). Data: no change.
