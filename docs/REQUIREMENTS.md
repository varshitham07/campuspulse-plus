# CampusPulse+ — Consolidated Product Requirements

## Product promise
CampusPulse+ is an institution-owned campus communication, verification and navigation platform. Its connected flow is:

**DISCOVER → VERIFY → NAVIGATE → ACT**

It solves scattered campus information across WhatsApp groups, faculty messages, club groups and notice boards.

## Signature experience
An exam venue changes from Auditorium 1 to Auditorium 2 while a student is travelling:
1. Authorized source posts the change.
2. Affected students receive a real-time notification.
3. The affected event destination updates.
4. An active navigation session is rerouted using the campus route graph.
5. The notification explains the action: e.g. “Continue to Auditorium 2.”

## Registration and approval
- Students self-register by filling the registration form.
- Required student data includes name, email, mobile, student ID, department, year, class/section and password.
- Server generates a unique registration token/reference ID.
- Registration is `pending` and cannot authenticate.
- Student shows the token to college admin.
- Admin searches/reviews the token and submitted details.
- Admin approves or rejects.
- Only approved, active accounts can log in.
- The token is an application identifier, not an authentication credential.
- Departments/classes/sections are institution-controlled data; students select from the available choices.

## Authentication
- Password is the normal authentication method.
- OTP is a backup/recovery mechanism only for already-approved active accounts.
- OTP can never bypass approval.
- Access tokens should be short-lived.
- Refresh sessions should use an HttpOnly cookie and server-side session storage.
- Login, registration, refresh, logout and recovery must be rate-limited and audited where appropriate.

## Identity, responsibility and scope
Base identities:
- Student
- Teacher
- Admin

Club leadership is a scoped responsibility, not a flattened global role.
- A student may also be Club President.
- A student may also be Club VP.
- A faculty member may also be a Faculty/Club Coordinator.
- A person can hold multiple responsibilities at once.
- Club leaders are restricted to their assigned club.
- Admin controls club approval and leadership assignment.

## Permissions
### Student
- Receive personalized campus, department, year, class and club notifications.
- Browse announcements, events, clubs and map.
- Join clubs and register for events/forms.
- Report incidents and confirm/reject community reports.
- Use new-student route mode.

### Teacher
- Send alerts to their permitted department and/or assigned classes.
- Manage assigned academic communications.
- Officially verify/reject incident reports when permitted.
- A faculty member does not need club membership to use faculty tools.

### Club President / VP
- Manage only assigned club.
- Publish club announcements.
- Create/manage events.
- Manage club posters/media.
- Maintain club links.
- Create forms and review form responses.
- Communicate to club members and other institution-approved scopes.
- Retain ordinary student capabilities.

### Faculty Coordinator
- Retains faculty identity and faculty permissions.
- Has additional scoped coordination responsibility for the assigned club.

### Admin
- Approve/reject student registrations.
- Manage users and base identities.
- Approve clubs.
- Assign/reassign club president/VP responsibilities.
- Manage departments/classes/sections.
- Manage campus locations and route graph.
- Manage official/emergency communication.
- Review audit log and operational delivery information.

## Communications
- Real-time Socket.IO notifications.
- Persistent notification rows so offline users do not miss messages.
- Targeting by campus, department, year, class/group, topic, club and event where institutionally permitted.
- Critical mobile presentation should be prominent.
- Every important alert should answer “what should I do next?”
- Authors may delete/soft-delete their own permitted content, with audit logging and backend authorization.
- Audience resolution is always enforced server-side.

## Verification and incidents
- Reports start unverified.
- Community users can confirm or reject.
- Confidence score is derived from actual responses.
- Officially verified is distinct from community verified.
- AI may suggest category, urgency and duplicate-report candidates but never independently declare something true.

## Clubs and events
- Admin-controlled club registration and approval.
- Club President and VP are scoped to the approved club.
- Workshops, competitions, recruitment drives and other activities are first-class events.
- Events can have posters/media, links, location, capacity and registration.
- Club forms support questions and response review.

## Navigation
- Campus-specific location directory.
- Predefined route graph stored in the database.
- Dijkstra/A* style routing.
- New-student shortcuts to major destinations.
- Active navigation sessions can be linked to events.
- Verified venue changes can trigger a route update.

## UI / visual direction
- Institution-ready, professional and human-designed.
- Light interface.
- Deep navy/charcoal text and professional blue accent.
- Green/amber/red used semantically.
- Avoid excessive gradients, glassmorphism, neon styling and oversized rounding.
- Avoid fake charts/statistics.
- Strong typography and information hierarchy.
- Clear loading, error, empty and success states.
- Responsive on desktop and mobile.
- Accessible focus states and semantic labels.

## Engineering principles
- Backend authorization is the source of truth.
- No frontend-only permission checks as security.
- Use foreign keys, indexes, unique constraints and timestamps.
- Keep controllers/services/routes modular.
- Validate inputs and handle errors consistently.
- Do not leave fake functionality or placeholder buttons for core workflows.
- Do not commit secrets.
- Keep deployment configuration environment-driven.

## Core workflows to test before production
1. Student registers → token generated → pending → admin approves → student logs in.
2. Student registers → admin rejects → login remains blocked with an appropriate message.
3. Student who is also President still sees student features plus only their club tools.
4. Teacher sends a class/department alert → only permitted recipients receive it.
5. Club leader edits only their assigned club → another club remains inaccessible.
6. Student reports incident → peers confirm → confidence changes → authorized faculty/admin can verify.
7. Exam venue change → affected students notified → event location updates → active route recalculates.
8. Offline notification exists in persistent inbox and realtime toast appears for online users.
9. Deactivation/role changes immediately affect backend authorization.
10. Refreshing the browser preserves an approved session through secure refresh-session flow.

## Latest product decisions — September 2026

### Student onboarding
Students self-register. The server generates a unique reference token. The registration remains pending until an admin verifies and approves it. The token never authenticates the account. Approved users remain signed in through refresh sessions; OTP is the preferred re-entry path for an already-approved account.

### Club responsibility model
President, Vice President and Faculty Coordinator are scoped responsibilities layered on top of the person's normal identity. Admin appoints the President and Faculty Coordinator. The President can delegate Vice President or additional club-access responsibilities within the same club. No club leader can manage another club.

### Faculty scope
Teachers can message their own department, or one class for which they are formally assigned as Class Teacher. A Faculty Coordinator is still a teacher and additionally receives the same club-scoped management capability as the President/VP for their assigned club.

### Announcement deletion
The sender or an administrator can delete an announcement. Deletion is soft-recorded for audit purposes and its notification rows are removed so the alert disappears from recipient views everywhere.

### UI quality
Interactive controls must remain directly typeable/clickable and never be covered by visual layers. The interface uses colorful but professional campus-life imagery, clear hierarchy, responsive layouts, accessible focus states and real content rather than fake dashboard statistics.
