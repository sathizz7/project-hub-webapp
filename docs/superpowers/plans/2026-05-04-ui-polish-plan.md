# ProjectHub UI Polish — Plan 9

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the existing functional UI from prototype-level to production SaaS quality, matching the Stitch design direction (Linear-like, indigo accent, comfortable density, clear visual hierarchy).

**Architecture:** Pure CSS + component-level changes. No new routes, no DB changes, no new dependencies. Every change is isolated to `globals.css`, shared primitives, or shell components. Pages and data flows are untouched.

**Design reference:** Stitch project `14849942036515145759` — 11 screens generated. Key visual language: slate-50 page bg, white cards with `shadow-sm`, indigo-600 accent, 3px left-border active indicator, colored icon circles in KPI/inbox cards, severity-tinted insight cards.

**Branch:** `feature/ui-polish` (cut from `feature/final-cleanup` / master)
**Repo:** `https://github.com/sathizz7/project-hub-webapp.git`

---

## Root causes of prototype feel (diagnosis)

| # | Problem | File | Fix |
|---|---------|------|-----|
| 1 | Body background = white (same as cards) | `globals.css` | `body` → `hsl(var(--bg-subtle))` — creates visual depth |
| 2 | Shadow-sm near-invisible (`rgba(0,0,0,0.05)`) | `globals.css` | More visible shadow definition |
| 3 | KPIStat number `text-3xl` looks like mockup | `kpi-stat.tsx` | `text-2xl font-bold`, optional icon with colored bg |
| 4 | Sidebar active indicator `w-0.5` (2px) invisible | `sidebar-link.tsx` | `w-[3px]`, explicit `text-accent` on active icon |
| 5 | CommandPaletteTrigger looks like a button | `command-palette-trigger.tsx` | Add `border border-border` — looks like a search input |
| 6 | ReviewRow shows "cod"/"doc" text not icon | `review-queue.tsx` | Replace with proper colored icon circle |
| 7 | InsightCard bg = plain white | `insight-card.tsx` | Add subtle severity-tinted bg (`bg-{color}/[0.04]`) |
| 8 | ProjectCard assignees all same indigo | `project-card.tsx` | Add `assignees?: { name: string; avatarColor: string }[]` prop |
| 9 | Section h2 labels inconsistent across pages | multiple | Standardize to `text-xs font-semibold uppercase tracking-wide text-fg-muted` |
| 10 | Button default in light mode looks off | `button.tsx` | `default` variant → use accent indigo explicitly |

---

## File structure

**Modified only (no new files):**
- `src/app/globals.css` — Task 1
- `src/components/shell/sidebar-link.tsx` — Task 2
- `src/components/shell/command-palette-trigger.tsx` — Task 2
- `src/components/shell/notifications-bell.tsx` — Task 2
- `src/components/shell/topbar.tsx` — Task 2
- `src/components/primitives/kpi-stat.tsx` — Task 3
- `src/components/primitives/page-header.tsx` — Task 3
- `src/components/primitives/insight-card.tsx` — Task 4
- `src/components/primitives/action-inbox-item.tsx` — Task 4
- `src/components/landing/ceo-command-center.tsx` — Task 4 (section header strings)
- `src/components/primitives/project-card.tsx` — Task 5
- `src/components/landing/ceo-command-center.tsx` — Task 5 (pass avatarColor)
- `src/components/projects/projects-list.tsx` — Task 5 (pass avatarColor)
- `src/components/reviews/review-queue.tsx` — Task 6
- `src/components/ui/button.tsx` — Task 7

---

## Tasks

### Task 1: Global CSS — body background + shadow definitions

**File:** `src/app/globals.css`

This is the highest-impact single change. The current `@layer base` applies `bg-background` to `body`, making it white (same as `bg-bg`). Cards have no visual depth. Fix: make `body` use `bg-subtle`.

- [ ] **Step 1: Read the current `@layer base` block**

