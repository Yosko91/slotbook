# System-Level Software Design Specification - SlotBook

Version 1.1, 22 November 2026. Changes since 1.0: data model of Sprint 2 and 3 (migrations 4 and 5), concurrency design for limits and slot removal, new screens and endpoints, roles table, deployment done (R-02).

## 1. Stack and architecture

We use the same stack as our TokTickIT labs, because we both know it and the tests tools are ready. The frontend is React with TypeScript and Vite. The backend is a REST API with Node.js and Express. The database is PostgreSQL and we use Prisma for the schema, the migrations and the queries. Tests are Vitest (unit), Vitest with Supertest on the real database (API integration) and Playwright (end-to-end).

It is a modular monolith: one API server and one database. In development the client runs on its own Vite server. For deployment the API can also serve the built client, so one container is enough.

![Architecture of SlotBook](img/architecture.png)

The browser talks to the API with JSON over HTTP, with fetch and credentials included, so the session cookie is sent. The API talks to PostgreSQL with Prisma. The client never talks to the database.

Where are the business rules? All rules are checked in the API. The pure rules (slot length, opening hours, overlap, booking time limit, topic) are small functions in server/src/rules, so we can unit test them without a database. The route handlers call these functions, then do the database work. The rule "one active booking per slot" (BR-09) is also enforced by the database with a partial unique index, because two requests at the same time can both pass a check in the code. The client also checks the form fields, but only to give a quick message. The server does not trust it.

Server folders: src/routes (one router per resource), src/middleware (requireAuth, requireRole), src/rules (pure business rules), src/services (session, password), prisma (schema, migrations, seed).

## 2. Data model

![Data model](img/data-model.png)

| Entity | Main fields | Constraints and links |
|---|---|---|
| User | id, name, email, passwordHash, role (STUDENT or STAFF), isActive, createdAt | email unique. role is an enum. passwordHash is bcrypt. |
| Session | id (random token, 64 hex chars), userId, expiresAt, createdAt | FK to User, delete cascade. Index on userId. |
| Schedule | id, name, description, isActive | name unique. Example: Calculus I. |
| ScheduleStaff | scheduleId, staffId | Primary key (scheduleId, staffId). Says which tutor manages which schedule (BR-04). |
| Slot | id, scheduleId, tutorId, startsAt, endsAt, createdAt, removedAt (Sprint 2) | FK to Schedule and User (the tutor). Times in UTC. Check endsAt > startsAt. Index on (tutorId, startsAt) for the overlap check. removedAt is set by F-06 (soft delete); every query ignores removed slots. |
| Booking | id, slotId, studentId, topic, status (ACTIVE, CANCELLED), createdAt, cancelledAt, cancelReason, cancelledByRole (Sprint 2), attendance (ATTENDED, NO_SHOW), attendanceAt (Sprint 3) | FK to Slot and User. Partial unique index on slotId where status = 'ACTIVE' (BR-09). Index on studentId. A booking row is never deleted: cancel and move change its status. |

Ownership: a Booking belongs to its student. A Slot belongs to its tutor and its schedule. The tutors of a schedule can see all slots and bookings of this schedule. A slot has no status column: it is Booked when it has an ACTIVE booking, else Open. Like this the two values can never disagree.

Migrations: 1 users and sessions, 2 schedules and slots, 3 bookings (Sprint 1), 4 `f04_f06_cancel_remove` (Sprint 2), 5 `f10_attendance` (Sprint 3). All are additive (new nullable columns, new enum), so a rollback of the service to an older image still works with the newer database.

Concurrency (Sprint 2). Three rules must hold when requests come at the same time. BR-09 (one active booking per slot) is kept by the partial unique index, as in Sprint 1. BR-13 and BR-14 (limits of one student) cannot be a unique index, so the booking and move transactions first lock the row of the student (`SELECT id FROM "User" WHERE id = $1 FOR UPDATE`) and then read his bookings. BR-16 (no remove of a booked slot) is kept because the booking transactions and the remove transaction lock the same slot row before they check. Single-row changes (cancel, attendance) use `UPDATE ... WHERE status = 'ACTIVE'` (or `attendance IS NULL`) and treat 0 rows as a conflict (409).

