# Sprint 3 Software Test Specification

Version 1.0, 22 November 2026, written before the implementation. Same levels and rules as Sprint 1 and 2. Status at the checkpoint of 29 November: F-10 tests are written and must run on the candidate; F-09, F-11 and R-03 tests are planned (not written yet), they are NOT counted as passed anywhere.

| Test | AC | Level | Precondition / input | Action | Expected result | Status 29 Nov |
|---|---|---|---|---|---|---|
| TEST-72 | AC-51, AC-52 | Unit | Start Tue 10:00 Bangkok, 4 weeks; start 20 days ahead, 8 weeks | weeklyStarts + validateSlot | 4 dates 7 days apart at 10:00 Bangkok; weeks 7 and 8 refused (60 days) | Planned |
| TEST-73 | AC-51 | API | Tutor of S | POST /slots/weekly weeks 4 | 201, 4 Open slots, same Bangkok weekday and time | Planned |
| TEST-74 | AC-52 | API | Tutor already has a slot in week 3 | POST /slots/weekly weeks 4 | 409 SLOT_OVERLAP with week 3, no new slot | Planned |
| TEST-75 | AC-53 | API | Tutor of S | weeks 1, 9, "4" | 400 each time, no new slot | Planned |
| TEST-76 | AC-54 | API | Other tutor, student, anonymous | POST /slots/weekly | 403, 403, 401 | Planned |
| TEST-77 | AC-57 | Unit | Start 1 min ahead, 1 min ago; values ATTENDED, NO_SHOW, attended, missing | canRecordAttendance, parseAttendance | false, true; ok, ok, error, error | Written |
| TEST-78 | AC-55 | API | Slots of S: started 2 h ago (booked), 40 days ago, tomorrow | GET staff slots ?period=past | Only the slot of 2 h ago, with booking and attendance null; ?period=abc gives 400 | Written |
| TEST-79 | AC-56 | API | ACTIVE booking, slot started 1 h ago | POST attendance ATTENDED as tutor, then GET booking as student | 200 attendance ATTENDED and attendanceAt; student sees ATTENDED | Written |
| TEST-80 | AC-57 | API | Booking on a slot in 2 hours; started booking | POST ATTENDED on the future one; POST "attended" on the started one | 422 ATTENDANCE_TOO_EARLY; 400; nothing stored | Written |
| TEST-81 | AC-58 | API | Started booking already NO_SHOW; new started booking; CANCELLED started booking | POST again; two POST at the same time; POST on cancelled | 409 and value still NO_SHOW; one 200 and one 409; 409 BOOKING_NOT_ACTIVE | Written |
| TEST-82 | AC-59 | API | Started booking in S | POST as tutor of another schedule, as student, without cookie | 404, 403, 401, nothing stored | Written |
| TEST-83 | AC-55, AC-56 | E2E | Seeded past booking (seed) or a booking on a past slot | Tutor opens Past sessions, clicks Attended | Row shows Attended, buttons gone, still after reload | Written |
| TEST-84 | AC-60, AC-61 | Unit | List of slots with active, cancelled, attended, no-show bookings | summarize | Expected five numbers | Planned |
| TEST-85 | AC-60, AC-61 | API | Schedule with known data incl. a removed slot and a move | GET summary | Expected numbers, removed slot not counted | Planned |
| TEST-86 | AC-62 | API | Tutor of S | Missing from, bad date, from > to, 93 days | 400 each time | Planned |
| TEST-87 | AC-63 | API | Other tutor, student, anonymous | GET summary | 403, 403, 401 | Planned |
| TEST-88 | AC-60 | E2E | Seeded tutor | Open Summary, choose a range | Five cards with numbers | Planned |
| TEST-89 | AC-64 | API (timed) | 500 open slots in one schedule | 5 calls of available-slots after a warm-up | Median below 500 ms | Planned |
| TEST-90 | AC-65 | E2E | Viewport 375 x 812 | Open the five main screens | scrollWidth <= 375 on each, screenshots kept | Planned |
| TEST-91 | All | Regression | Sprint 3 candidate | All server tests and all E2E (Sprint 1, 2, 3) | All pass | Runs on every PR |
