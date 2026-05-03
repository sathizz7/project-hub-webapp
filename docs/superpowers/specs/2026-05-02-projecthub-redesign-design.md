# ProjectHub Redesign — Design Spec

**Date:** 2026-05-02
**Status:** Approved (brainstorming complete)
**Source feature inventory:** [docs/FEATURES.md](../../FEATURES.md)

---

## Context

The existing prototype at `D:\work-space\task\ProjectHub` was built by an IT-company CEO to capture the features he wants in a personalized org-management app. The functionality is rich, but the UI is intentionally minimal — flat shadcn defaults, hardcoded CEO user, no auth, no role-based views, mock-data only. This redesign keeps the entire feature surface (see `docs/FEATURES.md`) and rebuilds the frontend with a polished, modern SaaS UI plus a real role-based experience for both the CEO and his team members.

The goal is a frontend that is (a) production-credible, (b) interactive without being decorative, and (c) usable by two distinct audiences sharing the same app.

---

## Locked decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Visual direction | Modern SaaS / Linear-like — premium, productive, dense-but-readable |
| Audience | CEO + team members, role-based views in one app |
| Theme mode | Both light and dark, **light by default** |
| Density | Comfortable (14px body, generous-but-not-airy spacing) |
| Device target | Desktop-first, mobile responsive (no separate mobile app) |
| Navigation | Daily Cockpit grouping (4 sections, role-aware) |
| Accent color | Indigo 600 (`#4F46E5`) |
| Dashboard layout | Inbox-first cockpit |

---

## Implementation status

- **2026-05-02:** Plan 1 (Foundations) merged on `feature/foundations` — design tokens (light + dark), `ThemeProvider`/`ThemeToggle`, `AppShell` (Sidebar + Topbar + role-aware nav config), `CommandPalette` (⌘K), shared primitives (`KPIStat`, `ProjectCard`, `TaskRow`, `ActionInboxItem`, `InsightCard`, `PhaseTracker`, `PageHeader`, `EmptyState`), `/design-demo` showcase route. 10 RTL tests pass. Legacy sidebar removed from root layout (old prototype pages are visually broken until Plans 4–7 replace them).
- **2026-05-02 (later):** Plan 2 (Auth + role gating) merged on `feature/auth` — Auth.js v5 Credentials provider + JWT sessions, `User.passwordHash` and `User.roleType` in Prisma, `/login` page, route-gating proxy middleware (JWT-only, Edge-safe), `/api/auth/[...nextauth]`, `(app)` protected layout with server-side session redirect, role-router landing (CEO stub vs. team-member stub), `signOut` wired in `UserMenu`. 22 tests across 9 files pass. Legacy `src/app/page.tsx` archived to `_archive/`.
- **2026-05-03:** Plan 3 (Data foundation) merged on `feature/data` — Prisma extended with `Task`, `LeaveRequest`, `DeadlineExtension`, `CaptureSession`, `CaptureItem` (+ `CaptureItemAssignee` join table). Server query helpers under `src/lib/queries/` for tasks, leaves, extensions, capture, unified action inbox, and derived performance metrics. Re-seeded with realistic data (12 tasks, 6 leaves, 3 extensions, 2 capture sessions / 6 items). 47 tests across 16 files pass. No UI changes — Plans 4–7 will consume these helpers from Server Components.
- **2026-05-03 (later):** Plan 4 (CEO Command Center) merged on `feature/ceo-command-center` — replaces CEO landing stub with a full Server Component: 7 parallel Prisma queries, real KPIs, `TodayWeekCard` (active leaves + this-week tasks), Action Inbox (`getActionInbox` unified feed), heuristic AI Insights (4 rules from DB state), horizontal active-projects strip with progress + days-remaining. CEO ⌘K shortcuts auto-generated in `SessionShell`. 74 tests across 18 files.
- **2026-05-03 (later):** Plan 5 (Project Workspace) merged on `feature/project-workspace` — replaces 4 373-line legacy monolith with a Server Component + 5 live data tabs (Overview, Phases, Tasks, Submissions, Extensions) + 2 empty-state stubs (Documents, Discussions) + in-page right-rail activity/signals. New routes: `PATCH /api/tasks/[id]`, `PATCH /api/deadline-extensions/[id]`. 84 tests across 20 files.

---

## Design system foundations

### Color tokens (light + dark parity)

- **Surface:** `bg`, `bg-subtle`, `bg-muted`, `border`, `border-strong` — neutral slate scale
- **Text:** `fg`, `fg-muted`, `fg-subtle`
- **Accent:** indigo-600 primary (`#4F46E5`), with `accent-fg`, `accent-soft` (10% tint)
- **Semantic:** success (emerald-600), warning (amber-500), danger (rose-600), info (sky-600). Used only for status indicators and never for primary CTAs.

### Typography