Database setup: PostgreSQL 15 or more. The schema is in server/prisma/schema.prisma. Migrations are in server/prisma/migrations and are applied with npx prisma migrate deploy. The partial unique index and the check constraint are written in SQL in the migration, because Prisma schema cannot write them. Seed data (npm run seed) is reproducible: it uses upsert, so we can run it many times. It creates 3 schedules, 3 tutors, 3 students and some future slots, all with fake names. Demo passwords are only for local development and are written in the README, not in this document.

## 3. User interface

| Screen | Path | Who | Content |
|---|---|---|---|
| Login | /login | everybody | Email, password, error message. |
| Find a session | /slots | Student | Choose a schedule, filters From, To and Tutor with Clear filters (F-08), list of available slots (date, time, length, tutor), Book button, small form for the topic. |
| My bookings | /bookings | Student | Table of own bookings with status and attendance, link to detail. |
| Booking detail | /bookings/:id | Student, Tutor of the schedule | Schedule, tutor, date and time, topic, status, attendance, cancellation info. Cancel booking (F-04, student until 12 h before, tutor with a reason until the start) and Move to another slot (F-05, student). |
| My schedules | /staff | Tutor | Choose a managed schedule. View Upcoming: form to add a slot, table of upcoming slots with Open or Booked, student (link to the booking) and topic, Remove for open slots (F-06). View Past sessions: slots of the last 30 days with Attended / No-show buttons (F-10). |

After login the student goes to /slots and the tutor goes to /staff. A header shows the app name, the links of the role, the user name and role, and a Log out button. If a user opens a page of the other role, the page shows "You are not allowed to see this page." (the API would refuse anyway).

Shared behavior: every page that loads data shows "Loading..." first. An empty list shows a short sentence (for example "No available slot for this schedule."). An error from the API is shown in a red box with the message of the API. Form fields show their own error under the field. Buttons are disabled while a request is running, so a double click does not send two requests. Dates are shown in Bangkok time.

## 4. API conventions

All endpoints start with /api and use JSON. Names are plural nouns (/api/bookings, /api/staff/schedules). Tutor endpoints are under /api/staff. Successful create returns 201 with the created object. A list returns a JSON array.

Errors always have the same shape: { "error": "message for the user", "code": "OPTIONAL_CODE", "details": { "field": "message" } }. code and details are only there when useful. We never send a stack trace or a database error to the client. Unknown errors give 500 with "Unexpected server error" and are logged on the server.

| Status | When |
|---|---|
| 400 | Invalid input (details per field) |
| 401 | No valid session |
| 403 | Logged in but wrong role or schedule not managed |
| 404 | Not found, or a booking that is not yours |
| 409 | Conflict: slot already booked, overlapping slot or booking, booking not active, slot has a booking, attendance already recorded |
| 422 | Valid input but a rule refuses it now: booking closed, cancel/move closed (12 h), slot started, limit of 3 bookings, attendance too early, other schedule |

Main endpoints (details in the feature contracts): POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, GET /api/schedules, GET /api/schedules/:id/available-slots, POST /api/bookings, GET /api/bookings/mine, GET /api/bookings/:id, GET /api/staff/schedules, GET /api/staff/schedules/:id/slots (?period=past), POST /api/staff/schedules/:id/slots. Sprint 2: POST /api/bookings/:id/cancel, POST /api/bookings/:id/move, DELETE /api/staff/slots/:id, GET /api/schedules/:id/tutors, query from/to/tutorId on available-slots, GET /api/ready, GET /api/version. Sprint 3: POST /api/staff/bookings/:id/attendance. Planned: POST /api/staff/schedules/:id/slots/weekly (F-09), GET /api/staff/schedules/:id/summary (F-11).

## 5. Roles and permissions

