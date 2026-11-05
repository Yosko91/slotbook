# Software Requirements Specification - SlotBook

Version 1.0, 5 November 2026. Authors: Yohann MOSCATO, Heloise SAVOYE.

## 1. Problem and context

Our faculty has a peer tutoring center. Senior students work there as tutors for first and second year subjects like Calculus, Programming Fundamentals and Physics. Today there is no booking system. Students come to the room and wait, or they send a message on LINE to a tutor to ask if they are free. Tutors don't know in advance who will come, and sometimes two students come for the same time. Sometimes nobody comes and the tutor waits for nothing.

SlotBook is a web application to fix this. Tutors publish their free time as slots. Students see the free slots and book one. A slot is for one student only (one-to-one session). Students and tutors can see their bookings at any time.

## 2. Actors

| Actor | Role in the system | Responsibilities |
|---|---|---|
| Student | STUDENT (called Customer in the course brief) | Looks at available slots, books a slot with a short topic, checks his own bookings. Later: cancels or moves a booking. |
| Tutor | STAFF | Publishes available slots in the schedules he is assigned to, looks at the bookings of these schedules. Later: removes slots, records attendance, reads the summary. |
| Center coordinator | No account in the product | Creates the accounts and decides which tutor works on which schedule. In our product this is done with seed data. |

A schedule is one subject desk of the center, for example "Calculus I". One tutor can work on several schedules and one schedule can have several tutors.

## 3. Scope and exclusions

In scope for the full product: login and logout with two roles, slot publication by tutors, availability for students, booking with conflict prevention, cancellation and rescheduling, slot removal, weekly repeating slots, attendance (attended or no-show) and an appointment summary for tutors.

Out of scope: self registration, password reset, email or LINE notifications, group sessions (more than one student in a slot), video calls, payments, an admin screen to manage users and schedule assignment (seed data is used), mobile app (we only do a responsive web app).

## 4. Functional requirements

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A user can log in with email and password. | 1 |
| FR-02 | A logged in user can log out. | 1 |
| FR-03 | The system shows the current user (name and role) and the API returns it. | 1 |
| FR-04 | A tutor can create an available slot (date, start time, length) in a schedule he manages. | 1 |
| FR-05 | A tutor can see the upcoming slots of a schedule he manages, with the status (Open or Booked) and the student and topic when it is booked. | 1 |
| FR-06 | A student can choose a schedule and see the slots that are still available. | 1 |
| FR-07 | A student can book an available slot and give a short topic (what he needs help with). | 1 |
| FR-08 | A student can see the list of his bookings and the detail of one booking. | 1 |
| FR-09 | A student can cancel his own booking. A tutor can cancel a booking of his schedule with a reason. | 2 |
| FR-10 | A student can move his booking to another open slot of the same schedule. | 2 |
| FR-11 | A tutor can remove an open slot. | 2 |
| FR-12 | A student can filter available slots by date and by tutor. | 2 |
| FR-13 | A tutor can create the same slot every week for a number of weeks. | 3 |
| FR-14 | A tutor can mark a past booking as attended or no-show. | 3 |
| FR-15 | A tutor can see a summary of a schedule for a date range (open, booked, cancelled, attended, no-show). | 3 |

