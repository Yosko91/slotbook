# Sprint 1 Software Test Specification

Version 1.0, 5 November 2026. Levels: Unit (Vitest, no database), API (Vitest + Supertest on the real PostgreSQL database), E2E (Playwright, real browser, real API and database). Each API test creates its own users, schedule and slots, so tests do not depend on the seed and can run many times.

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API | Active student with known password | POST /api/auth/login | 200, body has id, name, email, role and no passwordHash, Set-Cookie slotbook.sid with HttpOnly |
| TEST-02 | AC-02 | API | Active user, wrong password | POST /api/auth/login | 401 "Invalid email or password", no Set-Cookie |
| TEST-03 | AC-02 | API | Email that does not exist | POST /api/auth/login | 401 with exactly the same message as TEST-02 |
| TEST-04 | AC-03 | API | Logged in user, then no cookie | GET /api/auth/me | 200 with the user and role, then 401 without cookie |
| TEST-05 | AC-04 | API | Logged in user | POST /api/auth/logout then GET /api/auth/me with the same cookie | 204, session row deleted, then 401 |
| TEST-06 | AC-05 | API | No cookie | GET /api/bookings/mine, GET /api/staff/schedules, POST /api/bookings | 401 each time, body has only "error" |
| TEST-07 | AC-06 | Unit + DB | User created with hashPassword (same function as the seed) | Read passwordHash from the database | Starts with $2, is not the plain password, bcrypt compare is true |
| TEST-08 | AC-01, AC-04 | E2E | Seeded student | Log in in the UI, check header, log out | Header shows name and Student, after logout the login page is shown |
| TEST-09 | AC-08 | Unit | durationMinutes 45, start at 10:15 | validateSlot | Errors on durationMinutes and on startsAt |
| TEST-10 | AC-09 | Unit | Start 1 hour in the past, start 60 days + 30 min ahead, start exactly 60 days ahead | validateSlot | Past and 60 days + 30 min refused, exactly 60 days accepted |
| TEST-11 | AC-10 | Unit | Bangkok 07:30, 08:00, 19:30 + 30, 19:30 + 60 | validateSlot | 07:30 and 19:30 + 60 refused, 08:00 and 19:30 + 30 accepted |
| TEST-12 | AC-11 | Unit | Pairs of time ranges | overlaps | Overlapping pair true, touching pair false |
| TEST-13 | AC-07 | API | Tutor manages schedule S | POST /api/staff/schedules/S/slots valid | 201, row in Slot with tutorId of the tutor, status OPEN |
| TEST-14 | AC-08, AC-09, AC-10 | API | Tutor manages S | POST with length 45, with past start, with 07:30 start | 400 with details, Slot count not changed |
| TEST-15 | AC-11 | API | Tutor has slot 10:00-11:00 | POST 10:30-11:00, then POST 11:00-11:30 | 409 SLOT_OVERLAP, then 201 |
| TEST-16 | AC-12 | API | Tutor does not manage schedule T | POST and GET on /api/staff/schedules/T/slots | 403, no slot created |
| TEST-17 | AC-12 | API | Student, then no cookie | POST /api/staff/schedules/S/slots | 403 for student, 401 for anonymous |
| TEST-18 | AC-13 | API | Slot booked by a student | GET /api/staff/schedules/S/slots | Slot has status BOOKED with student name and topic, other slot OPEN |
| TEST-19 | AC-07, AC-13 | E2E | Seeded tutor | Add a slot in the UI | Slot appears in the table with status Open |
| TEST-20 | AC-18 | Unit | Start in 59 min, 60 min, past | isBookingOpen | false, true, false |
| TEST-21 | AC-19 | Unit | Topic of 4, 5, 200, 201 characters and spaces only | validateTopic | 4, 201 and spaces refused, 5 and 200 accepted |
| TEST-22 | AC-14 | API | Schedule with open slot, booked slot, slot in 30 min | GET /api/schedules/S/available-slots | Only the open slot that starts in 1 hour or more |
| TEST-23 | AC-15 | API | Open slot, student | POST /api/bookings then GET /api/bookings/mine | 201, ACTIVE row in Booking, booking in /mine, slot not in available list |
| TEST-24 | AC-16 | API | Slot already booked by student A | Student B POST /api/bookings | 409 SLOT_TAKEN, only 1 active booking for the slot |
| TEST-25 | AC-17 | API | Open slot, students A and B | Two POST /api/bookings at the same time (Promise.all) | One 201 and one 409, 1 booking stored |
| TEST-26 | AC-18 | API | Slot that starts in 30 min, slot in the past (inserted directly) | POST /api/bookings | 422 BOOKING_CLOSED, nothing stored |
| TEST-27 | AC-19 | API | Open slot | POST with topic "abc", with slotId 999999 | 400 with details.topic, 404 "Slot not found" |
| TEST-28 | AC-20 | API | Booking of student A, tutor of S, tutor of other schedule | GET /api/bookings/:id as B, as tutor of S, as other tutor | 404 without booking fields, 200, 404 |
| TEST-29 | AC-21 | API | Tutor, then no cookie | POST /api/bookings | 403 then 401, nothing stored |
| TEST-30 | AC-14, AC-15, AC-20 | E2E | Tutor adds a slot | Student logs in, books it, opens My bookings, tutor logs in | Booking detail and My bookings show it, tutor table shows Booked with the student name |
| TEST-31 | AC-16 | E2E | Student opened Find a session, then another student booked the slot through the API | Student clicks Book and Confirm | Red box "This slot is already booked" |
| MC-01 | NFR-05 | Manual | A booking exists | Stop and start the API server, reload My bookings | The booking is still there |
