# SlotBook

SlotBook is a booking system for the peer tutoring center of our faculty. Tutors publish free slots, students book a slot with a short topic, and both can see the bookings.

CPE 334 group project, theme 1 (Appointment and Scheduling System). Team: Yohann MOSCATO and Heloise SAVOYE.

Stack: React + TypeScript + Vite (client), Node.js + Express (API), Prisma + PostgreSQL (database). Tests: Vitest + Supertest (server), Playwright (end-to-end).

Documents: docs/srs.md, docs/features.md, docs/traceability.md, docs/system-sds.md, docs/change-log.md, docs/sprints/plan.md, docs/sprints/remaining-work.md and the contracts of each sprint in docs/sprints/sprint-1/, sprint-2/ and sprint-3/.

## Requirements

Node.js 20 or more, PostgreSQL 15 or more running on your machine.

## Setup

```bash
# API
cd server
npm install
cp .env.example .env        # put your PostgreSQL user and password in DATABASE_URL
npx prisma migrate deploy   # creates the tables (5 migrations)
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
| SEED_PASSWORD | server (seed) | change-me-too | password of the demo accounts; optional locally (default below), required with NODE_ENV=production |
| CLIENT_DIST_DIR | server | /app/client/dist | only in Docker: the API serves the built client |
| COMMIT_SHA | server | (set by the Docker build) | returned by GET /api/version |
| NODE_ENV | server | production | only in Docker / Cloud Run |
| VITE_API_URL | client | http://localhost:3000 | URL of the API |

The .env files are not in Git. Only the .env.example files with fake values are committed.

## Demo accounts (local only)

Locally, without SEED_PASSWORD, all seeded accounts use the password `SlotBook!2026`. This is only for local development. On GCP the password is the secret `slotbook-seed-password` (Secret Manager) and is never written in Git.

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

## Docker (same image as Cloud Run)

```bash
cp .env.example .env          # change the values
docker compose up --build     # db + migrate/seed job + app
# open http://localhost:3000 (UI and API on the same port)
```

## Deployment on GCP (R-02)

Project `toktickit-heloise`, region `asia-southeast1`. Run from Google Cloud Shell (gcloud, docker and bash are installed there) or any bash with gcloud.

```bash
git clone https://github.com/Yosko91/slotbook && cd slotbook
gcloud config set project toktickit-heloise
DRY_RUN=1 PROJECT_ID=toktickit-heloise bash deploy/deploy.sh   # read the commands first
PROJECT_ID=toktickit-heloise bash deploy/deploy.sh             # first setup and first deploy
python3 deploy/smoke_test.py https://<service-url>
```

After the first setup, every push on main deploys with .github/workflows/deploy.yml (GitHub environment `demo` with the variables GCP_PROJECT_ID, GCP_REGION, WIF_PROVIDER, WIF_SERVICE_ACCOUNT, optional SMOKE_EMAIL and secret SMOKE_PASSWORD). GET /api/version on the public URL returns the deployed commit. Rollback: run the workflow by hand with image_tag = the full SHA of an older release.

## Demo sequence of Sprint 2 and 3

1. As ploy@slotbook.dev, book a slot, open it, Cancel booking: status Cancelled, the slot is in Find a session again.
2. Book again, open it, Move to another slot, Move here: the new booking opens with "Your booking is moved."
3. Try a 4th upcoming booking: "You already have 3 upcoming bookings...".
4. In Find a session choose a Tutor and dates, then Clear filters.
5. As somchai.tutor@slotbook.dev, Remove an open slot. Open Past sessions and click Attended on yesterday's session (created by the seed).
6. Still as the tutor, add a slot with Repeat every week = 4 weeks: "4 slots added, every ... at ...". Add it again: nothing is added and the overlapping weeks are listed.
7. Open Summary and choose a period: Open, Booked, Cancelled, Attended and No-show counts.

## Git workflow

Each feature has an Issue, a branch from the sprint staging branch (sprint-1-staging, sprint-2-staging, sprint-3-staging) and a PR reviewed by the other team member. In each feature branch the tests are committed first (red), then the code (green). PRs are merged with a merge commit (no squash) so this history stays. The release PR merges the staging branch into main and the release is tagged (v1.0.0-sprint1, v2.0.0-sprint2, ...).