## 5. Business rules

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | Each user has exactly one role, STUDENT or STAFF. The role comes from the database, never from the client. | 1 |
| BR-02 | Passwords are stored as bcrypt hashes. A failed login always gives the same message, so nobody can know if an email exists. | 1 |
| BR-03 | A session is valid for 8 hours. Logout deletes the session on the server. | 1 |
| BR-04 | A tutor can create and see slots only in the schedules he is assigned to. | 1 |
| BR-05 | A slot lasts 30 or 60 minutes and starts on the hour or half hour (for example 10:00 or 10:30). | 1 |
| BR-06 | A slot must be inside the opening hours of the center, 08:00 to 20:00 Bangkok time, and end the same day. | 1 |
| BR-07 | A slot must start in the future and not more than 60 days from now. | 1 |
| BR-08 | A tutor cannot have two slots that overlap, even in different schedules. Slots that only touch (10:00-10:30 and 10:30-11:00) are allowed. | 1 |
| BR-09 | A slot can have only one active booking. This must stay true when two students click at the same time. | 1 |
| BR-10 | Booking closes 1 hour before the slot starts. A past slot or a slot starting in less than 1 hour cannot be booked. | 1 |
| BR-11 | The topic of a booking is required and has 5 to 200 characters. | 1 |
| BR-12 | A student can see only his own bookings. A tutor can see bookings only of the schedules he manages. | 1 |
| BR-13 | A student can have at most 3 active upcoming bookings. | 2 |
| BR-14 | A student cannot have two active bookings at overlapping times. | 2 |
| BR-15 | A student can cancel or move a booking only until 12 hours before the slot starts. | 2 |
| BR-16 | A tutor can remove a slot only if it has no active booking. | 2 |
| BR-17 | Attendance can be recorded only after the slot started, and only once per booking. | 3 |

## 6. Non-functional requirements

| ID | Requirement and target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Security: a request to a protected endpoint without a valid session is rejected with 401 and the body contains no private data. | API tests | 1 |
| NFR-02 | Authorization is done on the backend: a wrong role gets 403, a booking of another student gets 404 without data. Hiding buttons in the UI is not counted as protection. | API tests | 1 |
| NFR-03 | No plain text password in the database (bcrypt, cost 10). | Unit/DB test | 1 |
| NFR-04 | Integrity: with 2 booking requests sent at the same time for one slot, exactly 1 booking is stored. | API test | 1 |
| NFR-05 | Persistence: data is in PostgreSQL and is still there after a restart of the server (and after redeploy in Lab 5). | Manual check in Sprint 1, deployed check in Sprint 2 | 1 and 2 |
| NFR-06 | Configuration: all settings come from environment variables, no secret in Git or in the client code. The app can run in Docker on GCP. | Review + Lab 5 deployment | 2 |
| NFR-07 | Time: all times are stored in UTC and shown in Bangkok time (UTC+7). | Unit test of opening hours | 1 |
| NFR-08 | Performance: the available slots API answers in less than 500 ms with 500 slots in the database (local machine). | Timed API test | 3 |
| NFR-09 | Usability: the main screens work at 375 px width without horizontal scroll. | Playwright screenshots | 3 |

## 7. Assumptions

A-01. Tutors are trusted staff of the center, so they can see the name and topic of students who booked in their schedules.
A-02. The center is in Bangkok. Thailand has no daylight saving time, so Bangkok time is always UTC+7.
A-03. Accounts are created by the coordinator. For the course, seed data creates them.
A-04. One session is one-to-one. Group sessions are not needed by the center.

## 8. Decisions and questions

| ID | Question | Decision |
|---|---|---|
| D-01 | Which context? | Peer tutoring center of the faculty. It is close to our daily life and the rules are clear. |
| D-02 | Slot length? | 30 or 60 minutes only, start on :00 or :30. Free length makes overlaps hard to read for students. |
| D-03 | Who can change availability? | Only tutors assigned to the schedule (BR-04). The assignment is seed data, no admin screen. |
| D-04 | Cancellation limit? | 12 hours before start, for Sprint 2 (BR-15). Not needed for Sprint 1. |
| D-05 | Until when can a student book? | Until 1 hour before the start (BR-10), so the tutor can prepare a bit. |
| D-06 | What does a student get when he asks for another student's booking? | 404 Not found, same as a booking that does not exist. A 403 would tell that the booking exists. |
| D-07 | How to block double booking under concurrency? | A partial unique index in PostgreSQL on Booking(slotId) where status is ACTIVE. Checking in the code only is not enough when two requests come together. |
| D-08 | Session or JWT? | Server session in the database with an httpOnly cookie. Logout can really delete it, which is not easy with JWT. |
| D-09 | Is "Customer" from the brief a good name? | We call this role Student in the UI and STUDENT in the code, because our customers are students. Staff stays STAFF (shown as Tutor). |