Current (lines 213–226):
```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    color: hsl(var(--fg));
    font-feature-settings: "cv11", "ss01";
  }
  html {
    @apply font-sans;
    background: hsl(var(--bg-subtle));
  }
}
```

- [ ] **Step 2: Replace `@layer base` block with polished version**

Replace the entire `@layer base` block with:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
    box-sizing: border-box;
  }
  html {
    @apply font-sans antialiased;
    background: hsl(var(--bg-subtle));
    scroll-behavior: smooth;
  }
  body {
    background: hsl(var(--bg-subtle));
    color: hsl(var(--fg));
    font-size: 14px;
    line-height: 1.5;
    font-feature-settings: "cv11", "ss01";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

Key changes: `body` now uses `hsl(var(--bg-subtle))` (slate-50) instead of white. Added `antialiased`, explicit `font-size: 14px`, `line-height: 1.5`.

- [ ] **Step 3: Update shadow token definitions in `:root`**

Find the current shadow tokens:
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
```

Replace with:
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 10px 24px rgba(0, 0, 0, 0.10), 0 4px 8px rgba(0, 0, 0, 0.06);
```

Also add `--shadow-md` to the `@theme inline` block (after `--shadow-sm` and `--shadow-lg` lines):
```css
--shadow-md: var(--shadow-md);
```

And update dark mode shadows in `.dark`:
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.25);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.40), 0 2px 4px rgba(0, 0, 0, 0.30);
--shadow-lg: 0 10px 24px rgba(0, 0, 0, 0.55), 0 4px 8px rgba(0, 0, 0, 0.40);
```

- [ ] **Step 4: Update `card-elevated` in `@layer components` to use new shadow**

Find current:
```css
.card-elevated {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}
```

Replace with:
```css
.card-elevated {
  box-shadow: var(--shadow-sm);
}
.card-raised {
  box-shadow: var(--shadow-md);
}
```

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: no errors (CSS-only change).

- [ ] **Step 6: Commit**
```bash
git add src/app/globals.css
git commit -m "style: body bg = bg-subtle (cards now visually float); stronger shadow-sm"
```

---

### Task 2: Shell polish — SidebarLink, CommandPaletteTrigger, NotificationsBell, Topbar

**Files:** `sidebar-link.tsx`, `command-palette-trigger.tsx`, `notifications-bell.tsx`, `topbar.tsx`

- [ ] **Step 1: Update `src/components/shell/sidebar-link.tsx`**

Current active state:
```tsx
active
  ? "bg-accent-soft text-accent-strong font-medium"
  : "text-fg-muted hover:bg-bg-muted hover:text-fg"
```

And the indicator:
```tsx
{active && (
  <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
)}
<Icon className="h-4 w-4 shrink-0" />
```

Replace the entire `SidebarLink` return with:

```tsx
return (
  <Link
    href={href}
    data-active={active}
    className={cn(
      "group relative flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
      active
        ? "bg-accent-soft text-accent-strong font-semibold"
        : "text-fg-muted hover:bg-bg-muted hover:text-fg"
    )}
  >
    {active && (
      <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />
    )}
    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} />
    <span className="flex-1 truncate">{label}</span>
    {badge !== undefined && (
      <span className={cn(
        "rounded-full px-1.5 text-xs font-medium",
        active ? "bg-accent text-accent-fg" : "bg-bg-muted text-fg-muted"
      )}>
        {badge}
      </span>
    )}
  </Link>
);
```

Key changes: `w-0.5` → `w-[3px]`, `font-medium` → `font-semibold`, icon gets explicit `text-accent` when active, gap `gap-2` → `gap-2.5`.

- [ ] **Step 2: Update `src/components/shell/command-palette-trigger.tsx`**

Replace the `button` className:

Current:
```tsx
className={cn(
  "flex h-9 items-center gap-2 rounded-md bg-bg-muted px-3 text-sm text-fg-subtle hover:bg-bg-muted/80 transition-colors",
  className
)}
```

Replace with:
```tsx
className={cn(
  "flex h-9 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg-subtle shadow-sm transition-colors hover:border-border-strong hover:bg-bg-subtle",
  className
)}
```

Key change: adds `border border-border bg-bg shadow-sm` — looks like a real search input field now.

- [ ] **Step 3: Update `src/components/shell/notifications-bell.tsx`**

Replace full file content:

```tsx
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationsBell({ count = 0 }: { count?: number }) {
  return (
    <Button variant="ghost" size="icon" aria-label={`${count} notifications`} className="relative">
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white",
          )}
          aria-hidden
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );
}
```

Key change: replaces the tiny 2×2 dot with a proper count badge showing the number.

- [ ] **Step 4: Minor Topbar improvement** in `src/components/shell/topbar.tsx`

Current backdrop class: `bg-bg/80`
Replace with: `bg-bg/95` — slightly more opaque for better legibility when scrolling.

Find:
```tsx
className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-4 border-b border-border bg-bg/80 px-6 backdrop-blur"
```

Replace with:
```tsx
className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-4 border-b border-border bg-bg/95 px-6 backdrop-blur-md"
```

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add src/components/shell/sidebar-link.tsx src/components/shell/command-palette-trigger.tsx src/components/shell/notifications-bell.tsx src/components/shell/topbar.tsx
git commit -m "style(shell): sidebar active indicator 3px; search input border; notification count badge"
```

