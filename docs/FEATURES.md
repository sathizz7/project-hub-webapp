# ProjectHub — Current Features Documentation

## Context

ProjectHub is a frontend prototype built by an IT-company CEO to capture the features he wants in a personalized app for managing his organization. This document inventories every feature currently present in the prototype at `D:\work-space\task\ProjectHub` so that the team has a shared, written reference of what the client expects before any production build begins.

The doc is descriptive only — it records what the prototype does, not what it should do. New features and changes are deliberately out of scope for this pass and will be discussed separately later.

---

## Tech Stack (as built)

- **Framework:** Next.js 16.2.2 (App Router), React 19, TypeScript 5
- **UI:** Tailwind CSS 4, shadcn/ui, @base-ui/react, Lucide icons
- **Data:** Prisma 7 ORM with SQLite (better-sqlite3); LibSQL adapter available for remote DB
- **AI:** `@anthropic-ai/sdk` — Claude API integration
- **Routing:** Next.js App Router (file-based, dynamic segments)

> **Prototype caveat:** The Prisma schema and `/api/*` routes exist, but most pages still render from `mock-data.ts` rather than the database. The app currently has no authentication — the CEO user (Rahul) is hardcoded and all routes are open.

---

## Navigation Structure (as built)

The left sidebar groups pages into five sections:

```
OVERVIEW   → Command Center, CEO Calendar
PROJECTS   → Projects (list), New Project
REVIEWS    → Review Queue                    [badge: pending count]
TEAM       → Team, Manage Team, Leave & Availability
AI         → AI Capture                      [badge: pending items]
```

Footer shows "Prototype Mode" tag and the logged-in CEO.

---

## Feature Inventory

### 1. Command Center (Dashboard) — `/`

The CEO's home screen. Aggregates everything that needs attention.

- **Stat cards:** Active Projects, Pending Reviews, Completed Projects, Team Members
- **Alerts panel:** overdue projects, pending reviews
- **Project list (embedded):** filter by person/type/status; sort by priority, deadline, recent, alphabetical, progress
- **Team strip:** member cards with performance score and avg response time
- **AI Insights feed:** items typed as `risk`, `opportunity`, `blocker`, `performance`, or `suggestion`, each with severity and action items
- **Leave analytics summary**
- **Pending capture items queue**
- Visual cues: pulsing indicator for `critical` priority; color-coded type/status badges

---

### 2. CEO Calendar — `/calendar`

Unified time view of the organization.

- **Views:** Month and Week (toggle), Today button, prev/next navigation
- **Events surfaced on the calendar:** project milestones, project start/end dates, phase start/end dates, leave requests, capture-item due dates, deadline extensions, review tasks, checkpoint review dates
- **Day click:** opens detail panel listing all events for that day with type icon, color, and link to source record
- **Color legend:** milestones (blue), leaves (red/orange), deadlines (amber), reviews (purple), capture items (green)
- Display-only in the prototype — no drag/drop or in-place edit

---

### 3. Projects List — `/projects`

Browseable card grid of all projects.

- **Card content:** title, type badge, status badge, priority dot, assignee avatars, milestone/phase progress bar, days-remaining countdown, tech-stack chips
- **Filters:** project type, status
- **Sort:** priority, deadline, recent, alphabetical, progress
- **Status palette:** `active` (emerald), `completed` (green), `killed` (red), `paused` (amber)
- **Project types supported:** engineering, research, mixed, data_science, design, sales, marketing, operations, hr, legal, strategy, product, finance
- **CTA:** "New Project" button → creation wizard

---

### 4. New Project Wizard — `/projects/new`

Five-tab creation flow with AI assistance.

1. **Project Basics** — title, type, requirement/scope, priority, timebox days (default 14)
2. **AI Plan Generation** — `Generate with AI` button calls `/api/ai/generate-plan`; returns a summary, milestones (with `targetDay`), tech stack, tasks (phase + estimatedDays), risks (with mitigation + severity), and kill criteria. Falls back to a template plan when the API is unavailable. Output is editable.
3. **Tech Stack & Team** — add/remove tech items, `Suggest Tech Stack` AI button (`/api/ai/suggest-stack`), assign team members via checkboxes
4. **Phase Setup** — pre-filled phase templates per project type (e.g., Engineering: Requirements → Design → Development → Review → Deploy → Done; Research: Hypothesis → Exploration → Experiment → Evaluation → Report → Done). Phase names and per-phase checklists are editable.
5. **Success & Kill Criteria** — editable lists defining what counts as success and the conditions under which the project should be abandoned/pivoted

`Create Project` saves and redirects to the project detail page.

---

### 5. Project Detail Workspace — `/projects/[id]`

The most feature-dense screen in the app. Single project, multiple sub-sections.

