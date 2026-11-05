# Feature inventory - SlotBook

Version 1.0, 5 November 2026.

| ID | Feature | Short description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Login, logout and current user | Login with email and password, server session in a cookie, logout, current user API and header in the UI. | FR-01, FR-02, FR-03, BR-01, BR-02, BR-03, NFR-01, NFR-03 | none | 1 |
| F-02 | Tutor availability slots | Tutor creates slots in his schedules and sees the upcoming slots with their booking. | FR-04, FR-05, BR-04 to BR-08, BR-12, NFR-07 | F-01 | 1 |
| F-03 | Book a tutoring slot | Student sees available slots of a schedule, books one with a topic, sees his bookings and the detail. | FR-06, FR-07, FR-08, BR-09 to BR-12, NFR-04 | F-01, F-02 | 1 |
| R-01 | Access control (responsibility) | Role and ownership checks on every protected endpoint. Not a screen, it is part of each feature and tested in each sprint. | BR-01, BR-04, BR-12, NFR-01, NFR-02 | F-01 | 1 (set up), checked in 2 and 3 |
| F-04 | Cancel a booking | Student cancels his booking, tutor cancels a booking of his schedule with a reason. The slot is open again. | FR-09, BR-15 | F-03 | 2 |
| F-05 | Move a booking | Student moves his booking to another open slot of the same schedule in one step. | FR-10, BR-09, BR-15 | F-03, F-04 | 2 |
| F-06 | Remove an open slot | Tutor removes a slot that has no active booking. | FR-11, BR-16 | F-02 | 2 |
| F-07 | Booking limits | Max 3 active upcoming bookings and no overlapping bookings for one student. | BR-13, BR-14 | F-03 | 2 |
| F-08 | Filter availability | Filter available slots by date range and tutor. | FR-12 | F-03 | 2 |
| R-02 | Deployment and configuration (responsibility) | Docker image, env variables, Cloud SQL, data kept after redeploy. Done in Lab 5. | NFR-05, NFR-06 | F-01 | 2 |
| F-09 | Weekly slots | Create the same slot every week for N weeks, each week checked with the slot rules. | FR-13, BR-05 to BR-08 | F-02 | 3 |
| F-10 | Attendance | Tutor marks a past booking as attended or no-show. | FR-14, BR-17 | F-03 | 3 |
| F-11 | Appointment summary | Counts per schedule and date range for the tutor. | FR-15 | F-04, F-10 | 3 |
| R-03 | Quality hardening (responsibility) | Performance check of the availability API and responsive screens. | NFR-08, NFR-09 | all | 3 |