---

### Task 3: KPIStat + PageHeader

**Files:** `src/components/primitives/kpi-stat.tsx`, `src/components/primitives/page-header.tsx`

- [ ] **Step 1: Replace `src/components/primitives/kpi-stat.tsx`**

Replace the entire file with:

```tsx
import * as React from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPIStatProps = {
  label: string;
  value: number | string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?: LucideIcon;
  iconBg?: string;
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
};

const TONE_ACCENT: Record<string, string> = {
  danger: "border-t-2 border-t-danger",
  warning: "border-t-2 border-t-warning",
  success: "border-t-2 border-t-success",
  default: "",
};

const ICON_BG_DEFAULTS: Record<string, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  default: "bg-accent-soft text-accent",
};

export function KPIStat({ label, value, delta, icon: Icon, iconBg, tone = "default", className }: KPIStatProps) {
  const iconBgClass = iconBg ?? ICON_BG_DEFAULTS[tone];
  return (
    <div className={cn(
      "rounded-lg border border-border bg-bg p-5 card-elevated transition-shadow hover:card-raised",
      TONE_ACCENT[tone],
      className
    )}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
        {Icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", iconBgClass)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className={cn(
        "mt-3 text-2xl font-bold tabular-nums tracking-tight",
        tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-fg"
      )}>
        {value}
      </p>
      {delta && (
        <p
          data-testid="delta"
          data-direction={delta.direction}
          className={cn(
            "mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium",
            delta.direction === "up" && "text-success",
            delta.direction === "down" && "text-danger",
            delta.direction === "flat" && "text-fg-muted"
          )}
        >
          {delta.direction === "up" && <ArrowUp className="h-3 w-3" />}
          {delta.direction === "down" && <ArrowDown className="h-3 w-3" />}
          {delta.value}
        </p>
      )}
    </div>
  );
}
```

Key changes:
- Label: `text-sm text-fg-muted` → `text-xs font-medium uppercase tracking-wide text-fg-muted`
- Value: `text-3xl font-semibold` → `text-2xl font-bold tabular-nums`
- Icon: wrapped in a `7×7` rounded-md with colored background
- Tone: adds `border-t-2` colored top accent (danger = rose, warning = amber, success = emerald)
- Hover: adds `hover:card-raised` for subtle interactive feedback

The test file at `src/components/__tests__/kpi-stat.test.tsx` tests `delta` via `data-testid="delta"` — that's preserved.

- [ ] **Step 2: Run existing KPIStat tests**
```bash
npm test -- kpi-stat
```
Expected: all pass (data-testid and data-direction preserved).

- [ ] **Step 3: Update `src/components/primitives/page-header.tsx`**

