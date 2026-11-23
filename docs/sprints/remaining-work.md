# Remaining work until the final release (13 December 2026)

Version 1.0, 22 November 2026. Final examination period: 1 to 11 December, so the main work is planned before 1 December and the last days are only for bounded completion, re-tests and the video. Owners are filled in by the team (one name per line). Reviewer of every PR: the other team member.

Status words: Planned, In progress, Implemented, Tested, Accepted (see docs/features.md).

| Feature or defect | Current status (29 Nov) | Remaining action | Depends on | Owner | Target |
|---|---|---|---|---|---|
| F-04, F-05, F-06, F-07, F-08 | Implemented, to be Tested and Accepted in the Sprint 2 release | Done 23 Nov: PR #12 to #19 approved by Yohann, CI run 45142422096 green on the release PR #20, tag v2.0.0-sprint2 | none | Heloise (code), Yohann (review) | 23 Nov |
| R-02 | Implemented | First deployment done 22 Nov (Cloud Shell); deploy.yml from main 23 Nov; MC-02, MC-03 to record | Sprint 2 release on main | Heloise, Yohann (GitHub environment demo) | 28 Nov |
| F-10 Attendance | Implemented (AC-55 to AC-59), tests written | Reviewed PR into sprint-3-staging, CI on the PR | Sprint 2 release | Heloise (code), Yohann (review) | 23 Nov |
| F-11 Summary | Planned (contract, AC-60 to AC-63, TEST-84 to TEST-88) | Write tests first (red), implement summarize + endpoint + Summary view, E2E | F-10 | TO FILL | 30 Nov |
| F-09 Weekly slots | Planned (contract, AC-51 to AC-54, TEST-72 to TEST-76) | Write tests first, implement weekly endpoint (all or nothing) and the Repeat select | F-02 | TO FILL | 30 Nov |
| R-03 Quality | Planned (AC-64, AC-65, TEST-89, TEST-90) | Timed API test with 500 slots, Playwright 375 px checks, CSS fixes for wide tables | all screens done | TO FILL | 12 Dec |
| FD-03, FD-04 (Labs 6-7) | TO FILL | Fix or decide each finding, re-test | TO FILL | TO FILL | 12 Dec |
| UAT re-tests | Planned | Re-run the UAT scenarios of Lab 6 on the final candidate and record the outcome | F-09, F-11 | TO FILL | 12 Dec |
| Final regression and release | Planned | Full test suite and E2E on the final commit, release PR sprint-3-staging into main, tag v3.0.0-final, deployment check | everything above | both | 13 Dec |
| Final video | Planned | Record the main journeys on the deployed final version | final release | both | 13 Dec |
