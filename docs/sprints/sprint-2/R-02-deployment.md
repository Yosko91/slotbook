# R-02 Deployment and configuration - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version, before implementation. Reuses the Lab 5 delivery process of TokTickIT (Docker, CI, Cloud Run, Cloud SQL, Secret Manager, Workload Identity Federation). |

Linked requirements: NFR-05, NFR-06, NFR-01 (secure cookie). Responsibility, not a screen.

## Design

One Docker image (root Dockerfile, 3 stages: build client, build server + Prisma client, small runtime). In the image the API also serves the built React app, so UI and API have the same URL and the session cookie is first party. The image has no secret: DATABASE_URL and SEED_PASSWORD are given at run time.

On GCP (region asia-southeast1): Artifact Registry for the image, Cloud SQL PostgreSQL 16 for the data, Secret Manager for DATABASE_URL and SEED_PASSWORD, a Cloud Run job `slotbook-migrate` that runs `prisma migrate deploy` then the seed, and the Cloud Run service `slotbook`. The first setup is done once with `deploy/deploy.sh` (idempotent, `DRY_RUN=1` to preview). Every push on main runs `.github/workflows/deploy.yml`: CI first, then keyless login with Workload Identity Federation, build and push the image tagged with the commit SHA, `deploy/release.sh` (image pinned by digest, migration job, then service update; if the migration fails the service is not changed), then `deploy/smoke_test.py` on the public URL.

New endpoints for operations: GET /api/ready checks the database (`SELECT 1`), GET /api/version returns the commit SHA built into the image, so the deployed version can be matched to the tag and the CI run.

Configuration. All settings are environment variables (table in README). In production: COOKIE_SECURE=true, CLIENT_DIST_DIR=/app/client/dist, COMMIT_SHA from the build. The seed reads SEED_PASSWORD. Without it the seed uses the local demo password, but it refuses to run with NODE_ENV=production.

## Acceptance criteria and verification

| ID | Criterion | Verification |
|---|---|---|
| AC-46 | `docker build` works from a fresh clone, and the container runs with environment variables only and serves the UI and the API on port 3000. /api/health, /api/ready and /api/version answer. | CI step "Fresh clone runs with .env.example values" (TEST-63) |
| AC-47 | Every Pull Request into main or sprint-*-staging runs the CI job `test-and-docker`: migrate, seed and all server tests on a real PostgreSQL, client build, Docker build. A failing test blocks the merge (required check). | CI run on the PR (TEST-64) |
| AC-48 | A push on main deploys that commit to Cloud Run. /api/version on the public URL returns the same SHA as the commit and the CI run. The smoke test (health, ready, UI, schedules list after login, logout) passes. | deploy.yml run + smoke test output (TEST-65) |
| AC-49 | Data stays after a redeploy (NFR-05): a booking created before the redeploy is still in My bookings after. | Manual check MC-02 |
| AC-50 | No secret in Git, in the image or in the client (NFR-06). The cookie has Secure on Cloud Run. | Review of the repo (`git grep`), `docker history`, response headers (MC-03) |

## Definition of Done

Done when AC-46 to AC-50 are verified on the deployed candidate and the commands, run ids and screenshots are kept in docs/sprints/sprint-2/evidence.