- **Geist Sans** for UI, **Geist Mono** for code/IDs (already shipped in prototype)
- Scale: 12 / 13 / 14 (body) / 16 / 18 / 20 / 24 / 30 / 36
- Headings: tight tracking, semibold. Body: regular 14px / 1.5 line-height.

### Spacing & shape

- 4px base unit, scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48
- Radius: 6px (controls), 8px (cards), 12px (modals/sheets), full (pills)

### Elevation & motion

- Three shadow tiers: flat, `sm` (cards), `lg` (popovers/menus). No heavy shadows.
- 150ms ease-out for color/opacity. 200ms cubic-bezier for layout shifts. Subtle 1px hover lifts; spring on toggles.

### Component library

Reuse from existing shadcn/ui: Button, Input, Select, Tabs, Dialog, Sheet, Tooltip, DropdownMenu, Card, Badge, Avatar, Progress, ScrollArea, Checkbox, Separator.

New custom components to build:

- **AppShell** — sidebar + topbar + main + optional right-rail
- **KPIStat** — number, delta, sparkline
- **ActionInboxItem** — unified row for review / capture / extension
- **ProjectCard** — compact + expanded variants
- **PhaseTracker** — horizontal stepper with status pills
- **TaskRow** — checkbox + title + assignee + due + priority dot
- **InsightCard** — severity stripe + icon + actions
- **CommandPalette** — global ⌘K search/jump
- **EmptyState** — illustration + headline + CTA
- **PageHeader** — breadcrumb + title + actions slot

---

## Information architecture

Two distinct experiences in one app, gated by `User.role`.

### CEO experience

```
DAILY COCKPIT
  /                       Command Center (inbox-first)
  /reviews                Review Queue
  /capture                AI Capture
  /calendar               Org Calendar

WORK
  /projects               Projects list
  /projects/new           New Project wizard
  /projects/[id]          Project workspace (tabbed sub-nav)

PEOPLE
  /team                   Team overview (roster + performance)
  /team/[id]              Member profile
  /team/availability      Leave & Availability + impact analysis

CONFIGURATION
  /settings/team          Manage Team (members, roles, departments)
  /settings/profile       Personal profile + theme + notifications
  /settings/integrations  API keys, AI settings (future)
```

### Team-member experience

```
MY WORK
  /                       My Today
  /my-tasks               My tasks across projects (kanban + list)
  /my-submissions         My submissions + feedback received
  /capture                AI Capture (personal)
  /calendar               My Calendar

PROJECTS
  /projects               Projects I'm assigned to
  /projects/[id]          Project workspace (edit only my tasks)

ME
  /me                     My profile + leave requests + performance
  /team                   Read-only roster
  /settings/profile       Profile + theme + notifications
```

### Cross-cutting

- **Topbar (both roles):** Logo, ⌘K command palette, search, notifications bell, theme toggle, avatar menu
- **Right rail (CEO project workspace; team-member my-tasks):** contextual — discussions, AI insights for the open record, recent activity
- **Auth:** NextAuth v5, email/password Credentials provider, role on the `User` row. No SSO in v1.
- **Permission rule of thumb:** team members read most things, write only on records they own.

---

## Key page layouts

