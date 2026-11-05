# Three-sprint plan - SlotBook

Version 1.0, 5 November 2026.

| Sprint | Goal | Features | Depends on | Done when | Checkpoint |
|---|---|---|---|---|---|
| 1 | Small working slice: a tutor publishes a slot and a student books it, with login, roles and database. | F-01, F-02, F-03, R-01 | nothing | A tutor creates a slot, a student books it and sees it, the tutor sees the booking. Double booking, bad slots and wrong roles are refused by the API. Tests pass and the release is merged on main with a tag. | Deliverable 1, 8 Nov |
| 2 | Change bookings and slots, limits and filters, and deployment. | F-04, F-05, F-06, F-07, F-08, R-02 | F-03 for F-04, F-05, F-07, F-08. F-02 for F-06. F-04 before F-05 (move uses cancel logic). | Students can cancel and move bookings with the 12 hours rule, tutors can remove open slots, limits work, the app runs on GCP with CI. | Deliverable 2, 29 Nov (Lab 5 on 15 Nov) |
| 3 | Finish and harden: weekly slots, attendance, summary, quality. | F-09, F-10, F-11, R-03 | F-02 for F-09. F-03 for F-10. F-04 and F-10 for F-11. | All FR are done, regression tests pass, performance and mobile checks done, final release on main. | Progress 29 Nov, final 13 Dec |

## Why this Sprint 1 scope

Sprint 1 must show the full path UI to API to database with real login and two roles. The smallest useful path for a tutoring center is: a tutor publishes a slot, a student books it, both can see the result. So we took F-01 (we cannot do anything without login), F-02 (no slot means nothing to book) and F-03 (the booking itself, with the important rule of one student per slot). Access control R-01 is built at the same time because every endpoint needs it.

We did not put cancellation in Sprint 1. It needs the 12 hours rule and changes the unique booking logic, and we prefer to do it well in Sprint 2. Filters are also not needed while there are few slots. Lab 5 (Docker, CI, GCP) is in Sprint 2 time, so we keep Sprint 2 a bit lighter on new screens.

Risks: we are two and we have exams in December, so Sprint 3 is small on purpose. If we are late, F-09 (weekly slots) is the first feature we would cut, and we would write it in the change log.