Replace the entire file:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
};

export function PageHeader({ title, description, breadcrumb, actions, children, className, bordered = false }: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", bordered && "border-b border-border pb-5", className)}>
      {breadcrumb && (
        <div className="flex items-center gap-1 text-xs text-fg-muted">
          {breadcrumb}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
```

Key changes: title `text-2xl font-semibold` → `text-xl font-bold tracking-tight` (tighter, more Linear-like). Added `bordered` prop.

- [ ] **Step 4: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/primitives/kpi-stat.tsx src/components/primitives/page-header.tsx
git commit -m "style(primitives): KPIStat compact with colored icon bg; PageHeader tighter type"
```

---

### Task 4: ActionInboxItem + InsightCard + CeoCommandCenter section headers

**Files:** `action-inbox-item.tsx`, `insight-card.tsx`, `ceo-command-center.tsx`

- [ ] **Step 1: Update `src/components/primitives/insight-card.tsx`**

Replace entire file:

```tsx
import * as React from "react";
import { AlertTriangle, Lightbulb, Hand, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightSeverity = "risk" | "opportunity" | "blocker" | "suggestion";

const SEVERITY_META: Record<InsightSeverity, { icon: LucideIcon; stripe: string; iconColor: string; bg: string }> = {
  risk:        { icon: AlertTriangle, stripe: "bg-danger",     iconColor: "text-danger",     bg: "bg-danger/[0.04] dark:bg-danger/[0.08]" },
  opportunity: { icon: Lightbulb,    stripe: "bg-success",    iconColor: "text-success",    bg: "bg-success/[0.04] dark:bg-success/[0.08]" },
  blocker:     { icon: Hand,         stripe: "bg-warning",    iconColor: "text-warning",    bg: "bg-warning/[0.04] dark:bg-warning/[0.08]" },
  suggestion:  { icon: Sparkles,     stripe: "bg-info",       iconColor: "text-info",       bg: "bg-info/[0.04] dark:bg-info/[0.08]" },
};

export type InsightCardProps = {
  severity: InsightSeverity;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
};

export function InsightCard({ severity, title, description, action, className }: InsightCardProps) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border border-border p-4 pl-5 card-elevated transition-shadow hover:card-raised",
      meta.bg,
      className
    )}>
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", meta.stripe)} aria-hidden />
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", meta.iconColor)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs font-semibold text-accent hover:text-accent-strong transition-colors"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

Key changes:
- Added `bg` field to each severity — very subtle tinted background (`/[0.04]` opacity)
- Stripe: `w-1` → `w-[3px]`, `pl-4` → `pl-5` to clear wider stripe
- Card: adds `rounded-lg` (was `rounded-md`), `card-elevated`, `hover:card-raised`
- Title: `font-medium` → `font-semibold`

- [ ] **Step 2: Update `src/components/primitives/action-inbox-item.tsx`**

Replace entire file:

```tsx
import * as React from "react";
import { Clock, Eye, Sparkles, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InboxKind = "review" | "capture" | "extension";

const KIND_META: Record<InboxKind, { icon: LucideIcon; bg: string; fg: string; label: string }> = {
  review:    { icon: Eye,          bg: "bg-purple-100 dark:bg-purple-900/40", fg: "text-purple-700 dark:text-purple-300",  label: "Review" },
  capture:   { icon: Sparkles,     bg: "bg-amber-100 dark:bg-amber-900/40",   fg: "text-amber-700 dark:text-amber-300",    label: "Capture" },
  extension: { icon: ArrowUpRight, bg: "bg-orange-100 dark:bg-orange-900/40", fg: "text-orange-700 dark:text-orange-300",  label: "Extension" },
};

export type ActionInboxItemProps = {
  kind: InboxKind;
  title: string;
  context: string;
  age: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
};

export function ActionInboxItem({ kind, title, context, age, primaryAction, secondaryAction, className }: ActionInboxItemProps) {
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg border border-border bg-bg p-3.5 card-elevated transition-all hover:border-accent/30 hover:card-raised",
      className
    )}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.bg, meta.fg)}>
        <KindIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-fg-muted">
          <span className={cn("font-medium", meta.fg)}>{meta.label}</span>
          <span>·</span>
          <span className="truncate">{context}</span>
          <span>·</span>
          <Clock className="h-3 w-3 shrink-0" />
          <span className="shrink-0">{age}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
          >
            {secondaryAction.label}
          </button>
        )}
        <button
          onClick={primaryAction.onClick}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
        >
          {primaryAction.label}
        </button>
      </div>
    </div>
  );
}
```

Key changes:
- Card: `rounded-md` → `rounded-lg`, `p-3` → `p-3.5`, adds `card-elevated hover:card-raised`
- Icon wrapper: `rounded-full` → `rounded-lg` (square icon bg looks more modern)
- Title: `font-medium` → `font-semibold`
- Subtitle: structured flex layout instead of inline text
- Button: `py-1` → `py-1.5`, `font-medium` → `font-semibold`

- [ ] **Step 3: Update section headers in `src/components/landing/ceo-command-center.tsx`**

Find all `<h2 className="mb-3 ...">` section headers and replace them with a consistent pattern.

**Section header "Action Inbox"** — find:
```tsx
<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
  Action Inbox
  {serializedInbox.length > 0 && (
    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-fg">{serializedInbox.length}</span>
  )}