### Command Center (CEO `/`)

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar: Logo  ⌘K Search ......................  🔔  ☀  Avatar │
├────────┬─────────────────────────────────────────────────────┤
│        │ Good morning, Rahul.                Today, May 2     │
│ SIDEBAR│ ┌──────┬──────┬──────┬──────┐ ┌──────────────────┐  │
│        │ │Active│Pendng│Compl.│ Team │ │  Today & Week    │  │
│        │ │  12  │   7  │  34  │  8   │ │ 3 milestones     │  │
│        │ │ ↗ +2 │ 🔴 3 │ ↗ +5 │  -   │ │ 2 leaves Mon     │  │
│        │ └──────┴──────┴──────┴──────┘ └──────────────────┘  │
│        │ ┌──────────────────────┐  ┌──────────────────────┐  │
│        │ │  Action Inbox    [12]│  │  AI Insights    [5]  │  │
│        │ │  Review · Capture ·  │  │  Risk · Opportunity  │  │
│        │ │  Extension rows      │  │  Suggestion cards    │  │
│        │ │  (urgency-sorted)    │  │                      │  │
│        │ └──────────────────────┘  └──────────────────────┘  │
│        │ Active Projects (horizontal strip)                  │
└────────┴─────────────────────────────────────────────────────┘
```

- Action Inbox interleaves Reviews + Capture + Extensions sorted by urgency (priority + age). Each row has a one-tap primary action.
- AI Insights right column, type-coded with a severity stripe.
- Project strip is horizontal scroll, compact ProjectCard variant.

### Project Workspace (`/projects/[id]`)

`PageHeader` (title, type/status/priority chips, current phase) + horizontal **tabbed sub-nav** (Overview · Phases · Tasks · Submissions · Documents · Extensions · Discussions) + collapsible **right rail** (Activity feed + AI insights for this project).

- **Overview:** objective + expected outcome + success/kill criteria as two columns; Final Outcome status block; intermediate submissions timeline; checkpoint history.
- **Phases:** horizontal PhaseTracker at top; expanded card per phase below — checklist, sign-off, attachments, discussion thread.
- **Tasks:** Kanban (columns = phase or status, toggle) + list view. TaskRow expands inline to show steps + milestones. Drag to reorder/reassign.
- **Submissions:** chronological feed grouped by phase. Click → right Sheet with full review thread.
- **Documents:** sidebar list of docs, main pane is the doc reader with section anchors and per-section discussion icons. Version dropdown.
- **Extensions:** list of pending/historical requests, inline approve/reject with comment.
- **Discussions:** unified thread view across all linked discussions.

### Review Queue (`/reviews`)

Page header (count + tabs: All · Code · Docs · Demos), submissions grouped by date (Today / Yesterday / Earlier). Each row: type icon, project, title, submitter avatar, age, prior reviews count, actions (`AI feedback`, `Open`). Click → right Sheet drawer with submission detail and AI-drafted feedback (one click to accept/edit). Sheet keeps the queue in place behind it.

### AI Capture (`/capture`)

Two-pane: left input (large textarea + Process button + example chip strip), right parsed items grouped by type (Todo / Follow-up / Commitment / Meeting / Review / Timeline). Inline edit per item; bulk actions (Convert all to tasks, Dismiss all, Send to project). Session history collapsed below.

### Team & Leave

- **`/team`:** grid of MemberCards (avatar, name, role, dept, perf score gauge, active projects, response time). Filter by department, sort by name/perf.
- **`/team/availability`:** week strip on top (today's availability dots), Leave Requests list (pending highlighted, inline approve/reject), right rail Impact Analysis cascade chart for selected request, month-view availability matrix at bottom.

### Team-member My Today (`/`)

Same shell as CEO. KPIs: Tasks today / Pending reviews of my work / Upcoming leaves. Sections: My Tasks Today (checklist), Awaiting CEO review, Recent feedback, My week ahead (calendar slice).

---

## Stitch generation plan

Stitch MCP server is configured (`stitch` HTTP transport, `✓ Connected`).

1. **Create Stitch project** — "ProjectHub Redesign"
2. **Create design system** — indigo primary, Geist body+headline, ROUND_EIGHT, LIGHT mode, with a `designMd` block describing tokens, density, motion, semantic colors
3. **Generate 13 screens** (desktop), each with explicit content prompt:
   - CEO: Command Center, Review Queue, AI Capture, Org Calendar, Projects List, New Project Wizard, Project Workspace, Team Overview, Member Profile, Leave & Availability, Manage Team
   - Team member: My Today, My Tasks (kanban)
4. **Generate variants** for the 3 highest-impact screens (Command Center, Project Workspace, My Today) — `generate_variants` with REFINE creative range, 2 variants each, focused on LAYOUT
5. **Record screen IDs** in `docs/stitch-screens.md` so the implementation team can reopen them

---

## Implementation tech (locked)

- Next.js 16 App Router + React 19 + TypeScript (keep)
- Tailwind 4 + shadcn/ui + @base-ui/react (keep, extend)
- `next-themes` for light/dark toggle (new)
- **NextAuth (Auth.js v5)** — email/password Credentials provider, role on User (new)
- Prisma 7 + SQLite local, Postgres-ready for prod (extend schema with `User.passwordHash` + `User.role`)
- Replace mock-data with real DB calls during the rebuild — wire all pages to existing/new `/api/*` routes
- `cmdk` for the ⌘K command palette (new)
- `framer-motion` optional (Tailwind transitions may suffice)
- Keep Anthropic SDK + AI routes as-is

**Build approach:** in-place inside the existing repo. Old prototype pages move to `app/_legacy/*` for reference; new pages progressively replace them in `app/`. Delete `_legacy` after the rebuild merges.

---

## Out of scope for this spec

- New features beyond the prototype's surface — deferred to a separate brainstorming pass
- Mobile-only flows / PWA / native apps
- SSO, MFA, audit logging
- Real-time collaboration (presence, live cursors)
- Notifications delivery (email/Slack/push) — UI surface only

---

## Verification

After implementation, the redesign is "done" when:

1. Every page in the IA above is reachable under the correct role
2. Theme toggle works on every page in both light and dark
3. CEO and team-member roles see distinct landing pages (`/` resolves differently)
4. All data flows through Prisma — no `mock-data.ts` imports remain
5. Auth gate works: unauthenticated users redirect to `/login`; team members can't access CEO-only routes
6. ⌘K command palette opens from any page
7. Stitch screens visually match the implemented pages (manual side-by-side review)

---

## References

- Feature inventory: [docs/FEATURES.md](../../FEATURES.md)
- Stitch project ID + design system asset ID: see `docs/stitch-screens.md` (created during generation)
