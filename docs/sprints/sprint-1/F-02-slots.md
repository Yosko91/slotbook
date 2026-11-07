# F-02 Tutor availability slots - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 5 Nov 2026 | Yohann, Heloise | First version, before implementation. |

Linked requirements: FR-04, FR-05, BR-04, BR-05, BR-06, BR-07, BR-08, BR-12, NFR-07. Part of R-01.

## Feature design

Behavior. A tutor logs in and arrives on "My schedules" (/staff). He sees the schedules he manages in a select. For the chosen schedule he sees the upcoming slots (not finished yet), sorted by start time, with the status Open or Booked. When a slot is booked he also sees the student name and the topic. With the form "Add a slot" he chooses a date, a start time and a length (30 or 60 min) and clicks "Add slot". The new slot appears in the table as Open.

Workflow. Tutor fills the form, client converts the Bangkok date and time to a UTC ISO string, POST to the API. The API checks the session and role, checks that the schedule exists and that the tutor manages it, validates the slot with the rules, checks overlap with the other slots of the same tutor, then inserts the slot.

Business rules and validation. BR-05: durationMinutes is 30 or 60, start minute is 0 or 30, seconds are 0. BR-06: in Bangkok time the slot starts at 08:00 or later and ends at 20:00 or earlier, same day. BR-07: startsAt is after now and not more than 60 days after now. BR-08: no other slot of the same tutor with start < new end and end > new start (touching is ok). BR-04: the tutor must be in ScheduleStaff for this schedule. The tutor of the slot is always the logged in user.

Failure and boundary cases. 07:30 refused, 08:00 ok. 19:30 with 30 min ok (ends 20:00), 19:30 with 60 min refused. Start in the past refused. Start exactly 60 days later ok, 60 days + 30 min refused. Slot 10:00-10:30 then 10:30-11:00 ok, 10:00-11:00 then 10:30-11:00 refused (409). Unknown schedule 404. Not managed schedule 403.

Permissions. Only STAFF. Student gets 403, anonymous gets 401.

Dependencies. F-01 (session and roles).

## UI

Page "My schedules": select of managed schedules, form (date input, start time select from 08:00 to 19:30 every 30 min, length select 30 or 60, button "Add slot"), table (Date, Time, Length, Status, Student, Topic). Field errors from the API (details) are shown under the fields, a 409 is shown in the red box. Empty table: "No upcoming slot. Add one with the form." If the tutor manages no schedule: "You are not assigned to any schedule yet."

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/staff/schedules | cookie | 200 [ { id, name, description } ] only managed schedules | 401, 403 |
| POST /api/staff/schedules/:id/slots | { startsAt: "2026-11-20T03:00:00.000Z", durationMinutes: 30 } | 201 { id, scheduleId, startsAt, endsAt, durationMinutes, tutor: { id, name }, status: "OPEN", booking: null } | 400 { error: "Validation failed", details: { startsAt or durationMinutes: message } }, 401, 403 { error: "You do not manage this schedule" }, 404 { error: "Schedule not found" }, 409 { error: "You already have a slot at this time", code: "SLOT_OVERLAP" } |
| GET /api/staff/schedules/:id/slots | cookie | 200 [ { id, startsAt, endsAt, durationMinutes, tutor, status: "OPEN" or "BOOKED", booking: null or { id, topic, student: { id, name, email } } } ] | 401, 403, 404 |

Validation messages: "Length must be 30 or 60 minutes", "Start time is required", "Start time must be on the hour or half hour", "Start time must be in the future", "Start time must be within the next 60 days", "The slot must be between 08:00 and 20:00 (Bangkok time)".

## Data

Tables Schedule, ScheduleStaff and Slot (migration 2). Check constraint endsAt > startsAt in SQL. Index (tutorId, startsAt). No change to User and Session. Seed: 3 schedules (Calculus I, Programming Fundamentals, Physics I), tutor assignments, and a few future slots.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-07 | A tutor creates a valid slot in a schedule he manages: API 201, the slot is stored with his id as tutor, and it is shown as Open in his table. |
| AC-08 | A length other than 30 or 60, or a start not on :00 or :30, gives 400 with a message for the field, and nothing is stored. |
| AC-09 | A start in the past or more than 60 days ahead gives 400 and nothing is stored. |
| AC-10 | A slot not fully inside 08:00 to 20:00 Bangkok time gives 400 (07:30 refused, 08:00 ok, 19:30 + 30 min ok, 19:30 + 60 min refused). |
| AC-11 | A slot that overlaps another slot of the same tutor gives 409 SLOT_OVERLAP. A slot that only touches another one is accepted. |
| AC-12 | A tutor cannot create or list slots in a schedule he does not manage (403). A student gets 403 on all /api/staff endpoints. Anonymous gets 401. |
| AC-13 | The slots list of a managed schedule shows each upcoming slot with Open or Booked, and for a booked slot the student name and topic. |

Tests: TEST-09 to TEST-19 in sts.md.