#### 5.1 Header
Title with type/status/priority badges, timebox countdown, start date, current phase, assignee count, phase progress %.

#### 5.2 Overview
Project objective/requirement, expected outcome type and description, final outcome status, list of intermediate submissions, and checkpoint history (continue/kill/pivot decisions with notes).

#### 5.3 Phases
- Phase cards with status: `pending`, `active`, `in_discussion`, `completed`
- Per-phase checklist (item + done flag)
- Sign-off tracking (who signed off, when)
- Per-phase discussion thread
- Per-phase attachments (documents, MOMs, feedback, proof, architecture, prototype)
- Actions: edit phase, complete phase, change status

#### 5.4 Tasks & Milestones
- **Task fields:** title, description, assignee, phase, approach, AI-generated plan, plan status (`ai_generated` / `being_refined` / `finalized`), priority, status (`planning`, `in_progress`, `completed`, `blocked`, `killed`, `redefined`), estimated vs revised hours, review status, outcome
- **Task steps:** description, expected outcome, category (design / dev / review / testing / deployment / documentation / research / integration), estimatedHours, per-step status (pending / in_progress / completed / blocked / skipped), assignee, review status
- **Milestones (nested in task):** title, description, deliverable type (code / document / ppt / text / meeting_notes / data), success criteria, status, target day, deliverables, outcome, outcome notes

#### 5.5 Submissions & Feedback
- Submission types: `document`, `code`, `architecture`, `notebook`, `demo`, `status_update`, `meeting_notes`
- Submission status: `submitted`, `reviewed`, `approved`, `needs_revision`
- Feedback per submission (CEO-written or AI-generated, distinguished by `isAi` flag), with extractable action items
- Threaded review comments

#### 5.6 Documents & Requirements
- Document types: `requirement`, `design`, `technical_roadmap`, `architecture`, `api_spec`, `meeting_notes`, `research`, `test_plan`, `deployment`, `user_guide`, `custom`
- Document lifecycle status: `draft`, `in_review`, `approved`, `active`, `archived`
- Version control with full change history
- Section-level edits and per-section discussions
- Change-impact analysis structure

#### 5.7 Deadline Extensions
- Pending extension requests showing original deadline, requested deadline, reason, and impact
- **Reason types:** `personal`, `other_commitments`, `task_complexity`, `dependency_blocked`, `scope_change`, `technical_challenge`
- **Status:** `pending`, `approved`, `rejected`, `auto_escalated`
- CEO comment + approval action; escalation level tracking

#### 5.8 Discussions & Notes
Linked threaded discussions per section — typed as question / clarification / suggestion / feedback.

---

### 6. Review Queue — `/reviews`

Single inbox for the CEO to clear submissions awaiting feedback.

- **Tabs:** All, Code, Documents, Demonstrations
- **Per-submission row:** project, title, type icon, submitter avatar, submitted date, current feedback count
- **Actions:** open submission, write feedback, `AI-generate feedback` button (`/api/ai/review`), change status (`submitted` → `reviewed` → `approved` / `needs_revision`), link related submissions

---

### 7. Team Overview — `/team`

Roster of every member except the CEO.

- **Card content:** avatar, name, role, email, department, performance score (0–100, color-graded), avg response time, active project count, recent submission count
- **Performance color bands:** ≥90 green ("Excellent"), ≥80 blue ("Good"), ≥70 amber ("Average"), <70 red ("Needs Improvement")
- **Department breakdown** chart
- Click-through to member profile

---

### 8. Team Member Profile — `/team/[id]`

Per-person detail page.

- Header: avatar, name, role, email, department
- Performance dashboard
- Currently assigned projects
- Submission history (type, status, date)
- Feedback received (count + summary)
- Leave request summary and upcoming leave dates
- Embedded `LeaveAnalytics` impact view
- Task history and completion rate
- Peer feedback highlights

---

### 9. Manage Team — `/team/manage`

Admin surface for the people configuration.

- **Members:** add (modal: name, email, role, department, avatar color), edit, delete; member cards grouped with department counts
- **Roles:** add/remove. Predefined seed list includes CEO, CTO, VP Engineering, Engineering Manager, Full-Stack / Backend / Frontend / DevOps Engineer, Senior Data Scientist, Data Scientist, ML Engineer, Data Analyst, Product Designer, UX Researcher, UI Designer, Product Manager, Project Manager, Marketing Lead, Content Strategist, Strategy Analyst, Business Analyst, QA Engineer, Security Engineer, Solutions Architect, Technical Writer, HR Manager, Finance Analyst, Legal Counsel, Operations Manager
- **Departments:** add/remove. Predefined seed list: Leadership, Engineering, Data Science, Design, Product, Marketing, Strategy, Operations, HR, Finance, Legal, Sales, Research, QA, Security, General
- 8-color avatar palette

