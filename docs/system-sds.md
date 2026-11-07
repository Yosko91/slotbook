# System-Level Software Design Specification - SlotBook

Version 1.0, 5 November 2026.

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
| Slot | id, scheduleId, tutorId, startsAt, endsAt, createdAt | FK to Schedule and User (the tutor). Times in UTC. Check endsAt > startsAt. Index on (tutorId, startsAt) for the overlap check. |
| Booking | id, slotId, studentId, topic, status (ACTIVE, later CANCELLED), createdAt | FK to Slot and User. Partial unique index on slotId where status = 'ACTIVE' (BR-09). Index on studentId. |

Ownership: a Booking belongs to its student. A Slot belongs to its tutor and its schedule. The tutors of a schedule can see all slots and bookings of this schedule. A slot has no status column: it is Booked when it has an ACTIVE booking, else Open. Like this the two values can never disagree.

Database setup: PostgreSQL 15 or more. The schema is in server/prisma/schema.prisma. Migrations are in server/prisma/migrations and are applied with npx prisma migrate deploy. The partial unique index and the check constraint are written in SQL in the migration, because Prisma schema cannot write them. Seed data (npm run seed) is reproducible: it uses upsert, so we can run it many times. It creates 3 schedules, 3 tutors, 3 students and some future slots, all with fake names. Demo passwords are only for local development and are written in the README, not in this document.

## 3. User interface

| Screen | Path | Who | Content |
|---|---|---|---|
| Login | /login | everybody | Email, password, error message. |
| Find a session | /slots | Student | Choose a schedule, list of available slots (date, time, length, tutor), Book button, small form for the topic. |
| My bookings | /bookings | Student | Table of own bookings, link to detail. |
| Booking detail | /bookings/:id | Student | Schedule, tutor, date and time, topic, status. |
| My schedules | /staff | Tutor | Choose a managed schedule, form to add a slot, table of upcoming slots with Open or Booked, student and topic. |

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
| 409 | Conflict: slot already booked or overlapping slot |
| 422 | Valid input but rule refuses it now (booking closed) |

Main endpoints (details in the feature contracts): POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, GET /api/schedules, GET /api/schedules/:id/available-slots, POST /api/bookings, GET /api/bookings/mine, GET /api/bookings/:id, GET /api/staff/schedules, GET /api/staff/schedules/:id/slots, POST /api/staff/schedules/:id/slots.

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

Plan for Lab 5 (not done in Sprint 1): one Dockerfile with a build stage (build client and server) and a run stage with Node. On GCP, the container runs on Cloud Run and the database is Cloud SQL for PostgreSQL, so the data stays when the container restarts. DATABASE_URL is stored in Secret Manager and given to Cloud Run as an env variable. Migrations run with prisma migrate deploy before the new version starts. The image goes to Artifact Registry and GitHub Actions builds, tests and deploys from main.
