# SlotBook

SlotBook is a booking system for the peer tutoring center of our faculty. Tutors publish free slots, students book a slot with a short topic, and both can see the bookings.

CPE 334 group project, theme 1 (Appointment and Scheduling System). Team: Yohann MOSCATO and Heloise SAVOYE.

Stack: React + TypeScript + Vite (client), Node.js + Express (API), Prisma + PostgreSQL (database). Tests: Vitest + Supertest (server), Playwright (end-to-end).

Documents: docs/srs.md, docs/features.md, docs/traceability.md, docs/system-sds.md, docs/sprints/plan.md and the Sprint 1 contracts in docs/sprints/sprint-1/.

## Requirements

Node.js 20 or more, PostgreSQL 15 or more running on your machine.

## Setup

```bash
# API
cd server
npm install
cp .env.example .env        # put your PostgreSQL user and password in DATABASE_URL
npx prisma migrate deploy   # creates the tables (3 migrations)
npx prisma generate
npm run seed                # demo users, schedules and slots (can run many times)
npm run dev                 # http://localhost:3000

# client, in a second terminal
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm run dev                 # http://localhost:5173
```

If the database "slotbook" does not exist yet, create it first (createdb slotbook) or use npx prisma migrate dev, which creates it.

## Environment variables

| Variable | Where | Example | Use |
|---|---|---|---|
| DATABASE_URL | server | postgresql://postgres:change-me@localhost:5432/slotbook?schema=public | database |
| PORT | server | 3000 | API port |
| CLIENT_ORIGIN | server | http://localhost:5173 | CORS origin of the client |
| COOKIE_SECURE | server | false | true when the app runs on HTTPS |
| VITE_API_URL | client | http://localhost:3000 | URL of the API |

The .env files are not in Git. Only the .env.example files with fake values are committed.

## Demo accounts (local only)

All seeded accounts use the password `SlotBook!2026`. This is only for local development, never use it on a real server.

| Role | Email |
|---|---|
| Tutor (Calculus I) | somchai.tutor@slotbook.dev |
| Tutor (Calculus I, Programming Fundamentals) | anong.tutor@slotbook.dev |
| Tutor (Programming Fundamentals, Physics I) | lucas.tutor@slotbook.dev |
| Student | nattapong@slotbook.dev |
| Student | ploy@slotbook.dev |
| Student | kevin@slotbook.dev |

## Tests

```bash
# server unit + API tests (they use the database in DATABASE_URL and clean their own data)
cd server
npm test

# typecheck and build
cd server && npx tsc --noEmit
cd client && npm run build

# end-to-end (from the root folder, starts the API on 3100 and the client on 5181 by itself)
npm install
npx playwright install chromium   # first time only
npm run e2e
```

The E2E tests use the seeded accounts, so run npm run seed before.

## Demo sequence

1. Log in as somchai.tutor@slotbook.dev, choose Calculus I, add a slot (date, time, 30 min). It is shown as Open.
2. Add the same slot again: "You already have a slot at this time".
3. Log out, log in as ploy@slotbook.dev, choose Calculus I, click Book on the new slot, write a topic, Confirm booking. The detail page opens.
4. Open My bookings: the booking is there, also after a reload.
5. Log out, log in as the tutor again: the slot is Booked with the student name and topic.
6. As a student, open /staff: "You are not allowed to see this page." and the API answers 403.

## Git workflow

Each feature has an Issue, a branch from sprint-1-staging and a PR reviewed by the other team member. The release PR merges sprint-1-staging into main and the release is tagged.
