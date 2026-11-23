# F-04 Cancel a booking - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. |
| 1.1 | 23 Nov 2026 | Yohann MOSCATO, Heloise SAVOYE | Authors corrected: team document of both members (written by Heloise with AI assistance, reviewed and approved by Yohann in the PR). |

Linked requirements: FR-09, BR-15, BR-12. Part of R-01 (new access path).

## Feature design

Behavior. A student opens one of his bookings (Booking detail) and clicks "Cancel booking". He can write an optional reason and confirms. The booking becomes Cancelled, it stays in "My bookings" with the status Cancelled, and the slot is open again for other students. A tutor opens a booking of a schedule he manages (from the slot table in "My schedules") and clicks "Cancel booking". For a tutor the reason is required, because the student must know why (for example "Tutor is sick").

Workflow. The API checks the session (401), loads the booking with its slot and the tutors of its schedule. If the user is not the student of the booking and not a tutor of the schedule, the answer is 404 (same as Sprint 1 decision D-06). Then it checks the status (409 if not ACTIVE), the time rule of the role (422), the reason (400), and updates the booking in one statement `UPDATE ... WHERE id = :id AND status = 'ACTIVE'`. If two cancels arrive at the same time, the second updates 0 rows and gets 409. The slot is Open again automatically, because a slot is Booked only when it has an ACTIVE booking (Sprint 1 data rule).

Business rules and validation.
- BR-15: a student can cancel only while `slot.startsAt - now >= 12 hours`.
- A tutor can cancel until the slot starts (`now < slot.startsAt`). After the start the tutor records attendance instead (F-10).
- Reason: trimmed. For a tutor it is required, 5 to 200 characters. For a student it is optional, at most 200 characters, empty means no reason.
- The booking row is never deleted. We keep `cancelledAt`, `cancelReason` and `cancelledByRole` (STUDENT or STAFF) for the history and for the summary (F-11).

Failure and boundary cases. Student at 12 h 00 min before start: allowed. At 11 h 59 min: 422. Tutor 1 minute before start: allowed. Tutor after start: 422. Tutor reason of 4 characters: 400, 5 characters: ok, 201 characters: 400. Second cancel of the same booking: 409. Unknown id or id that is not a number: 404.

Permissions. Student: only his own booking. Tutor: only bookings of a schedule he manages. Other student, other tutor: 404 and nothing changed. Anonymous: 401.

Dependencies. F-03 (bookings exist). The partial unique index of BR-09 only looks at ACTIVE bookings, so after a cancel the slot can be booked again without a database change.

## UI

Booking detail (/bookings/:id): new rows "Cancelled on", "Cancelled by" (Student or Tutor) and "Reason" when the status is Cancelled. When the booking is ACTIVE and the action is allowed, a button "Cancel booking". It opens a small form: text area "Reason" (label "Reason (optional)" for a student, "Reason for the student" for a tutor), buttons "Confirm cancellation" and "Keep booking". The button is disabled while the request runs. A 400 is shown under the field. A 409 or 422 is shown in the red box. Success shows the green box "The booking is cancelled." and the page shows the new status.

For a student the button is hidden when the slot starts in less than 12 hours, and the page shows "You can cancel or move this booking until 12 hours before the start." The API still checks the rule, the UI is only a help.

My schedules (tutor): the Student column of a booked slot becomes a link to the booking detail, where the tutor can cancel.

My bookings: the Status column shows Active or Cancelled (already there in Sprint 1).

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| POST /api/bookings/:id/cancel | { reason?: string } | 200 booking (Sprint 1 shape) with status "CANCELLED", cancelledAt, cancelReason, cancelledBy ("STUDENT" or "STAFF") | 400 { error: "Validation failed", details: { reason } }, 401, 404 { error: "Booking not found" }, 409 { error: "This booking is not active", code: "BOOKING_NOT_ACTIVE" }, 422 { error: "You can cancel only until 12 hours before the start", code: "CANCEL_CLOSED" } (student), 422 { error: "The session has already started", code: "SLOT_STARTED" } (tutor) |

The booking shape of all booking endpoints gets four new fields: cancelledAt (null or date), cancelReason (null or text), cancelledBy (null, "STUDENT" or "STAFF") and attendance (null until F-10). Old clients ignore them.

Validation messages: "Reason must have 5 to 200 characters" (tutor), "Reason must have at most 200 characters" (student).

## Data

Migration 4 (`f04_f06_cancel_remove`, shared with F-06): Booking gets `cancelledAt TIMESTAMP(3) NULL`, `cancelReason TEXT NULL`, `cancelledByRole "Role" NULL`. No new index. The enum value CANCELLED exists since migration 3.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-22 | A student cancels his ACTIVE booking 12 hours or more before the start: 200, the row has status CANCELLED, cancelledAt and cancelledBy STUDENT, the slot is in the available list again, and the booking is still in My bookings with status Cancelled. |
| AC-23 | A student cancel less than 12 hours before the start gives 422 CANCEL_CLOSED and the booking stays ACTIVE. Exactly 12 hours is allowed. |
| AC-24 | A tutor of the schedule cancels with a reason of 5 to 200 characters: 200, cancelledBy STAFF and the reason are stored. No reason or a short reason gives 400. After the slot started it gives 422 SLOT_STARTED. |
| AC-25 | Cancelling a booking that is already CANCELLED gives 409 BOOKING_NOT_ACTIVE and nothing changes. |
| AC-26 | Another student or a tutor of another schedule gets 404 and the booking does not change. Anonymous gets 401. |
| AC-27 | After a cancel, another student can book the same slot (201), so the slot has again exactly one ACTIVE booking. |

Tests: TEST-32 to TEST-39 in sts.md.

## Definition of Done

Product DoD (docs/sprints/sprint-1/dod.md) applies. Layers changed: UI (Booking detail, My schedules link), API (new endpoint, booking shape), data (migration 4). No change to login or to slot creation.
