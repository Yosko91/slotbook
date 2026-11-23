# Change and defect register - SlotBook

Version 1.0, 22 November 2026. One register for baseline changes (CH) and findings from deployment, UAT and maintenance (FD). Approval: a change is approved when both team members agree in the PR that contains it (the PR link and date are written in the Deliverable 2 report). History is never rewritten: a change gets a new line.

## Accepted Sprint 1 release

Tag `v1.0.0-sprint1`, commit `0f2b680a89321bc947300527bf225259dac9d3c7` (merge of PR #11 sprint-1-staging into main, 7 Nov 2026). Sprint 1 test run: docs/sprints/sprint-1/evidence/final-test-run.txt (34 server tests passed, 5 E2E passed). Continuity on the Deliverable 2 candidate: the Sprint 1 E2E file e2e/sprint1.spec.ts runs again (TEST-71) with all Sprint 1 API tests.

## Baseline changes

| ID | Date | Source | Affected requirement / feature | Change and rationale | Decision | Status | Release | Re-test |
|---|---|---|---|---|---|---|---|---|
| CH-01 | 22 Nov | F-04 contract | FR-09, BR-15 | The SRS gave no time limit and no rule for the reason of a tutor cancel. Decision D-10: a tutor can cancel until the start, reason 5-200 characters required. | Proposed, approval in the F-04 PR | Implemented | to fill: Sprint 2 release | TEST-36 |
| CH-02 | 22 Nov | F-05 contract | FR-10 | Move only inside the same schedule, topic kept, old booking keeps the history "Moved to another slot" (D-11). | Proposed, approval in the F-05 PR | Implemented | to fill | TEST-40, TEST-42 |
| CH-03 | 22 Nov | F-06 contract | FR-11, BR-16, SDS data model | Slot is removed with removedAt (soft delete), not deleted, so cancelled bookings stay for F-11 (D-12). A started slot cannot be removed. | Proposed, approval in the F-06 PR | Implemented | to fill | TEST-47 to TEST-51 |
| CH-04 | 22 Nov | F-10 contract | BR-17 | Attendance cannot be changed once recorded, only ACTIVE bookings (D-14). | Proposed, approval in the F-10 PR | Implemented | to fill | TEST-81 |
| CH-05 | 22 Nov | R-02 review (NFR-06) | Seed, NFR-06 | The Sprint 1 seed had the demo password in the code. Now SEED_PASSWORD comes from the environment (Secret Manager on GCP); the local default is refused when NODE_ENV=production. | Proposed, approval in the R-02 PR | Implemented | to fill | CI seed step, MC-03 |
| CH-06 | 22 Nov | F-07 (BR-13) side effect, local E2E runs | Sprint 1 E2E | With max 3 bookings the Sprint 1 E2E would fail after some runs, because the seeded students keep their bookings. A beforeAll cancels the bookings left by earlier runs. In the local runs, the TEST-31 slot locator also matched a slot ending at the same time ("08:00 - 08:30" contains "08:30"); it now matches "HH:MM - ". Assertions unchanged, no test weakened. The evidence run uses a fresh seeded database. | Proposed, approval in the E2E PR | Implemented | to fill | TEST-71: Sprint 1 E2E 5/5 passed locally 2787383 |
| CH-08 | 22 Nov | npm run typecheck (local) | F-05 code | TS2345: req.params.id typed string or string[] after requireRole. findVisibleBooking takes unknown and converts with Number. Behaviour unchanged. | Fix in the F-05 PR | Done | to fill | typecheck OK, TEST-40 to TEST-46 passed |
| CH-07 | 22 Nov | F-04 contract v1.0 | Booking API shape | The F-04 contract said the field attendance is null "until F-10". In the code the field is added by F-10 itself (absent before). No client used it before F-10. | Documentation fix | Done | to fill | TEST-79 |

## Findings from deployment, UAT and maintenance (Labs 5-7)

| ID | Source | Affected requirement / feature | Finding | Accepted decision | Status | Fix release | Re-test outcome |
|---|---|---|---|---|---|---|---|
| FD-01 | Lab 5 (TokTickIT report, Part 2) | R-02, NFR-06 | On Yohann's laptop the antivirus inspects HTTPS, so npm and apk in docker build did not trust its certificate. | Use the CI runner (fresh clone) for the Docker evidence, same as Lab 5. | Accepted (environment, not a code defect) | n/a | CI step "Fresh clone runs with .env.example values" (TEST-64): to fill |
| FD-02 | Lab 5 | R-02 | In Lab 5 only TokTickIT was deployed; SlotBook had no Docker, CI or GCP deployment at the end of Sprint 1. | Reuse the Lab 5 process for SlotBook in Sprint 2 (R-02). | Resolved in the candidate (to verify on GCP) | to fill | TEST-64 to TEST-66, MC-02 |
| FD-03 | Lab 6 UAT | TO FILL | TO FILL with the real Lab 6 findings (ID, what the tester saw) | TO FILL | TO FILL | TO FILL | TO FILL |
| FD-04 | Lab 7 maintenance | TO FILL | TO FILL with the real Lab 7 findings | TO FILL | TO FILL | TO FILL | TO FILL |