</h2>
```

Replace with:
```tsx
<h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
  Action Inbox
  {serializedInbox.length > 0 && (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">{serializedInbox.length}</span>
  )}
</h2>
```

**Section header "AI Insights"** — find:
```tsx
<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
  AI Insights
  {insights.length > 0 && (
    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-fg">{insights.length}</span>
  )}
</h2>
```

Replace with:
```tsx
<h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
  AI Insights
  {insights.length > 0 && (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">{insights.length}</span>
  )}
</h2>
```

**Section header "Active Projects"** — find:
```tsx
<h2 className="mb-3 text-sm font-semibold text-fg">Active Projects</h2>
```

Replace with:
```tsx
<h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Active Projects</h2>
```

- [ ] **Step 4: TypeScript check + commit**
```bash
npx tsc --noEmit
git add src/components/primitives/insight-card.tsx src/components/primitives/action-inbox-item.tsx src/components/landing/ceo-command-center.tsx
git commit -m "style(primitives): severity-tinted InsightCard; elevated ActionInboxItem; section headers uppercase"
```

---

### Task 5: ProjectCard assignee avatar colors + ReviewRow icon polish

**Files:** `project-card.tsx`, `review-queue.tsx`, `ceo-command-center.tsx`, `projects-list.tsx`

The current `ProjectCard` accepts `assigneeNames: string[]` — all avatars render as `bg-accent` indigo. We need to add color support without breaking existing callers.

- [ ] **Step 1: Update `src/components/primitives/project-card.tsx`**

Add an optional `assignees` prop (array with colors). Keep `assigneeNames` as fallback for backward compat.

Replace the `ProjectCardProps` type and component:

```tsx
import * as React from "react";
import Link from "next/link";
import { Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_TYPE_COLORS, PRIORITY_DOT, STATUS_PILL } from "@/lib/design-tokens";

export type ProjectCardProps = {
  href?: string;
  title: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "active" | "completed" | "paused" | "killed";
  phaseLabel: string;
  progress: number;
  daysRemaining: number;
  /** Prefer assignees (with color) over assigneeNames */
  assignees?: { name: string; avatarColor: string }[];
  /** Legacy: plain names, renders with indigo bg */
  assigneeNames?: string[];
  className?: string;
};

