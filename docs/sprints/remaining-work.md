# Remaining work until the final release (13 December 2026)

Version 1.3, 25 November 2026 (after the merge of CH-09 in v2.3.0-d2; version 1.2 of 23 Nov is in Git). Final examination period: 1 to 11 December, so the main work is planned before 1 December and the last days are only for bounded completion, re-tests and the video. Owners: one name per line. Reviewer of every PR: the other team member.

Status words: Planned, In progress, Implemented, Tested, Accepted (see docs/features.md).

| Feature or defect | Current status (29 Nov) | Remaining action | Depends on | Owner | Target |
|---|---|---|---|---|---|
| F-04, F-05, F-06, F-07, F-08 | Accepted in v2.0.0-sprint2 (b731f38), re-tested on v2.3.0-d2 (deploy run 45344515492) | Re-run in final regression only | none | Heloise (code), Yohann (review) | 13 Dec |
| R-02 | Accepted in v2.0.0-sprint2; v2.3.0-d2 deployed by run 45344515492 (smoke test passed, /api/version = a68f7ce); MC-02 and MC-03 last passed on v2.2.0-sprint3 (23 Nov) | Repeat version, smoke, MC-02 and MC-03 checks on the final release | final release | Heloise | 13 Dec |
| F-10 Attendance | Accepted in v2.1.0-d2 (AC-55 to AC-59, TEST-77 to TEST-83), re-tested on v2.3.0-d2 | Re-run in final regression; F-11 uses its data | none | Heloise (code), Yohann (review) | done 23 Nov |
| F-11 Summary | Accepted in v2.2.0-sprint3 (AC-60 to AC-63, TEST-84 to TEST-88), re-tested on v2.3.0-d2 | Re-run in the final regression | F-10 | Heloise (code), Yohann (review) | done 23 Nov |
| F-09 Weekly slots | Accepted in v2.2.0-sprint3 (AC-51 to AC-54, TEST-72 to TEST-76), re-tested on v2.3.0-d2 | Re-run in the final regression | F-02 | Heloise (code), Yohann (review) | done 23 Nov |
| R-03 Quality | Accepted in v2.2.0-sprint3 (AC-64, AC-65); on v2.3.0-d2 TEST-89 median 9.8 ms in CI, TEST-90 passed | Repeat TEST-89 and TEST-90 on the final release | all screens | Heloise (code), Yohann (review) | re-run 12 Dec |
| FD-03 Lab 6 UAT findings | Lab 6 finding F-B1 was in TokTickIT, fixed and re-tested ACCEPTED (22 Nov); SlotBook UAT cases planned | Decide each finding, fix or defer with reason, re-test | Lab 6 report | Yohann | 30 Nov |
| FD-04 Lab 7 CH-09 (booking closes 3 h before) | Accepted in v2.3.0-d2 (PR #31, a68f7ce, deploy run 45344515492; TEST-92 to TEST-97 passed); Issue #30 closed on 26 Nov | Re-run in the final regression | none | Heloise (code), Yohann (review) | done 24 Nov |
| FD-05 Shared local test database | Accepted (environment); "fresh database" note added to the README test section on 25 Nov | Use a new empty database for the final evidence runs | none | Yohann | 12 Dec |
| UAT re-tests | Planned | Re-run the Lab 6 UAT scenarios on the final candidate and record the outcome | F-09, F-11, FD-03 | Yohann | 12 Dec |
| Final regression and release | Planned | Full test suite and E2E on the final commit, release PR sprint-3-staging into main, tag v3.0.0-final, deployment check | everything above | both | 13 Dec |
| Final video | Planned | Record the main journeys on the deployed final version | final release | both | 13 Dec |
