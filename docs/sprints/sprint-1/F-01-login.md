# F-01 Login, logout and current user - engineering contract

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 5 Nov 2026 | Yohann, Heloise | First version, before implementation. |

Linked requirements: FR-01, FR-02, FR-03, BR-01, BR-02, BR-03, NFR-01, NFR-03. Part of R-01 (access control).

## Feature design

Behavior. A user opens the app and sees the login page. He enters email and password. If they are correct the server creates a session and sends a cookie, and the client goes to the home page of the role (/slots for a student, /staff for a tutor). The header shows the name and the role. The Log out button ends the session and goes back to /login. When the page is reloaded, the client calls GET /api/auth/me to know who is logged in. If it gets 401 it shows the login page.

Rules and validation. Email and password are required (400 if missing). Email is trimmed and lower case before search. Wrong password, unknown email or inactive account all give 401 with the same message "Invalid email or password" (BR-02). The session lasts 8 hours (BR-03). The role is read from the database (BR-01).

Failure and boundary cases. Expired session: treated like no session (401) and the row is deleted. Logout without session: 401. Cookie of a deleted session: 401.

Permissions. Login is public. Logout and me need a valid session.

Dependencies. None, this is the base for F-02 and F-03.

## UI

Login page with two fields and a button "Log in". The button is disabled during the request. An error is shown in a red box above the form. Header (when logged in): "SlotBook", links of the role, "Name (Role)", button "Log out".

## API

| Method and path | Request | Success | Errors |
|---|---|---|---|
| POST /api/auth/login | { email, password } | 200 { id, name, email, role } and Set-Cookie slotbook.sid (httpOnly, sameSite lax, 8 h) | 400 { error: "Email and password are required" }, 401 { error: "Invalid email or password" } |
| POST /api/auth/logout | cookie | 204, cookie cleared, session row deleted | 401 { error: "Authentication required" } |
| GET /api/auth/me | cookie | 200 { id, name, email, role } | 401 { error: "Authentication required" } |

## Data

Tables User and Session (see System SDS). Migration 1 creates the enum Role (STUDENT, STAFF), User and Session. Seed creates 3 tutors and 3 students with bcrypt hashes.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a seeded active user, when he logs in with the right email and password, then the API returns 200 with his id, name, email and role, sets an httpOnly cookie, and the UI shows his name and role and opens the home page of his role. |
| AC-02 | When the password is wrong or the email does not exist, the API returns 401 "Invalid email or password" (same message in both cases) and no session cookie. |
| AC-03 | GET /api/auth/me with a valid session returns the current user without passwordHash. Without a session it returns 401. |
| AC-04 | After logout the API returns 204, the session is deleted, and the same cookie on /api/auth/me returns 401. The UI goes back to the login page. |
| AC-05 | A protected endpoint called without a session (for example GET /api/bookings/mine) returns 401 and the body has only the error message, no data. |
| AC-06 | Passwords in the database are bcrypt hashes and never equal to the plain password. |

Tests: TEST-01 to TEST-08 in sts.md.
