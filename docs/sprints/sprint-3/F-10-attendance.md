# F-10 Attendance - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. Implemented first in Sprint 3 because F-11 needs it. |
| 1.1 | 23 Nov 2026 | Yohann MOSCATO, Heloise SAVOYE | Authors corrected: team document of both members (written by Heloise with AI assistance, reviewed and approved by Yohann in the PR). |

Linked requirements: FR-14, BR-17, BR-12. Part of R-01.

## Feature design

Behavior. In "My schedules" the tutor has two views: "Upcoming" (the Sprint 1 table) and "Past sessions". "Past sessions" lists the slots of the schedule that started in the last 30 days, newest first. A booked slot shows the student, the topic and the attendance. If the attendance is not recorded yet, the row has two buttons "Attended" and "No-show". After a click the row shows the result and the buttons disappear. The student sees the attendance on his booking detail and in My bookings.

Workflow. The API checks session and role STAFF, loads the booking with its slot and the tutors of the schedule. Not found or not a tutor of the schedule: 404 (like GET /api/bookings/:id, D-06). Booking not ACTIVE: 409. Slot not started: 422. Value not ATTENDED or NO_SHOW: 400. Then one statement `UPDATE ... SET attendance = :value WHERE id = :id AND attendance IS NULL AND status = 'ACTIVE'`. 0 rows means it was recorded before (409), so two tutors who click at the same time cannot both write.

Business rules and validation.
- BR-17: attendance only after the slot started (`slot.startsAt <= now`), and only once per booking. It cannot be changed after (a mistake is a defect to report, not a feature of this sprint).
- Only ACTIVE bookings. A cancelled booking has no attendance.
- The pure rules are `canRecordAttendance(startsAt, now)` and `parseAttendance(value)` in server/src/rules/attendanceRules.ts.
- A student cannot cancel or move a booking whose slot started (12 hours rule), and a tutor cannot cancel after the start (F-04), so attendance and cancellation never conflict.

Failure and boundary cases. Slot starts in 1 minute: 422. Slot started 1 minute ago: ok. Second record: 409. Value "attended" (lower case) or missing: 400. Booking of a schedule of another tutor: 404.

Permissions. Tutor of the schedule only. Other tutor 404, student 403, anonymous 401.

## UI

My schedules: two tabs (buttons) "Upcoming" and "Past sessions". Past table: Date, Time, Student, Topic, Attendance. Attendance column: "Attended", "No-show", buttons, or "-" for an open slot. Empty: "No past session in the last 30 days." Errors in the red box. Booking detail and My bookings: new row/column "Attendance" (Attended, No-show, or "Not recorded" once the slot started).

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| GET /api/staff/schedules/:id/slots?period=past | cookie | 200 [ slot ] started in the last 30 days, newest first, booking has attendance | 400 { error: "Validation failed", details: { period } } for another value, 401, 403, 404 |
| POST /api/staff/bookings/:id/attendance | { status: "ATTENDED" } or { status: "NO_SHOW" } | 200 booking (booking shape) with attendance and attendanceAt | 400 { error: "Validation failed", details: { status: "Status must be ATTENDED or NO_SHOW" } }, 401, 403, 404 { error: "Booking not found" }, 409 { error: "Attendance is already recorded", code: "ATTENDANCE_RECORDED" } or BOOKING_NOT_ACTIVE, 422 { error: "Attendance can be recorded only after the start", code: "ATTENDANCE_TOO_EARLY" } |

The booking shape gets `attendance` (null, "ATTENDED", "NO_SHOW") and `attendanceAt`. The slot shape of the tutor gets `booking.attendance`.

## Data

Migration 5 (`f10_attendance`): enum `Attendance` (ATTENDED, NO_SHOW), Booking gets `attendance "Attendance" NULL` and `attendanceAt TIMESTAMP(3) NULL`. The seed adds one past booked slot (yesterday) for the demo, created only if it does not exist.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-55 | The tutor gets the slots of his schedule that started in the last 30 days, newest first, with the booking and its attendance. Upcoming slots are not in this list. |
| AC-56 | The tutor records ATTENDED or NO_SHOW for an ACTIVE booking whose slot started: 200, attendance and attendanceAt are stored, and the student sees the value on his booking. |
| AC-57 | Before the start the answer is 422 ATTENDANCE_TOO_EARLY. A value other than ATTENDED or NO_SHOW gives 400. Nothing is stored. |
| AC-58 | A second record gives 409 ATTENDANCE_RECORDED and the first value stays. Two records at the same time give one 200 and one 409. A CANCELLED booking gives 409 BOOKING_NOT_ACTIVE. |
| AC-59 | A tutor of another schedule gets 404, a student 403, anonymous 401. |

Tests: TEST-77 to TEST-83 in sts.md.

## Definition of Done

Product DoD applies. Layers changed: UI (My schedules, Booking detail, My bookings), API (new endpoint, period parameter, shapes), data (migration 5, seed).
