# Traceability - SlotBook

Version 2.2, 25 November 2026: results on the submitted candidate v2.3.0-d2 (a68f7ce = v2.2.0-sprint3 + the Lab 7 change CH-09). Version 2.1 (23 Nov, results on v2.1.0-d2), version 2.0 (22 Nov) and version 1.0 (5 Nov, tag v1.0.0-sprint1) are in Git.

One line per baseline requirement: requirement, feature or responsibility, sprint, acceptance criteria (or NFR check), planned tests, the actual test file, and the result with the version.

Runs used as results: (1) GitHub deploy run 45344515492 on a68f7ce (push of PR #31 into main, 24 Nov 2026): job test-and-docker (typecheck, 5 migrations, seed, 89/89 server tests in 22 files, client build, Docker build, fresh clone with .env.example), job e2e (Playwright 15/15), job deploy (image a68f7ce, migration job, Cloud Run revision slotbook-00006-54x, smoke test, GET /api/version = a68f7ce); 0 failed, 0 skipped. (2) Our local run on a68f7ce, 25 Nov 2026 (Windows 11, Node 24, PostgreSQL 17): typecheck OK, client build OK, server 89/89 on a new empty database, Playwright 15/15. Earlier results: Sprint 1 run in docs/sprints/sprint-1/evidence/final-test-run.txt, Sprint 2 and 3 runs in docs/sprints/sprint-2/evidence and docs/sprints/sprint-3/evidence.

Result words. "Passed v2.3.0-d2" = executed and passed in the two runs above. "First passed vX" = the first release where the test passed. "Planned" = the test is only in the STS. We never use an unrelated green test as coverage.

Files: server tests are in server/tests, E2E in e2e/.

## Functional requirements

| Req | Feature | Sprint | AC | Planned tests | Actual test (file) | Result and version |
|---|---|---|---|---|---|---|
| FR-01 | F-01 Login | 1 | AC-01, AC-02 | TEST-01, 02, 03, 08 | auth.api.test.ts, sprint1.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-02 | F-01 Logout | 1 | AC-04 | TEST-05, 08 | auth.api.test.ts, sprint1.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-03 | F-01 Current user | 1 | AC-03 | TEST-04 | auth.api.test.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-04 | F-02 Create slot | 1 | AC-07 to AC-11 | TEST-09 to 15, 19 | slot-rules.unit.test.ts, slots.api.test.ts, sprint1.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-05 | F-02 Schedule slots list | 1 | AC-13 | TEST-18, 19 | bookings.api.test.ts, sprint1.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-06 | F-03 Available slots | 1 | AC-14 | TEST-22, 30, 94, 96 | bookings.api.test.ts, booking-cutoff.test.ts, sprint1.spec.ts, ch09-cutoff.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-07 | F-03 Book a slot | 1 | AC-15 | TEST-23, 30, 93 | bookings.api.test.ts, booking-cutoff.test.ts, sprint1.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-08 | F-03 My bookings and detail | 1 | AC-15, AC-20 | TEST-23, 28, 30 | bookings.api.test.ts, sprint1.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| FR-09 | F-04 Cancel a booking | 2 | AC-22 to AC-27 | TEST-32 to 39, 67 | cancel-rules.unit.test.ts, cancel.api.test.ts, sprint2.spec.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| FR-10 | F-05 Move a booking | 2 | AC-28 to AC-33 | TEST-40 to 46, 68, 95 | move.api.test.ts, booking-cutoff.test.ts, sprint2.spec.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| FR-11 | F-06 Remove an open slot | 2 | AC-34 to AC-37 | TEST-47 to 51, 69 | remove-slot.api.test.ts, sprint2.spec.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| FR-12 | F-08 Filter availability | 2 | AC-42 to AC-45 | TEST-58 to 62, 70 | filter-rules.unit.test.ts, filter.api.test.ts, sprint2.spec.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| FR-13 | F-09 Weekly slots | 3 | AC-51 to AC-54 | TEST-72 to 76, F-09 UI journey | weekly-rules.unit.test.ts, weekly.api.test.ts, sprint3-final.spec.ts | First passed v2.2.0-sprint3. Passed v2.3.0-d2 |
| FR-14 | F-10 Attendance | 3 | AC-55 to AC-59 | TEST-77 to 83 | attendance-rules.unit.test.ts, attendance.api.test.ts, sprint3.spec.ts | First passed v2.1.0-d2. Passed v2.3.0-d2 |
| FR-15 | F-11 Summary | 3 | AC-60 to AC-63 | TEST-84 to 88 | summary-rules.unit.test.ts, summary.api.test.ts, sprint3-final.spec.ts | First passed v2.2.0-sprint3. Passed v2.3.0-d2 |

## Business rules

| Req | Feature | Sprint | AC | Planned tests | Actual test (file) | Result and version |
|---|---|---|---|---|---|---|
| BR-01 | F-01, R-01 | 1 | AC-03, AC-12, AC-21 | TEST-04, 17, 29 | auth.api.test.ts, slots.api.test.ts, bookings.api.test.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| BR-02 | F-01 | 1 | AC-02, AC-06 | TEST-02, 03, 07 | auth.api.test.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| BR-03 | F-01 | 1 | AC-04 | TEST-05 | auth.api.test.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| BR-04 | F-02, F-06, R-01 | 1, 2 | AC-12, AC-37 | TEST-16, 50 | slots.api.test.ts, remove-slot.api.test.ts | First passed v1.0.0-sprint1 (Sprint 2/3 parts: v2.0.0-sprint2 and later). Passed v2.3.0-d2 |
| BR-05 | F-02 (F-09 later) | 1, 3 | AC-08, AC-52 | TEST-09, 14, 72 | slot-rules.unit.test.ts, slots.api.test.ts | First passed v1.0.0-sprint1 (F-09 part: v2.2.0-sprint3). Passed v2.3.0-d2 |
| BR-06 | F-02 (F-09 later) | 1, 3 | AC-10, AC-52 | TEST-11, 14, 72 | slot-rules.unit.test.ts, slots.api.test.ts | First passed v1.0.0-sprint1 (F-09 part: v2.2.0-sprint3). Passed v2.3.0-d2 |
| BR-07 | F-02 (F-09 later) | 1, 3 | AC-09, AC-52 | TEST-10, 14, 72 | slot-rules.unit.test.ts, slots.api.test.ts | First passed v1.0.0-sprint1 (F-09 part: v2.2.0-sprint3). Passed v2.3.0-d2 |
| BR-08 | F-02, F-06 (F-09 later) | 1, 2, 3 | AC-11, AC-37, AC-52 | TEST-12, 15, 51, 74 | slot-rules.unit.test.ts, slots.api.test.ts, remove-slot.api.test.ts | First passed v1.0.0-sprint1 (F-09 part: v2.2.0-sprint3). Passed v2.3.0-d2 |
| BR-09 | F-03, F-04, F-05 | 1, 2 | AC-16, AC-17, AC-27, AC-31 | TEST-24, 25, 31, 39, 43 | bookings.api.test.ts, cancel.api.test.ts, move.api.test.ts | First passed v1.0.0-sprint1 (Sprint 2/3 parts: v2.0.0-sprint2 and later). Passed v2.3.0-d2 |
| BR-10 (v1.2, CH-09: 3 hours) | F-03, F-05, F-08 | 1, 2, changed in Lab 7 | AC-14, AC-18, AC-30, AC-66 | TEST-20, 22, 26, 42, 92 to 97 | booking-rules.unit.test.ts, bookings.api.test.ts, move.api.test.ts, booking-cutoff.test.ts, e2e/ch09-cutoff.spec.ts | Old 1 hour rule: first passed v1.0.0-sprint1. CH-09: red on ba197c4 (CI 45342645430, TEST-20, 92 to 96 failed), green on 0d62a5c (CI 45343154888). Passed v2.3.0-d2 |
| BR-11 | F-03 | 1 | AC-19 | TEST-21, 27 | booking-rules.unit.test.ts, bookings.api.test.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| BR-12 | F-02, F-03, F-04, F-05, F-10, R-01 | 1, 2, 3 | AC-13, AC-20, AC-26, AC-33, AC-59 | TEST-18, 28, 38, 46, 82 | bookings.api.test.ts, cancel.api.test.ts, move.api.test.ts, attendance.api.test.ts | First passed v1.0.0-sprint1 (Sprint 2/3 parts: v2.0.0-sprint2 and later). Passed v2.3.0-d2 |
| BR-13 | F-07 | 2 | AC-38, AC-39, AC-41, AC-32 | TEST-52, 54, 55, 57, 45 | limit-rules.unit.test.ts, limits.api.test.ts, move.api.test.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| BR-14 | F-07, F-05 | 2 | AC-40, AC-32 | TEST-53, 56, 44 | limit-rules.unit.test.ts, limits.api.test.ts, move.api.test.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| BR-15 | F-04, F-05 | 2 | AC-23, AC-24, AC-29 | TEST-32, 33, 35, 36, 41 | cancel-rules.unit.test.ts, cancel.api.test.ts, move.api.test.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| BR-16 | F-06 | 2 | AC-35, AC-36 | TEST-48, 49 | remove-slot.api.test.ts | First passed v2.0.0-sprint2. Passed v2.3.0-d2 |
| BR-17 | F-10 | 3 | AC-56, AC-57, AC-58 | TEST-77, 79, 80, 81 | attendance-rules.unit.test.ts, attendance.api.test.ts | First passed v2.1.0-d2. Passed v2.3.0-d2 |

## Non-functional requirements

| Req | Feature or responsibility | Sprint | Verification | Planned tests | Actual test or measurement | Result and version |
|---|---|---|---|---|---|---|
| NFR-01 | F-01, R-01 | 1, 2 | AC-05, 401 on new endpoints | TEST-06, 38, 46, 50, 82 | auth.api.test.ts and the Sprint 2/3 API files | First passed v1.0.0-sprint1 (Sprint 2/3 parts: v2.0.0-sprint2 and later). Passed v2.3.0-d2 |
| NFR-02 | R-01 | 1, 2, 3 | AC-12, AC-20, AC-21, AC-26, AC-33, AC-37, AC-59 | TEST-16, 17, 28, 29, 38, 46, 50, 82, 97 | several API files, ch09-cutoff.spec.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| NFR-03 | F-01 | 1 | AC-06 | TEST-07 | auth.api.test.ts | First passed v1.0.0-sprint1. Passed v2.3.0-d2 |
| NFR-04 | F-03, F-07, F-10 | 1, 2, 3 | AC-17, AC-41, AC-58 | TEST-25, 57, 81 | bookings.api.test.ts, limits.api.test.ts, attendance.api.test.ts | First passed v1.0.0-sprint1 (Sprint 2/3 parts: v2.0.0-sprint2 and later). Passed v2.3.0-d2 |
| NFR-05 | R-02 | 1, 2 | MC-01, AC-49 | MC-01, MC-02 | manual: restart (Sprint 1), redeploy on GCP | MC-01 passed v1.0.0-sprint1. MC-02 passed on the deployed v2.2.0-sprint3 (23 Nov): booking 3, created on 3e44e70, was still there after the redeploy run 45165303176 and after deploy run 45176055485 (Figures E-1, E-2). v2.3.0-d2: deploy run 45344515492 ran the migration job (no new migration) and the smoke test passed (/api/ready: db connected). The MC-02 login check is repeated on the final release |
| NFR-06 | R-02 | 2 | AC-46, AC-47, AC-48, AC-50 | TEST-63 to 66, MC-03 | ops.api.test.ts, ci-docker.yml, deploy.yml | TEST-63 to TEST-66 Passed v2.3.0-d2 (deploy run 45344515492: fresh clone, Docker build, smoke test, /api/version = a68f7ce). MC-03 passed on the deployed v2.2.0-sprint3 (cookie slotbook.sid; HttpOnly; Secure; SameSite=Lax); CH-09 did not touch the session code. No production password, key or token in the submitted tree (CH-05) |
| NFR-07 | F-02, F-08 | 1, 2 | AC-10, AC-42 | TEST-11, 58, 60 | slot-rules.unit.test.ts, filter-rules.unit.test.ts, filter.api.test.ts | First passed v1.0.0-sprint1 (Sprint 2/3 parts: v2.0.0-sprint2 and later). Passed v2.3.0-d2 |
| NFR-08 | R-03 | 3 | AC-64 | TEST-89 | performance.api.test.ts (500 slots) | Passed v2.3.0-d2: median 9.8 ms in CI 45344515492, 23.8 ms in our local run (target: below 500 ms) |
| NFR-09 | R-03 | 3 | AC-65 | TEST-90 | sprint3-final.spec.ts (375 x 812, 5 screens) | Passed v2.3.0-d2 (5 screens at 375 x 812 px, no side scroll) |

## Coverage gaps (honest status at this checkpoint)

- Every baseline FR, BR and NFR has at least one executed and passing test on the submitted candidate v2.3.0-d2.
- NFR-08 is measured on our laptop and on the CI runner only, not on Cloud Run (cold starts are not part of the check).
- NFR-05 (MC-02) and NFR-06 (MC-03) need a login on the deployed app. They were checked on the deployed v2.2.0-sprint3 on 23 Nov. On v2.3.0-d2 we only have the smoke test and the checks without login (E.3); the login checks are repeated on the final release.
- The SlotBook UAT by an independent tester is not done yet (planned 12 Dec, see the remaining work).
- On our shared local database one test (TEST-89) failed because of old test rows (FD-05). The results above use a new empty database, like the CI.

## Approved changes

See the register in docs/change-log.md (CH-01 to CH-10; CH-09 is the Lab 7 change request, resolved in v2.3.0-d2, see docs/maintenance/lab-7). None removes a requirement or moves a Sprint 2 feature to Sprint 3.
