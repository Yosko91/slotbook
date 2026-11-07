# Traceability - SlotBook

Version 1.0, 5 November 2026. Requirement to feature to sprint and verification. AC and TEST IDs are only given for Sprint 1. For Sprint 2 and 3 the AC and tests will be written in the contract of the feature, before we code it.

| Requirement | Feature or responsibility | Sprint and verification |
|---|---|---|
| FR-01 | F-01 Login | Sprint 1; AC-01, AC-02 / TEST-01, TEST-02, TEST-03, TEST-08 |
| FR-02 | F-01 Logout | Sprint 1; AC-04 / TEST-05, TEST-08 |
| FR-03 | F-01 Current user | Sprint 1; AC-03 / TEST-04 |
| FR-04 | F-02 Create slot | Sprint 1; AC-07 to AC-11 / TEST-09 to TEST-15, TEST-19 |
| FR-05 | F-02 Schedule slots list | Sprint 1; AC-13 / TEST-18, TEST-19 |
| FR-06 | F-03 Available slots | Sprint 1; AC-14 / TEST-22, TEST-30 |
| FR-07 | F-03 Book a slot | Sprint 1; AC-15 / TEST-23, TEST-30 |
| FR-08 | F-03 My bookings and detail | Sprint 1; AC-15, AC-20 / TEST-23, TEST-28, TEST-30 |
| FR-09 | F-04 Cancel a booking | Sprint 2; AC and tests in F-04 contract |
| FR-10 | F-05 Move a booking | Sprint 2; AC and tests in F-05 contract |
| FR-11 | F-06 Remove an open slot | Sprint 2; AC and tests in F-06 contract |
| FR-12 | F-08 Filter availability | Sprint 2; AC and tests in F-08 contract |
| FR-13 | F-09 Weekly slots | Sprint 3; AC and tests in F-09 contract |
| FR-14 | F-10 Attendance | Sprint 3; AC and tests in F-10 contract |
| FR-15 | F-11 Appointment summary | Sprint 3; AC and tests in F-11 contract |
| BR-01 | F-01, R-01 | Sprint 1; AC-03, AC-12, AC-21 / TEST-04, TEST-17, TEST-29 |
| BR-02 | F-01 | Sprint 1; AC-02, AC-06 / TEST-02, TEST-03, TEST-07 |
| BR-03 | F-01 | Sprint 1; AC-04 / TEST-05 |
| BR-04 | F-02, R-01 | Sprint 1; AC-12 / TEST-16 |
| BR-05 | F-02 | Sprint 1; AC-08 / TEST-09, TEST-14 |
| BR-06 | F-02 | Sprint 1; AC-10 / TEST-11, TEST-14 |
| BR-07 | F-02 | Sprint 1; AC-09 / TEST-10, TEST-14 |
| BR-08 | F-02 | Sprint 1; AC-11 / TEST-12, TEST-15 |
| BR-09 | F-03 | Sprint 1; AC-16, AC-17 / TEST-24, TEST-25, TEST-31 |
| BR-10 | F-03 | Sprint 1; AC-18 / TEST-20, TEST-26 |
| BR-11 | F-03 | Sprint 1; AC-19 / TEST-21, TEST-27 |
| BR-12 | F-02, F-03, R-01 | Sprint 1; AC-13, AC-20 / TEST-18, TEST-28 |
| BR-13 | F-07 Booking limits | Sprint 2; F-07 contract |
| BR-14 | F-07 Booking limits | Sprint 2; F-07 contract |
| BR-15 | F-04, F-05 | Sprint 2; F-04 and F-05 contracts |
| BR-16 | F-06 | Sprint 2; F-06 contract |
| BR-17 | F-10 | Sprint 3; F-10 contract |
| NFR-01 | F-01, R-01 | Sprint 1; AC-05 / TEST-06 |
| NFR-02 | R-01 | Sprint 1; AC-12, AC-20, AC-21 / TEST-16, TEST-17, TEST-28, TEST-29 |
| NFR-03 | F-01 | Sprint 1; AC-06 / TEST-07 |
| NFR-04 | F-03 | Sprint 1; AC-17 / TEST-25 |
| NFR-05 | R-02 | Sprint 1 manual check MC-01, then Sprint 2 after deployment (Lab 5) |
| NFR-06 | R-02 | Sprint 2 (Lab 5); review of .env.example and Docker setup |
| NFR-07 | F-02 | Sprint 1; AC-10 / TEST-11 |
| NFR-08 | R-03 | Sprint 3; timed API test |
| NFR-09 | R-03 | Sprint 3; Playwright screenshots at 375 px |

## Coverage gaps and changes

All FR, BR and NFR of the baseline have a feature or a responsibility and a sprint. Nothing is uncovered at this version. NFR-05 is only partly verified in Sprint 1 (manual restart check), the full check comes with the deployment in Lab 5.

Approved changes: none yet. Changes will be written here with the date and the reason.
