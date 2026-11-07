# Product Definition of Done

Version 1.0, 5 November 2026. This applies to every feature of every sprint.

A feature is done only when all of this is true. The behavior written in its contract is implemented and works in the UI, the API and the database. The planned tests of the STS are written and executed, and they pass. We look at the test code ourselves, a test that checks nothing does not count. Tests for rules that matter were written first and we kept the failing result (TDD). The feature was done on its own branch from sprint staging, with an Issue that links the contract, and the PR was reviewed by the other team member with a real comment (what was checked or a question). The author does not approve his own PR. After merge in staging, all tests run again on staging. The README and the documents (contract, traceability) are up to date. Anything not finished, failing or skipped is written in the PR and in the report, not hidden.

A sprint is done when all its features are done, the staging branch is merged in main with a reviewed release PR, the release is tagged, and the build and test commands were run on this exact commit and the result is kept.

Evidence we keep for each feature: the contract commit before the code, the failing test output (TDD), the passing test output with the commit id, the PR with the review, and screenshots for the E2E journeys.