| Operation | Anonymous | Student | Tutor (STAFF) |
|---|---|---|---|
| Log in | yes | yes | yes |
| Log out, get current user | no (401) | yes | yes |
| List schedules | no (401) | yes | yes |
| See available slots | no (401) | yes | yes (read only) |
| Book a slot | no (401) | yes | no (403) |
| See own bookings and detail | no (401) | only his own (other = 404) | no (403) for /mine |
| See one booking by id | no (401) | only his own | only if he manages the schedule (else 404) |
| List managed schedules | no (401) | no (403) | yes |
| Create slot in a schedule | no (401) | no (403) | only managed schedules (else 403) |
| See slots and bookings of a schedule | no (401) | no (403) | only managed schedules (else 403) |
| Cancel a booking | no (401) | only his own, until 12 h before (other = 404) | only managed schedules, with reason, until the start (else 404) |
| Move a booking | no (401) | only his own, until 12 h before (other = 404) | no (403) |
| Remove an open slot | no (401) | no (403) | only managed schedules (else 403) |
| Tutors of a schedule (filter) | no (401) | yes | yes |
| Record attendance | no (401) | no (403) | only managed schedules (else 404) |

The checks are done in the API with two middlewares: requireAuth (finds the session, else 401) and requireRole (else 403). The ownership checks (managed schedule, own booking) are done inside the handlers with a database query. The user id always comes from the session, never from the body or the URL.

## 6. Authentication

Passwords are hashed with bcrypt (cost 10). Login compares the password with the hash. When the email does not exist we still run a bcrypt compare, so the time is about the same, and the message is always "Invalid email or password".

When login works, the server creates a Session row with a random token of 32 bytes and an expiry 8 hours later. The token goes in a cookie slotbook.sid with httpOnly and sameSite lax, so JavaScript cannot read it. Secure is off on localhost and must be on in production (HTTPS on Cloud Run). For each request requireAuth reads the cookie, finds the session, checks the expiry and that the user is active. GET /api/auth/me returns id, name, email and role (never the hash). Logout deletes the session row and clears the cookie, so the same cookie does not work after. An expired session is deleted when it is used.

## 7. Configuration and deployment plan

| Variable | Example | Use |
|---|---|---|
| DATABASE_URL | postgresql://user:password@localhost:5432/slotbook | Database connection |
| PORT | 3000 | API port |
| CLIENT_ORIGIN | http://localhost:5173 | Allowed origin for CORS with credentials |
| COOKIE_SECURE | false | true in production |
| VITE_API_URL | http://localhost:3000 | Client, URL of the API (not a secret) |

The real values are in .env files that are in .gitignore. The repo only has .env.example files with fake values. The client gets only VITE_API_URL, no secret.

Deployment (R-02, done in Sprint 2 with the Lab 5 process of our TokTickIT labs). One Dockerfile with three stages (build client, build server and Prisma client, small runtime as user node). The API serves the built client (CLIENT_DIST_DIR), so UI and API share one URL. On GCP project toktickit-heloise, region asia-southeast1: Artifact Registry `slotbook`, Cloud SQL `slotbook-pg` (PostgreSQL 16), Secret Manager `slotbook-database-url` and `slotbook-seed-password`, Cloud Run job `slotbook-migrate` (prisma migrate deploy + seed) and service `slotbook`. First setup with deploy/deploy.sh (DRY_RUN=1 first). Every push on main runs .github/workflows/deploy.yml: CI, keyless login (Workload Identity Federation), image tagged with the commit SHA, deploy/release.sh (migration job first, the service is updated only if it succeeds), smoke test, check that /api/version returns the commit. Rollback: run the workflow by hand with image_tag = an older SHA.

| Extra variable (production) | Example | Use |
|---|---|---|
| NODE_ENV | production | Set in the image |
| CLIENT_DIST_DIR | /app/client/dist | The API serves the built client |
| COMMIT_SHA | full commit SHA | Returned by /api/version |
| SEED_PASSWORD | from Secret Manager | Password of the demo accounts (never in Git) |
