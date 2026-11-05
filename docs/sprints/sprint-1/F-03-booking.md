# F-03 Book a tutoring slot - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 5 Nov 2026 | Yohann, Heloise | First version, before implementation. |

Linked requirements: FR-06, FR-07, FR-08, BR-09, BR-10, BR-11, BR-12, NFR-04. Part of R-01.

## Feature design

Behavior. A student logs in and arrives on "Find a session" (/slots). He chooses a schedule (subject). The page lists the slots he can still book: not booked, starting in 1 hour or more, sorted by time, with the tutor name. He clicks "Book", writes a topic (for example "Integration by parts, exercise 3") and clicks "Confirm booking". The API creates the booking and the client opens the booking detail. The page "My bookings" lists all his bookings. The tutor of the schedule sees the booking in his table (F-02).

Workflow of a booking. The API checks session and role (STUDENT), validates slotId and topic, loads the slot (404 if not found), checks the time limit (422 if less than 1 hour before start), checks that no active booking exists (409), then inserts the booking. If two requests pass the check at the same time, the partial unique index refuses the second insert and the API answers 409 too.

Business rules and validation. BR-09: one ACTIVE booking per slot, in the code and in the database. BR-10: booking allowed only if startsAt - now is 60 minutes or more. BR-11: topic is trimmed, 5 to 200 characters. BR-12: a student only sees his bookings. A tutor sees a booking only if he manages the schedule of the slot.

Failure and boundary cases. Slot starting in 59 minutes refused, 60 minutes ok. Past slot refused (422). Topic of 4 characters refused, 5 ok, 200 ok, 201 refused. Unknown slotId 404. Same student booking the same slot again: 409. Two students at the same time: one 201, one 409.

Permissions. Booking and /mine only for STUDENT (tutor 403). GET /api/bookings/:id for the owner student or a tutor of the schedule, all others get 404. Anonymous 401.

Dependencies. F-01, F-02 (slots must exist).

## UI

"Find a session": select of schedules, table (Date, Time, Length, Tutor, Book button). Clicking Book shows under the row a topic text area with a counter and "Confirm booking" and "Cancel". 409 or 422 shows the API message in the red box and reloads the list. "My bookings": table (Date, Time, Subject, Tutor, Topic, Status, View). Empty: "You have no booking yet." "Booking detail": subject, tutor, date, time, length, topic, status, booked on.

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/schedules | cookie | 200 [ { id, name, description } ] active schedules | 401 |
| GET /api/schedules/:id/available-slots | cookie | 200 [ { id, startsAt, endsAt, durationMinutes, tutor: { id, name } } ] | 401, 404 { error: "Schedule not found" } |
| POST /api/bookings | { slotId: 12, topic: "Integration by parts" } | 201 { id, status: "ACTIVE", topic, createdAt, student: { id, name }, slot: { id, startsAt, endsAt, durationMinutes, schedule: { id, name }, tutor: { id, name } } } | 400 { error: "Validation failed", details: { slotId or topic } }, 401, 403, 404 { error: "Slot not found" }, 409 { error: "This slot is already booked", code: "SLOT_TAKEN" }, 422 { error: "Booking is closed for this slot (less than 1 hour before the start)", code: "BOOKING_CLOSED" } |
| GET /api/bookings/mine | cookie | 200 [ booking ] sorted by slot start | 401, 403 |
| GET /api/bookings/:id | cookie | 200 booking | 401, 404 { error: "Booking not found" } |

Validation messages: "slotId is required", "Topic must have 5 to 200 characters".

## Data

Table Booking and enum BookingStatus (ACTIVE, CANCELLED) in migration 3. CANCELLED is not used before Sprint 2 but we add it now so the unique index is already right. Partial unique index "Booking_one_active_per_slot" on Booking(slotId) WHERE status = 'ACTIVE', written in SQL. Index on studentId.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-14 | The available slots of a schedule contain only slots without active booking that start in 1 hour or more, sorted by start, with the tutor name. |
| AC-15 | A student books an available slot with a valid topic: API 201, an ACTIVE booking is stored, the slot is not in the available list anymore, and the booking is in My bookings and in the tutor table. |
| AC-16 | Booking a slot that already has an active booking gives 409 SLOT_TAKEN, and still only one active booking exists for the slot. |
| AC-17 | When two students send a booking for the same slot at the same time, exactly one gets 201 and the other gets 409, and one booking is stored. |
| AC-18 | A slot that starts in less than 1 hour, or is in the past, gives 422 BOOKING_CLOSED and nothing is stored. |
| AC-19 | A topic shorter than 5 or longer than 200 characters gives 400 and nothing is stored. An unknown slot gives 404. |
| AC-20 | A student sees only his own bookings. GET of another student's booking gives 404 without booking data. A tutor gets 200 for a booking of a schedule he manages and 404 for other schedules. |
| AC-21 | A tutor cannot book (POST /api/bookings gives 403) and anonymous gets 401. |

Tests: TEST-20 to TEST-31 in sts.md.