export function ProjectCard({
  href,
  title,
  type,
  priority,
  status,
  phaseLabel,
  progress,
  daysRemaining,
  assignees,
  assigneeNames = [],
  className,
}: ProjectCardProps) {
  const Wrap: React.ElementType = href ? Link : "div";
  const wrapProps = href ? { href } : {};

  const displayAssignees: { name: string; color: string }[] =
    assignees
      ? assignees.map(a => ({ name: a.name, color: a.avatarColor }))
      : assigneeNames.map(name => ({ name, color: "#4F46E5" }));

  return (
    <Wrap
      {...wrapProps}
      className={cn(
        "group block rounded-lg border border-border bg-bg p-5 card-elevated transition-all hover:border-accent/40 hover:card-raised",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", PROJECT_TYPE_COLORS[type] ?? PROJECT_TYPE_COLORS.engineering)}>
          {type.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-2">
          <span aria-label={`${priority} priority`} className={cn("inline-block h-2 w-2 rounded-full", PRIORITY_DOT[priority])} />
          <button aria-label="More" className="text-fg-subtle hover:text-fg transition-colors" onClick={e => e.preventDefault()}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <h3 className="mt-3 truncate text-[15px] font-semibold leading-snug text-fg">{title}</h3>
      <div className="mt-4">
        <p className="text-xs text-fg-muted">{phaseLabel}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-fg">{progress}%</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-fg-muted">
          <Clock className="h-3.5 w-3.5" />
          <span>{daysRemaining > 0 ? `${daysRemaining}d left` : "Overdue"}</span>
        </div>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STATUS_PILL[status])}>
          {status}
        </span>
      </div>
      <div className="mt-3.5 flex -space-x-1.5">
        {displayAssignees.slice(0, 4).map((a, i) => (
          <span
            key={i}
            title={a.name}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg text-[10px] font-bold text-white ring-0"
            style={{ backgroundColor: a.color }}
          >
            {a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </span>
        ))}
        {displayAssignees.length > 4 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-bg-muted text-[10px] font-medium text-fg-muted">
            +{displayAssignees.length - 4}
          </span>
        )}
      </div>
    </Wrap>
  );
}
```

- [ ] **Step 2: Update `src/components/landing/ceo-command-center.tsx` to pass `assignees` with color**

Find the `<ProjectCard` render in the active-projects section:
```tsx
<ProjectCard
  key={project.id}
  href={`/projects/${project.id}`}
  title={project.title}
  type={project.type}
  priority={project.priority as "low" | "medium" | "high" | "critical"}
  status="active"
  phaseLabel={phaseLabel}
  progress={progress}
  daysRemaining={daysRemaining}
  assigneeNames={project.assignees.map(a => a.user.name)}
  className="w-72 shrink-0"
/>
```

Replace with:
```tsx
<ProjectCard
  key={project.id}
  href={`/projects/${project.id}`}
  title={project.title}
  type={project.type}
  priority={project.priority as "low" | "medium" | "high" | "critical"}
  status="active"
  phaseLabel={phaseLabel}
  progress={progress}
  daysRemaining={daysRemaining}
  assignees={project.assignees.map(a => ({ name: a.user.name, avatarColor: a.user.avatarColor }))}
  className="w-72 shrink-0"
/>
```

Also update the Prisma query to select `avatarColor` — find:
```tsx
assignees: { select: { user: { select: { name: true } } } },
```
Replace with:
```tsx
assignees: { select: { user: { select: { name: true, avatarColor: true } } } },
```

- [ ] **Step 3: Update `src/components/projects/projects-list.tsx` similarly**

Read the file, find its `ProjectCard` render, and add the `assignees` prop with `avatarColor` (updating the Prisma select if needed).

- [ ] **Step 4: Update `src/components/reviews/review-queue.tsx` — replace type abbreviation with icon circle**

Find the `ReviewRow` component. Currently:
```tsx
<span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold uppercase", TYPE_ICON_COLOR[sub.type] ?? "bg-bg-muted text-fg-muted")}>
  {sub.type.slice(0, 3)}
</span>
```

Replace the `ReviewRow` with a proper icon. Add imports at top of file:
```tsx
import { Code2, FileText, BookOpen, Play, LayoutDashboard } from "lucide-react";
```

Add a TYPE_ICON map after the TYPE_ICON_COLOR map:
```tsx
import { type LucideIcon, Code2, FileText, BookOpen, Play, LayoutDashboard } from "lucide-react";

const TYPE_ICON: Record<string, LucideIcon> = {
  code: Code2,
  document: FileText,
  architecture: LayoutDashboard,
  notebook: BookOpen,
  demo: Play,
};
```

Replace the span in ReviewRow:
```tsx
{(() => {
  const Icon = TYPE_ICON[sub.type] ?? FileText;
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TYPE_ICON_COLOR[sub.type] ?? "bg-bg-muted text-fg-muted")}>
      <Icon className="h-4 w-4" />
    </span>
  );
})()}
```

Also improve the ReviewRow container:
```tsx
<button
  className="group flex w-full items-center gap-3.5 rounded-lg px-4 py-3.5 text-left transition-colors hover:bg-bg-subtle"
  onClick={onClick}
