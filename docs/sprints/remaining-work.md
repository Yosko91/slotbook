# Remaining work until the final release (13 December 2026)

Version 1.2, 23 November 2026 (after the Sprint 3 implementation). Final examination period: 1 to 11 December, so the main work is planned before 1 December and the last days are only for bounded completion, re-tests and the video. Owners: one name per line. Reviewer of every PR: the other team member.

Status words: Planned, In progress, Implemented, Tested, Accepted (see docs/features.md).

| Feature or defect | Current status (29 Nov) | Remaining action | Depends on | Owner | Target |
|---|---|---|---|---|---|
| F-04, F-05, F-06, F-07, F-08 | Accepted in v2.0.0-sprint2 (b731f38), re-tested on v2.1.0-d2 | Re-run in final regression only | none | Heloise (code), Yohann (review) | 13 Dec |
| R-02 | Accepted, deployed v2.1.0-d2 (deploy run 45164306339), MC-02 passed (redeploy run 45165303176), MC-03 passed | Repeat version, smoke and MC-02 checks on the final release | final release | Heloise | 13 Dec |
| F-10 Attendance | Accepted in v2.1.0-d2 (AC-55 to AC-59, TEST-77 to TEST-83 passed) | Re-run in final regression; F-11 uses its data | none | Heloise (code), Yohann (review) | done 23 Nov |
| F-11 Summary | Tested locally fd54b33 (AC-60 to AC-63, TEST-84 to TEST-88) | Review, CI and acceptance in the Sprint 3 release | F-10 | Heloise (code), Yohann (review) | 24 Nov |
| F-09 Weekly slots | Tested locally fd54b33 (AC-51 to AC-54, TEST-72 to TEST-76) | Review, CI and acceptance in the Sprint 3 release | F-02 | Heloise (code), Yohann (review) | 24 Nov |
| R-03 Quality | Tested locally fd54b33 (AC-64, AC-65, TEST-89, TEST-90) | Review and CI; repeat TEST-89 and TEST-90 on the final release | all screens | Heloise (code), Yohann (review) | 24 Nov, re-run 12 Dec |
| FD-03 Lab 6 UAT findings | Lab 6 finding F-B1 was in TokTickIT, fixed and re-tested ACCEPTED (22 Nov); SlotBook UAT cases planned | Decide each finding, fix or defer with reason, re-test | Lab 6 report | Yohann | 30 Nov |
| FD-04 Lab 7 CH-09 (booking closes 3 h before) | In progress (change request, contract revision, tests TEST-92 to 95 prepared; not merged) | Instructor approval, review, merge into sprint-3-staging, full regression | F-03, F-05 | Heloise | 30 Nov |
| UAT re-tests | Planned | Re-run the Lab 6 UAT scenarios on the final candidate and record the outcome | F-09, F-11, FD-03 | Yohann | 12 Dec |
| Final regression and release | Planned | Full test suite and E2E on the final commit, release PR sprint-3-staging into main, tag v3.0.0-final, deployment check | everything above | both | 13 Dec |
| Final video | Planned | Record the main journeys on the deployed final version | final release | both | 13 Dec |