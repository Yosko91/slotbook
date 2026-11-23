# R-03 Quality hardening - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 22 Nov 2026 | Heloise | First version. Status at the checkpoint of 29 Nov: planned. |
| 1.1 | 23 Nov 2026 | Yohann MOSCATO, Heloise SAVOYE | Authors corrected: team document of both members (written by Heloise with AI assistance, reviewed and approved by Yohann in the PR). |

Linked requirements: NFR-08, NFR-09. Responsibility, not a screen.

## Design

NFR-08 performance. An API test creates a schedule with 500 future open slots (createMany), warms up once, then calls GET /api/schedules/:id/available-slots 5 times and checks that the median time is below 500 ms on the local machine and on the CI runner. The index (scheduleId, startsAt) of Sprint 1 is used. If it fails, we look at the query plan (EXPLAIN ANALYZE) before changing code.

NFR-09 usability. A Playwright file runs at viewport 375 x 812 on Login, Find a session, My bookings, Booking detail and My schedules. On each page it checks `document.documentElement.scrollWidth <= 375` (no horizontal scroll) and saves a screenshot. Wide tables get `overflow-x: auto` inside their card, so the page itself does not scroll.

## Acceptance criteria and verification

| ID | Criterion | Verification |
|---|---|---|
| AC-64 | With 500 slots in the schedule, the median answer time of available-slots is below 500 ms. | TEST-89 (API, timed) |
| AC-65 | The five main screens have no horizontal page scroll at 375 px width. | TEST-90 (E2E, screenshots) |