>
```

And update `DateGroup` to use `rounded-lg` on the border wrapper:
```tsx
<div className="rounded-lg border border-border bg-bg divide-y divide-border overflow-hidden">
```

- [ ] **Step 5: TypeScript check**
```bash
npx tsc --noEmit
```

- [ ] **Step 6: Run tests**
```bash
npm test -- review-row
npm test -- project-card
```
Expected: all pass.

- [ ] **Step 7: Commit**
```bash
git add src/components/primitives/project-card.tsx src/components/reviews/review-queue.tsx src/components/landing/ceo-command-center.tsx src/components/projects/projects-list.tsx
git commit -m "style: ProjectCard per-user avatar colors; ReviewRow icon circles; rounded-lg cards"
```

---

### Task 6: Button default variant + Badge + minor global polish

**Files:** `button.tsx`, `globals.css` (scrollbar), misc minor

- [ ] **Step 1: Fix Button default variant in `src/components/ui/button.tsx`**

Current default variant:
```tsx
default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
```

In dark mode, `--primary` becomes `oklch(0.922 0 0)` (near-white) instead of accent indigo — the button looks wrong. Replace to use accent tokens directly:

```tsx
default: "bg-accent text-accent-fg shadow-sm hover:bg-accent-strong active:bg-accent-strong/90",
```

This uses our custom `bg-accent` (indigo-600) and `text-accent-fg` (white) consistently in both light and dark modes.

- [ ] **Step 2: Add custom scrollbar styling to `globals.css`**

Append to `@layer components`:

```css
/* Custom scrollbar — Webkit */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border-strong));
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--fg-subtle));
}
```

- [ ] **Step 3: Run full test suite**
```bash
npm test
```
Expected: all 138 tests pass (no logic changes — only visual CSS/class changes).

- [ ] **Step 4: TypeScript check**
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Production build**
```bash
npm run build
```
Expected: zero errors.

- [ ] **Step 6: Commit + push**
```bash
git add src/components/ui/button.tsx src/app/globals.css
git commit -m "style: accent-based Button default variant; custom scrollbar"
git push -u origin feature/ui-polish
```

---

## Acceptance criteria

1. `npm test` → all 138 tests pass
2. `npm run build` → zero errors
3. Page background visibly off-white (slate-50) — cards appear to "float"
4. KPI stat cards compact with icons in colored squares, numbers `text-2xl`
5. Sidebar active item: 3px left stripe + icon explicitly indigo
6. CommandPalette trigger looks like a bordered search input
7. Notification bell shows count number not just a dot
8. InsightCards have subtle severity-tinted background
9. ActionInboxItem cards elevated with `card-elevated` shadow
10. ProjectCard assignee avatars use per-user colors from DB
11. ReviewRow shows proper icon circle (Code2, FileText, etc.) not "cod"/"doc"
12. Primary Button uses indigo in both light and dark mode

## Out of scope

- New features, kanban, full calendar
- Team member profile page redesign (already looks good)
- Mobile-specific optimizations
- Animation/framer-motion additions
