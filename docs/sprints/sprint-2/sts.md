# Sprint 2 Software Test Specification

Version 1.0, 22 November 2026, written before the implementation. Same levels and rules as Sprint 1: Unit (Vitest, no database), API (Vitest + Supertest on the real PostgreSQL database, each test file creates its own users, schedules and slots), E2E (Playwright on the seeded database), CI (GitHub Actions), Manual (MC). Test IDs continue after Sprint 1 (TEST-01 to TEST-31, MC-01).

The test name in the code starts with the test ID, so `npm test -- -t TEST-34` runs one test and the output can be matched to this table.

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-32 | AC-23 | Unit | Slot start in 12 h 00, 11 h 59, in the past | canChangeBooking | true, false, false |
| TEST-33 | AC-24 | Unit | Tutor reason of 4, 5, 200, 201 characters, spaces; student reason empty and 201 characters | validateReason | Tutor: 4, 201, spaces refused, 5 and 200 ok. Student: empty ok (null), 201 refused |
| TEST-34 | AC-22 | API | ACTIVE booking of student A, slot in 2 days | POST /api/bookings/:id/cancel as A, then GET /mine and available slots | 200 status CANCELLED, row has cancelledAt and cancelledByRole STUDENT, slot is available again, /mine shows CANCELLED |
| TEST-35 | AC-23 | API | ACTIVE booking, slot in 11 hours (inserted directly) | POST cancel as the student | 422 CANCEL_CLOSED, row still ACTIVE |
| TEST-36 | AC-24 | API | ACTIVE booking in a schedule of tutor T; second booking whose slot started 10 min ago | POST cancel as T with no reason, with "Tutor is sick", then on the started slot | 400 details.reason; 200 cancelledBy STAFF and reason stored; 422 SLOT_STARTED |
| TEST-37 | AC-25 | API | CANCELLED booking | POST cancel again | 409 BOOKING_NOT_ACTIVE |
| TEST-38 | AC-26 | API | ACTIVE booking of student A | POST cancel as student B, as tutor of another schedule, without cookie | 404, 404, 401, row still ACTIVE |
| TEST-39 | AC-27 | API | Booking of A cancelled | Student B POST /api/bookings on the same slot | 201, exactly 1 ACTIVE booking for the slot |
| TEST-40 | AC-28 | API | ACTIVE booking of A on slot S1 (in 2 days), open slot S2 same schedule | POST /api/bookings/:id/move { slotId: S2 } | 201 new ACTIVE booking on S2 with same topic; old row CANCELLED with reason "Moved to another slot"; S1 available, S2 not |
| TEST-41 | AC-29 | API | Booking on a slot in 11 hours | POST move | 422 CHANGE_CLOSED, nothing changed |
| TEST-42 | AC-30 | API | Booking on S1; slot of another schedule; S1 itself; slot in 30 min; id 999999 | POST move to each | 422 DIFFERENT_SCHEDULE, 422 SAME_SLOT, 422 BOOKING_CLOSED, 404; booking still ACTIVE on S1 |
| TEST-43 | AC-31 | API | Booking of A on S1, S2 booked by B | POST move to S2 as A | 409 SLOT_TAKEN, A's booking still ACTIVE on S1, B still owns S2 |
| TEST-44 | AC-32 | API | A has bookings on S1 and on X (other schedule, 10:00-11:00), S2 at 10:30 same schedule as S1 | POST move S1 to S2 | 409 BOOKING_OVERLAP, nothing changed |
| TEST-45 | AC-32 | API | A has 3 ACTIVE upcoming bookings | POST move one of them to an open slot | 201 and still 3 ACTIVE bookings |
| TEST-46 | AC-33 | API | Booking of A | POST move as B, as tutor, without cookie | 404, 403, 401, nothing changed |
| TEST-47 | AC-34 | API | Open future slot of tutor T | DELETE /api/staff/slots/:id as T, then GET staff slots, GET available slots, POST /api/bookings on it | 204, removedAt set, slot in no list, booking 404 |
| TEST-48 | AC-35 | API | Slot with ACTIVE booking; slot with only a CANCELLED booking | DELETE each | 409 SLOT_HAS_BOOKING (removedAt still null); 204 |
| TEST-49 | AC-36 | API | Slot that started 10 min ago (inserted directly) | DELETE | 422 SLOT_STARTED |
| TEST-50 | AC-37 | API | Open slot of T | DELETE as tutor of another schedule, as student, without cookie, then id 999999, then twice as T | 403, 403, 401, 404, then 204 and 404 |
| TEST-51 | AC-37 | API | T removed his slot 10:00-10:30 | POST /api/staff/schedules/S/slots 10:00 again | 201 |
| TEST-52 | AC-38, AC-39 | Unit | Lists of 2 active upcoming, 3 active upcoming, 3 with one in the past | checkStudentLimits | ok, BOOKING_LIMIT, ok |
| TEST-53 | AC-40 | Unit | Existing 10:00-11:00; new 10:30-11:00, new 11:00-11:30 | checkStudentLimits | BOOKING_OVERLAP, ok |
| TEST-54 | AC-38 | API | Student with 3 ACTIVE upcoming bookings | POST a 4th, cancel one, POST again | 422 BOOKING_LIMIT and no row, then 201 |
| TEST-55 | AC-39 | API | Student with 2 ACTIVE upcoming, 1 CANCELLED, 1 ACTIVE past (inserted directly) | POST a new booking | 201 |
| TEST-56 | AC-40 | API | Student has 10:00-11:00 in schedule S | POST on 10:30-11:00 of schedule U, then on 11:00-11:30 | 409 BOOKING_OVERLAP, then 201 |
| TEST-57 | AC-41 | API | Student with 2 ACTIVE upcoming, two open slots | Two POST /api/bookings at the same time (Promise.all) | One 201 and one 422 BOOKING_LIMIT, 3 ACTIVE bookings stored |
| TEST-58 | AC-42 | Unit | from=to=2026-12-01, tutorId "4" | parseAvailabilityFilter | startsAt >= 2026-11-30T17:00Z and < 2026-12-01T17:00Z, tutorId 4 |
| TEST-59 | AC-44 | Unit | "2026-13-01", "2026-02-30", "1/12/2026", from after to, tutorId "abc", "0" | parseAvailabilityFilter | Error on the field each time |
| TEST-60 | AC-42 | API | Open slots in 2 days 08:00, 19:30, and in 4 days | GET available-slots?from=day+2&to=day+2 | Only the two slots of day+2 |
| TEST-61 | AC-43, AC-44 | API | Schedule with tutors T1 and T2, slots of both | GET ?tutorId=T1, GET /tutors, GET ?tutorId=999999 | Only T1 slots; [T1, T2]; [] |
| TEST-62 | AC-44 | API | Any schedule | GET ?from=2026-13-01, ?from=day+3&to=day+1, ?tutorId=abc | 400 with details.from, details.from, details.tutorId |
| TEST-63 | AC-46, AC-48 | API | Database running, COMMIT_SHA=abc123 | GET /api/ready, GET /api/version | 200 { db: "connected" }, 200 { commit: "abc123" } |
| TEST-64 | AC-46 | CI | Fresh clone in GitHub Actions, .env.example copied | docker compose up --build, curl /api/ready, /, /api/version | All answer, page is HTML |
| TEST-65 | AC-47 | CI | PR into sprint-2-staging | Job test-and-docker | Migrate, seed, server tests, client build, Docker build all green; counts in the log |
| TEST-66 | AC-48 | CI | Push on main | deploy.yml then smoke_test.py | Smoke test passes, /api/version = commit SHA |
| TEST-67 | AC-22, AC-27 | E2E | Seeded student books a slot through the API | Open the booking detail, Cancel booking, Confirm | Green box, status Cancelled, slot again in Find a session |
| TEST-68 | AC-28 | E2E | Seeded student has a booking, another open slot exists | Booking detail, Move to another slot, Move here | Detail of the new booking with "Your booking is moved.", old booking Cancelled in My bookings |
| TEST-69 | AC-34 | E2E | Seeded tutor adds a slot | Remove, Yes, remove | Green box "Slot removed.", slot not in the table |
| TEST-70 | AC-45 | E2E | Schedule Calculus I with two tutors | Choose one tutor, then Clear filters | Only slots of that tutor, then all slots |
| TEST-71 | Sprint 1 AC-14, AC-15, AC-20 | E2E | Sprint 1 journey (e2e/sprint1.spec.ts) on the Sprint 2 code | Run the Sprint 1 E2E file again | Still passes (continuity, Part A) |
| MC-02 | AC-49 | Manual | Deployed app, a booking exists | Run deploy.yml again (new revision), reload My bookings | The booking is still there |
| MC-03 | AC-50 | Manual | Repository and deployed app | git grep for passwords and keys, docker history, check Set-Cookie on login | No secret, cookie has Secure and HttpOnly |