---

### 10. Leave & Availability — `/team/availability`

The most distinctive HR feature in the prototype: leave requests are tied to project impact.

- **Leave request form:** member, leave type (`planned` / `sick` / `personal` / `wfh` / `half_day`), date range, reason, coverage plan, contingency note, coverage person
- **Requests list:** member, type, dates, status (`pending` / `approved` / `rejected`), CEO approve/reject actions, impact summary
- **Impact analysis (per request):** affected task or milestone, project context, original deadline, cascading effects (who else is delayed, by how many days, why), risk assessment
- **Availability calendar:** team availability per date — `available`, `on_leave`, `wfh`, `half_day`, `public_holiday`, color-coded
- **Team availability matrix:** members × dates grid for the month

---

### 11. AI Capture — `/capture`

Free-text dictation that gets parsed into structured items.

- **Input:** large textarea + `Process` button; example template provided
- **Item types extracted (keyword/regex parser):**
  - `todo` — assign / task / build / implement / fix / update
  - `follow_up` — report / deliver / send / submit / by [day] / due
  - `commitment` — committed / promised / agreed / will deliver / guarantee
  - `meeting` — meeting / discuss / call / sync / standup / 1:1
  - `review_reminder` — review / check / verify / approve / audit
  - `timeline` — deadline / milestone / launch / go-live / ship by
- **Smart extraction:** team-member mentions (matched against roster), department inference from context, dates ("by Friday", "next week", "end of month", "in X days", explicit day names), priority inferred from type + deadline presence, auto-generated title
- **Per-item card:** type badge, priority badge, title, description, assignees, department, due date, status; edit / dismiss / convert actions
- **Conversion:** capture item → task / review / project (preserves assignees, dates, department)
- **Session history:** past capture sessions with timestamps and bulk dismiss

---

## Cross-Cutting Concerns

### AI Integration (Claude API)
Three implemented backend endpoints, each with a graceful template fallback:
- `POST /api/ai/generate-plan` — full project plan (summary, milestones, tech stack, tasks, risks, kill criteria)
- `POST /api/ai/review` — submission feedback
- `POST /api/ai/suggest-stack` — tech stack recommendations
- AI Capture parser is regex-based, not LLM-based.

### API Routes Defined
```
GET/POST  /api/projects
GET/POST  /api/projects/[id]
GET/POST  /api/users
GET/POST  /api/phases
GET/POST  /api/submissions
GET/POST  /api/feedback
GET/POST  /api/checkpoints
POST      /api/ai/generate-plan
POST      /api/ai/review
POST      /api/ai/suggest-stack
```

### Design System
- Geist Sans / Geist Mono fonts
- Status colors: green (completed), red (killed/blocked), amber (pending/warning), slate (neutral)
- Type-specific accent colors (Engineering blue, Research/DS purple, Design pink, Marketing rose, etc.)
- Card-based layout, responsive grid, fixed 264px sidebar

### Authentication
**Not implemented.** CEO user is hardcoded; no login screen, sessions, roles, or protected routes.

### Currently Mock-Driven
Pages render from `mock-data.ts` rather than calling the API routes. The Prisma seed exists but is not wired into the UI flow. Form submissions update in-memory mock data, not the database.

---

## Suggested Logical Grouping

The prototype's current 5-section sidebar is reasonable but mixes setup with daily-use surfaces. A grouping that mirrors how a CEO would actually use the app each day:

### Group A — Daily Cockpit (high-frequency, "what needs me right now")
- Command Center (dashboard)
- Review Queue
- AI Capture
- CEO Calendar

### Group B — Work (the projects themselves)
- Projects (list)
- New Project
- Project Detail (deep workspace)

### Group C — People (the team and their availability)
- Team Overview
- Team Member Profile
- Leave & Availability

### Group D — Configuration (low-frequency setup)
- Manage Team (members, roles, departments)

**Why this grouping:** Daily Cockpit collects every surface the CEO opens multiple times a day; Work and People are the two domains the cockpit pulls from; Configuration is rarely-touched setup. The current sidebar splits Capture into its own "AI" group and buries Calendar under Overview — both belong together with the other daily surfaces.

---

## Verification

This document is descriptive. To verify completeness, walk the running prototype and confirm every page, tab, button, and badge listed above is present:

```
cd D:\work-space\task\ProjectHub
npm install
npm run dev
```

Then visit each route in the Navigation Structure section and cross-check against the matching feature subsection.

---

## Out of Scope (deferred)

- New feature ideas — to be discussed in a follow-up session
- Production-readiness gaps (auth, real DB wiring, notifications, mobile, role-based views) — noted under "Cross-Cutting Concerns" but not prescribed here
- Refactors and code-quality changes
