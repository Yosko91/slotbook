# Traceability - SlotBook

Version 2.0, 22 November 2026 (Deliverable 2). Version 1.0 (5 Nov) is kept in Git history (tag v1.0.0-sprint1).

One line per baseline requirement: requirement, feature or responsibility, sprint, acceptance criteria (or NFR check), planned tests, the actual test file, and the result with the version.

Local run of 22 Nov 2026 on commit 2787383 (Windows 11, Node 24, PostgreSQL 17): typecheck OK, server 72/72 passed (16 files), client build OK, Playwright 10/10 passed on a fresh seeded database. Logs: docs/sprints/sprint-2/evidence/. GitHub CI confirmation: run 45141574150 (PR #19) and run 45142422096 (release PR #20, commit e279602) passed test-and-docker (typecheck, migrate, seed, all server tests, client build, Docker build, fresh clone) and e2e (Playwright). Release tag v2.0.0-sprint2 = b731f38.

Result words. "Passed v1.0.0-sprint1" = executed and passed on the Sprint 1 release (evidence in docs/sprints/sprint-1/evidence/final-test-run.txt). "Passed locally 2787383" = executed and passed in the local run above. "Planned" = the test is only in the STS. In the Deliverable 2 report, "Passed locally 2787383" is replaced by the real result (Passed / Failed / Skipped) and the commit of the run. We never use an unrelated green test as coverage.

Files: server tests are in server/tests, E2E in e2e/.

## Functional requirements

| Req | Feature | Sprint | AC | Planned tests | Actual test (file) | Result and version |
|---|---|---|---|---|---|---|
| FR-01 | F-01 Login | 1 | AC-01, AC-02 | TEST-01, 02, 03, 08 | auth.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-02 | F-01 Logout | 1 | AC-04 | TEST-05, 08 | auth.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-03 | F-01 Current user | 1 | AC-03 | TEST-04 | auth.api.test.ts | Passed v1.0.0-sprint1 |
| FR-04 | F-02 Create slot | 1 | AC-07 to AC-11 | TEST-09 to 15, 19 | slot-rules.unit.test.ts, slots.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-05 | F-02 Schedule slots list | 1 | AC-13 | TEST-18, 19 | bookings.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-06 | F-03 Available slots | 1 | AC-14 | TEST-22, 30 | bookings.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-07 | F-03 Book a slot | 1 | AC-15 | TEST-23, 30 | bookings.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-08 | F-03 My bookings and detail | 1 | AC-15, AC-20 | TEST-23, 28, 30 | bookings.api.test.ts, sprint1.spec.ts | Passed v1.0.0-sprint1 |
| FR-09 | F-04 Cancel a booking | 2 | AC-22 to AC-27 | TEST-32 to 39, 67 | cancel-rules.unit.test.ts, cancel.api.test.ts, sprint2.spec.ts | Passed locally 2787383 |
| FR-10 | F-05 Move a booking | 2 | AC-28 to AC-33 | TEST-40 to 46, 68 | move.api.test.ts, sprint2.spec.ts | Passed locally 2787383 |
| FR-11 | F-06 Remove an open slot | 2 | AC-34 to AC-37 | TEST-47 to 51, 69 | remove-slot.api.test.ts, sprint2.spec.ts | Passed locally 2787383 |
| FR-12 | F-08 Filter availability | 2 | AC-42 to AC-45 | TEST-58 to 62, 70 | filter-rules.unit.test.ts, filter.api.test.ts, sprint2.spec.ts | Passed locally 2787383 |
| FR-13 | F-09 Weekly slots | 3 | AC-51 to AC-54 | TEST-72 to 76 | none yet | Planned (final verification before 13 Dec) |
| FR-14 | F-10 Attendance | 3 | AC-55 to AC-59 | TEST-77 to 83 | attendance-rules.unit.test.ts, attendance.api.test.ts, sprint3.spec.ts | Passed locally 2787383 |
| FR-15 | F-11 Summary | 3 | AC-60 to AC-63 | TEST-84 to 88 | none yet | Planned (final verification before 13 Dec) |

## Business rules

| Req | Feature | Sprint | AC | Planned tests | Actual test (file) | Result and version |
|---|---|---|---|---|---|---|
| BR-01 | F-01, R-01 | 1 | AC-03, AC-12, AC-21 | TEST-04, 17, 29 | auth.api.test.ts, slots.api.test.ts, bookings.api.test.ts | Passed v1.0.0-sprint1 |
| BR-02 | F-01 | 1 | AC-02, AC-06 | TEST-02, 03, 07 | auth.api.test.ts | Passed v1.0.0-sprint1 |
| BR-03 | F-01 | 1 | AC-04 | TEST-05 | auth.api.test.ts | Passed v1.0.0-sprint1 |
| BR-04 | F-02, F-06, R-01 | 1, 2 | AC-12, AC-37 | TEST-16, 50 | slots.api.test.ts, remove-slot.api.test.ts | Sprint 1 part passed v1.0.0-sprint1; F-06 part written, not run |
| BR-05 | F-02 (F-09 later) | 1, 3 | AC-08, AC-52 | TEST-09, 14, 72 | slot-rules.unit.test.ts, slots.api.test.ts | Passed v1.0.0-sprint1; F-09 part planned |
| BR-06 | F-02 (F-09 later) | 1, 3 | AC-10, AC-52 | TEST-11, 14, 72 | slot-rules.unit.test.ts, slots.api.test.ts | Passed v1.0.0-sprint1; F-09 part planned |
| BR-07 | F-02 (F-09 later) | 1, 3 | AC-09, AC-52 | TEST-10, 14, 72 | slot-rules.unit.test.ts, slots.api.test.ts | Passed v1.0.0-sprint1; F-09 part planned |
| BR-08 | F-02, F-06 (F-09 later) | 1, 2, 3 | AC-11, AC-37, AC-52 | TEST-12, 15, 51, 74 | slot-rules.unit.test.ts, slots.api.test.ts, remove-slot.api.test.ts | Sprint 1 part passed; TEST-51 written, not run; F-09 part planned |
| BR-09 | F-03, F-04, F-05 | 1, 2 | AC-16, AC-17, AC-27, AC-31 | TEST-24, 25, 31, 39, 43 | bookings.api.test.ts, cancel.api.test.ts, move.api.test.ts | Sprint 1 part passed; Sprint 2 part written, not run |
| BR-10 | F-03, F-05 | 1, 2 | AC-18, AC-30 | TEST-20, 26, 42 | booking-rules.unit.test.ts, bookings.api.test.ts, move.api.test.ts | Sprint 1 part passed; TEST-42 written, not run |
| BR-11 | F-03 | 1 | AC-19 | TEST-21, 27 | booking-rules.unit.test.ts, bookings.api.test.ts | Passed v1.0.0-sprint1 |
| BR-12 | F-02, F-03, F-04, F-05, F-10, R-01 | 1, 2, 3 | AC-13, AC-20, AC-26, AC-33, AC-59 | TEST-18, 28, 38, 46, 82 | bookings.api.test.ts, cancel.api.test.ts, move.api.test.ts, attendance.api.test.ts | Sprint 1 part passed; others written, not run |
| BR-13 | F-07 | 2 | AC-38, AC-39, AC-41, AC-32 | TEST-52, 54, 55, 57, 45 | limit-rules.unit.test.ts, limits.api.test.ts, move.api.test.ts | Passed locally 2787383 |
| BR-14 | F-07, F-05 | 2 | AC-40, AC-32 | TEST-53, 56, 44 | limit-rules.unit.test.ts, limits.api.test.ts, move.api.test.ts | Passed locally 2787383 |
| BR-15 | F-04, F-05 | 2 | AC-23, AC-24, AC-29 | TEST-32, 33, 35, 36, 41 | cancel-rules.unit.test.ts, cancel.api.test.ts, move.api.test.ts | Passed locally 2787383 |
| BR-16 | F-06 | 2 | AC-35, AC-36 | TEST-48, 49 | remove-slot.api.test.ts | Passed locally 2787383 |
| BR-17 | F-10 | 3 | AC-56, AC-57, AC-58 | TEST-77, 79, 80, 81 | attendance-rules.unit.test.ts, attendance.api.test.ts | Passed locally 2787383 |

## Non-functional requirements

| Req | Feature or responsibility | Sprint | Verification | Planned tests | Actual test or measurement | Result and version |
|---|---|---|---|---|---|---|
| NFR-01 | F-01, R-01 | 1, 2 | AC-05, 401 on new endpoints | TEST-06, 38, 46, 50, 82 | auth.api.test.ts and the Sprint 2/3 API files | Sprint 1 passed; new endpoints written, not run |
| NFR-02 | R-01 | 1, 2, 3 | AC-12, AC-20, AC-21, AC-26, AC-33, AC-37, AC-59 | TEST-16, 17, 28, 29, 38, 46, 50, 82 | several API files | Sprint 1 passed; new paths written, not run |
| NFR-03 | F-01 | 1 | AC-06 | TEST-07 | auth.api.test.ts | Passed v1.0.0-sprint1 |
| NFR-04 | F-03, F-07, F-10 | 1, 2, 3 | AC-17, AC-41, AC-58 | TEST-25, 57, 81 | bookings.api.test.ts, limits.api.test.ts, attendance.api.test.ts | Sprint 1 passed; TEST-57 and TEST-81 written, not run |
| NFR-05 | R-02 | 1, 2 | MC-01, AC-49 | MC-01, MC-02 | manual: restart (Sprint 1), redeploy on GCP | MC-01 passed v1.0.0-sprint1; MC-02 not done yet |
| NFR-06 | R-02 | 2 | AC-46, AC-47, AC-48, AC-50 | TEST-63 to 66, MC-03 | ops.api.test.ts, ci-docker.yml, deploy.yml | TEST-63 passed locally 2787383; TEST-64 to TEST-66 need the CI and the deployment |
| NFR-07 | F-02, F-08 | 1, 2 | AC-10, AC-42 | TEST-11, 58, 60 | slot-rules.unit.test.ts, filter-rules.unit.test.ts, filter.api.test.ts | Sprint 1 passed; F-08 part written, not run |
| NFR-08 | R-03 | 3 | AC-64 | TEST-89 | none yet | Planned |
| NFR-09 | R-03 | 3 | AC-65 | TEST-90 | none yet | Planned |

## Coverage gaps (honest status at this checkpoint)

- Uncovered by any written test at this checkpoint: FR-13 (F-09), FR-15 (F-11), NFR-08 and NFR-09 (R-03). They have contracts, AC and planned tests (Sprint 3 STS) and are in the remaining-work plan (docs/sprints/remaining-work.md) for 13 December.
- BR-05 to BR-08 are covered for single slots; the weekly series (F-09) part is planned.
- NFR-05 deployed check (MC-02) and NFR-06 deployment checks need the first deployment of the candidate on GCP.
- The local results are confirmed by the CI run (test-and-docker) of the release PR before the PDF is submitted.

## Approved changes

See docs/change-log.md (CH-01 to CH-06). None removes a requirement or moves a Sprint 2 feature to Sprint 3.
