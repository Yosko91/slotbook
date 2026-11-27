# CH-09 Change request - booking cutoff 3 hours (Lab 7)

Version 1.1, 25 November 2026 (Issue, commits, review and release filled in after the merge of PR #31; version 1.0 of 23 Nov is in Git). Authors: Heloise SAVOYE, Yohann MOSCATO (team document, written by Heloise with AI assistance, reviewed by Yohann).
GitHub Issue: #30. Type: adaptive/perfective maintenance (changed requirement, not a defect).

## 1. Request

| Item | Value |
|---|---|
| Original requirement | BR-10 (SRS v1.0/1.1): "Booking closes 1 hour before the slot starts. A past slot or a slot starting in less than 1 hour cannot be booked." Delivered in Sprint 1 by F-03 (AC-14, AC-18), tested by TEST-20, TEST-22, TEST-26. |
| Implemented rule (pre-change) | `server/src/rules/bookingRules.ts`: `CLOSE_BEFORE_MS = 60 * 60 * 1000`, `isBookingOpen` = `startsAt - now >= 1 h`. Duplicated in `server/src/routes/schedules.ts` (`openFrom = now + 60 * 60 * 1000`). |
| New rule | BR-10 v1.2: a slot can be booked, or chosen as the new slot of a move, only if `startsAt - now >= 3 hours`. |
| Boundaries | exactly 3:00 before start: allowed. 2:59 before start: refused 422 BOOKING_CLOSED. Past slot: refused (unchanged). |
| Invalid cases | slot < 3 h: POST /api/bookings and POST /api/bookings/:id/move answer 422 `{ error: "Booking is closed for this slot (less than 3 hours before the start)", code: "BOOKING_CLOSED" }`, nothing stored or changed. The available slots list (with or without F-08 filters) does not show these slots. |
| Access | Unchanged: only STUDENT can book or move (403 for STAFF, 401 anonymous). Ownership unchanged (BR-12, 404 for another student's booking). The check is on the backend. |
| Reason | With 1 hour, the tutor often reads the topic only when the student arrives, so he cannot prepare the exercise. 3 hours gives time to prepare. |
| Scope | One constant and its 3 uses (book, move target, available slots). No new screen, no new endpoint, no migration. |
| Out of scope | Cancel/move 12 h rule of the student (BR-15), tutor cancel, attendance, slot creation rules BR-05 to BR-08. |
| Acceptance criteria | AC-14 v1.1, AC-18 v1.1, AC-30 v1.1, new AC-66 (see F-03 v1.1, F-05 v1.1). |
| Approval | Team: Yohann MOSCATO agrees in Issue #30 (24 Nov 2026 06:45 UTC) and approves the revised contract in PR #31 (24 Nov 06:46 UTC). On 25 Nov 2026 (after the merge) Heloise also e-mailed the change request to the instructor and TAs; TA Kantapat Suwannahong answered at 11:48 Bangkok time: "For Lab 7, you do not need to have the instructor or TAs check or approve your work. You can proceed directly." |

## 2. Versions

| Role | Tag / commit |
|---|---|
| Accepted Sprint 1 baseline (old behaviour) | `v1.0.0-sprint1`, `0f2b680` (7 Nov 2026) |
| Actual pre-change implementation | `v2.2.0-sprint3` / main `df91bee` (23 Nov 2026). BR-10 code identical to Sprint 1, plus the move route of F-05 that reuses `isBookingOpen` |
| Contract revision | `d8dbe36` docs(CH-09), 23 Nov 2026, branch maintenance/CH-09-booking-cutoff, reviewed in PR #31 on 24 Nov 06:46 UTC before the fix |
| Red tests | `ba197c4` test(CH-09): CI run 45342645430 failed as expected (server: TEST-20, TEST-92 to TEST-95 failed, 84 passed; E2E: TEST-96 failed, 14 passed) |
| Fix | `0d62a5c` feat(CH-09): CI run 45343154888 passed (89 server tests, 15 E2E) |
| Main release / deployed revision | PR #31 merged into main 24 Nov 2026 06:59 UTC = `a68f7ce`, tag `v2.3.0-d2`. Deploy run 45344515492: Cloud Run revision slotbook-00006-54x, smoke test passed, GET /api/version = a68f7ce |

Intervening development between 0f2b680 and df91bee: Sprint 2 (F-04 to F-08, R-02, v2.0.0-sprint2), F-10 (v2.1.0-d2), Sprint 3 (F-09, F-11, R-03, v2.2.0-sprint3). Not part of this maintenance.

## 3. Impact

| Req. | Feature | SRS / Feature SDS / System SDS | AC | STS tests | Code | Impact |
|---|---|---|---|---|---|---|
| BR-10, D-05 | F-03 book | SRS §5, §8; F-03 contract "Business rules", API table | AC-18, AC-66 | TEST-20 (revised), TEST-26 (kept), TEST-92, TEST-93, TEST-96 (E2E) | rules/bookingRules.ts, routes/bookings.ts POST / | Changed: limit and message |
| FR-06 | F-03 available slots | F-03 "Behavior", AC-14 | AC-14 | TEST-22 (kept), TEST-94 | routes/schedules.ts available-slots | Changed: duplicated 1 h constant replaced by the shared rule |
| FR-12 | F-08 filter | F-08 workflow, AC-42 | AC-42 | TEST-58 to TEST-62 (kept) | routes/schedules.ts (same query) | Indirect: same query, filter logic unchanged |
| FR-10 | F-05 move | F-05 workflow, BR-10 line, AC-30 | AC-30 | TEST-42 (kept: 30 min slot), TEST-95 | routes/bookings.ts POST /:id/move | Changed: new slot needs 3 h |
| BR-12, NFR-02 | F-03, F-05 access | F-03 AC-20, AC-21 | AC-20, AC-21 | TEST-28, TEST-29 (kept), TEST-97 (E2E) | middleware/auth.ts | Not changed, protected by regression |
| BR-09, NFR-04 | F-03 concurrency | D-07, partial unique index | AC-16, AC-17 | TEST-24, TEST-25 (kept) | bookingTx.ts, migration 3 | Not changed |
| BR-13, BR-14 | F-07 limits | F-07 order of checks | AC-38 to AC-41 | TEST-52 to TEST-57 (kept) | rules/bookingRules.ts | Not changed (check order unchanged) |
| FR-13, FR-15 | F-09 weekly slots, F-11 summary (Sprint 3) | F-09, F-11 contracts | - | TEST-72 to TEST-76, TEST-84 to TEST-87 (kept) | weeklyRules.ts, summaryRules.ts | Not applicable: slot creation and counts do not use BR-10; checked with grep, kept in the regression run |
| BR-15 | F-04 cancel | F-04 | AC-22 to AC-27 | TEST-32 to TEST-39 | canChangeBooking | Not applicable: separate 12 h rule |
| UI | F-03 / F-05 pages | - | - | e2e/sprint1.spec.ts, sprint2.spec.ts (TEST-71) | client/src/pages/FindSession.tsx, BookingDetail.tsx | No text about 1 hour in the client; the client shows what the API returns, and E2E slots are days ahead. Nothing to change |
| Persistence / data | - | System SDS data model | - | - | prisma/schema.prisma | Not applicable: no column changes. Historical data: bookings made 1-3 h before start stay ACTIVE and valid; the rule is checked only when a booking is created. No migration |
| Seed | - | - | - | - | prisma/seed.ts | Not applicable: seeded slots are days ahead or in the past |
| Deployment / config | R-02 | NFR-06 | - | TEST-64 to TEST-66 | Dockerfile, workflows | Not applicable: no new variable (the limit is a business rule, not configuration) |

## 4. Behaviour that must stay the same

One active booking per slot under concurrency (TEST-24, TEST-25), topic 5-200 (TEST-21, TEST-27), a student sees only his bookings and gets 404 for others (TEST-28), tutor 403 / anonymous 401 (TEST-06, TEST-29), max 3 upcoming and no overlap (TEST-52 to TEST-57), move rules other than BR-10 (TEST-40, 41, 43 to 46), filters (TEST-58 to TEST-62), Sprint 1 to 3 E2E journeys (TEST-71, TEST-91). The regression suite is the full server suite `npm test` plus `npm run e2e`, because every file uses the same booking path.

## 5. Review of the revised contract (before implementation)

| Reviewer | Date | Comment | Answer |
|---|---|---|---|
| Yohann MOSCATO | 24 Nov 2026 06:46 UTC (PR #31, before the fix commit) | "BR-10 boundary is clear: exactly 3:00 is allowed, 2:59 is refused. AC-66 tests both sides (TEST-92, TEST-93). Good catch in the impact table: the 1 hour limit was written a second time in schedules.ts. One shared constant is better. TEST-20 changes its expected result (60 min: true -> false); this is explained in STS v1.1, OK for me. The move (F-05) also uses the new limit, covered by TEST-95. Contract OK, you can implement." | Fix commit 0d62a5c pushed after the review; PR approved on 24 Nov 06:56 UTC |

Decision: approved (contract review 24 Nov 06:46 UTC, PR approval 24 Nov 06:56 UTC).
