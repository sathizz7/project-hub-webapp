# ProjectHub Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the design system, AppShell (sidebar + topbar), theme system (light/dark), command palette (⌘K), and shared UI primitives that every subsequent ProjectHub plan will plug into.

**Architecture:** Tailwind 4 design tokens + CSS variables for light/dark, `next-themes` provider, a role-aware AppShell with hardcoded session for now (real auth lands in Plan 2), `cmdk` for the command palette. All shared UI primitives live under `components/primitives/`. A `/design-demo` route renders every primitive in both themes for visual verification and exercises the only RTL tests in this plan.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind 4, shadcn/ui (already installed), `next-themes` (new), `cmdk` (new), `lucide-react` (already), Vitest + React Testing Library + jsdom (new — first test setup in the repo), Geist fonts (already shipped via `geist` package).

**Spec source:** [`docs/superpowers/specs/2026-05-02-projecthub-redesign-design.md`](../specs/2026-05-02-projecthub-redesign-design.md)

---

## File Structure

**Config & globals (modified):**
- `package.json` — add `next-themes`, `cmdk`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`
- `tailwind.config.ts` — create (project may not have one yet); extend tokens
- `app/globals.css` — replace token block with our light + dark CSS variables
- `app/layout.tsx` — wrap with `ThemeProvider`, mount Geist fonts, add `Toaster` slot

**New theme + tokens:**
- `lib/design-tokens.ts` — TS exports of token names for code use
- `components/theme/theme-provider.tsx` — `next-themes` wrapper
- `components/theme/theme-toggle.tsx` — Sun/Moon button

**New AppShell:**
- `components/shell/app-shell.tsx` — three-column layout (sidebar | main | optional rail)
- `components/shell/sidebar.tsx` — left nav with grouped links
- `components/shell/sidebar-config.ts` — role-based nav config
- `components/shell/sidebar-link.tsx` — single link row with badge
- `components/shell/topbar.tsx` — header bar
- `components/shell/user-menu.tsx` — avatar + dropdown
- `components/shell/notifications-bell.tsx` — bell with badge

**New command palette:**
- `components/shell/command-palette.tsx` — ⌘K dialog
- `components/shell/command-palette-trigger.tsx` — input button in topbar
- `lib/use-command-palette.ts` — open/close state hook

**New primitives:**
- `components/primitives/kpi-stat.tsx`
- `components/primitives/project-card.tsx`
- `components/primitives/task-row.tsx`
- `components/primitives/action-inbox-item.tsx`
- `components/primitives/insight-card.tsx`
- `components/primitives/phase-tracker.tsx`
- `components/primitives/page-header.tsx`
- `components/primitives/empty-state.tsx`
- `components/primitives/index.ts` — barrel export

**Demo + tests:**
- `app/design-demo/page.tsx` — showcase route
- `vitest.config.ts` — test runner config
- `vitest.setup.ts` — testing-library jest-dom matchers
- `components/__tests__/theme-toggle.test.tsx`
- `components/__tests__/sidebar-link.test.tsx`
- `components/__tests__/command-palette.test.tsx`
- `components/__tests__/kpi-stat.test.tsx`
- `components/__tests__/project-card.test.tsx`

---

## Conventions

- All new components are React 19 client components unless they have no interactivity. Mark with `"use client"` directive at the top.
- Use `clsx` + `tailwind-merge` via the existing `cn()` helper at `lib/utils.ts` for conditional classes.
- Tests live in `components/__tests__/<name>.test.tsx` mirroring the source path. Run with `npm test`.
- Commit after each task using the message format shown. Frequent commits.

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
npm install next-themes cmdk
```

Expected: package.json updated; `next-themes`, `cmdk` listed in `dependencies`.

- [ ] **Step 2: Install test deps**

Run:
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: package.json updated; new packages listed in `devDependencies`.

- [ ] **Step 3: Add test scripts**

Edit `package.json` `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add next-themes, cmdk, and vitest test stack"
```

---

## Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Create vitest.setup.ts**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Verify the runner starts**

Run: `npm test`
Expected: Vitest exits with "No test files found" and exit code 0 (or 1 with no tests message — both acceptable; we just want the runner to load without config errors).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.setup.ts
git commit -m "chore: configure vitest with jsdom and testing-library"
```

---

## Task 3: Tailwind config + design tokens

**Files:**
- Create: `tailwind.config.ts`
- Modify: `app/globals.css`
- Create: `lib/design-tokens.ts`

> **Why:** the project uses Tailwind 4 via `@tailwindcss/postcss`. The new tokens are declared as CSS variables in `globals.css` and exposed to Tailwind via `theme: { extend: { colors: { ... } } }` referencing `var(--...)`.

- [ ] **Step 1: Replace `app/globals.css` with the new token block**

Full file content:

```css
@import "tailwindcss";

:root {
  /* Surface */
  --bg: 0 0% 100%;                    /* #FFFFFF */
  --bg-subtle: 210 40% 98%;           /* slate-50 #F8FAFC */
  --bg-muted: 210 40% 96%;            /* slate-100 */
  --border: 214 32% 91%;              /* slate-200 */
  --border-strong: 213 27% 84%;       /* slate-300 */

  /* Text */
  --fg: 222 47% 11%;                  /* slate-900 */
  --fg-muted: 215 16% 47%;            /* slate-600 */
  --fg-subtle: 215 20% 65%;           /* slate-400 */

  /* Accent */
  --accent: 244 75% 59%;              /* indigo-600 #4F46E5 */
  --accent-fg: 0 0% 100%;             /* white on indigo */
  --accent-soft: 244 75% 95%;         /* indigo-50 */
  --accent-strong: 245 73% 47%;       /* indigo-700 */

  /* Semantic */
  --success: 160 84% 39%;             /* emerald-600 */
  --success-soft: 152 81% 96%;        /* emerald-50 */
  --warning: 38 92% 50%;              /* amber-500 */
  --warning-soft: 48 100% 96%;        /* amber-50 */
  --danger: 351 75% 49%;              /* rose-600 */
  --danger-soft: 356 100% 97%;        /* rose-50 */
  --info: 200 98% 39%;                /* sky-600 */
  --info-soft: 204 100% 97%;          /* sky-50 */

  /* Shape */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);

  /* Shell layout */
  --sidebar-width: 240px;
  --topbar-height: 56px;
  --rail-width: 320px;
}

.dark {
  --bg: 222 47% 5%;                   /* slate-950 */
  --bg-subtle: 222 47% 7%;            /* slate-900-ish */
  --bg-muted: 217 33% 12%;            /* slate-800 */
  --border: 217 33% 17%;              /* slate-800 stronger */
  --border-strong: 215 25% 27%;       /* slate-700 */

  --fg: 210 40% 98%;
  --fg-muted: 215 20% 65%;
  --fg-subtle: 215 16% 47%;

  --accent: 244 75% 65%;              /* indigo-500 — bumps for contrast */
  --accent-fg: 0 0% 100%;
  --accent-soft: 244 60% 18%;
  --accent-strong: 244 75% 75%;

  --success: 158 64% 52%;
  --success-soft: 158 64% 12%;
  --warning: 38 92% 60%;
  --warning-soft: 38 92% 14%;
  --danger: 351 75% 60%;
  --danger-soft: 351 60% 18%;
  --info: 200 98% 50%;
  --info-soft: 200 60% 14%;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}

@theme inline {
  --color-bg: hsl(var(--bg));
  --color-bg-subtle: hsl(var(--bg-subtle));
  --color-bg-muted: hsl(var(--bg-muted));
  --color-border: hsl(var(--border));
  --color-border-strong: hsl(var(--border-strong));
  --color-fg: hsl(var(--fg));
  --color-fg-muted: hsl(var(--fg-muted));
  --color-fg-subtle: hsl(var(--fg-subtle));
  --color-accent: hsl(var(--accent));
  --color-accent-fg: hsl(var(--accent-fg));
  --color-accent-soft: hsl(var(--accent-soft));
  --color-accent-strong: hsl(var(--accent-strong));
  --color-success: hsl(var(--success));
  --color-success-soft: hsl(var(--success-soft));
  --color-warning: hsl(var(--warning));
  --color-warning-soft: hsl(var(--warning-soft));
  --color-danger: hsl(var(--danger));
  --color-danger-soft: hsl(var(--danger-soft));
  --color-info: hsl(var(--info));
  --color-info-soft: hsl(var(--info-soft));
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-full: var(--radius-full);
  --shadow-sm: var(--shadow-sm);
  --shadow-lg: var(--shadow-lg);
}

html, body {
  background: hsl(var(--bg-subtle));
  color: hsl(var(--fg));
  font-feature-settings: "cv11", "ss01";
}

* { border-color: hsl(var(--border)); }
```

- [ ] **Step 2: Create `lib/design-tokens.ts`**

```ts
export const SHELL = {
  sidebarWidth: 240,
  topbarHeight: 56,
  railWidth: 320,
} as const;

export const RADII = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;

export const PROJECT_TYPE_COLORS: Record<string, string> = {
  engineering: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  research: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  data_science: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  design: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  marketing: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  strategy: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  product: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  operations: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  hr: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  legal: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  sales: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  finance: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  mixed: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
};

export const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-rose-600 animate-pulse",
};

export const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  killed: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: build succeeds (no Tailwind errors, types compile).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css lib/design-tokens.ts
git commit -m "feat(theme): add light+dark tokens and shared color/status maps"
```

---

## Task 4: ThemeProvider + ThemeToggle (TDD)

**Files:**
- Create: `components/theme/theme-provider.tsx`
- Create: `components/theme/theme-toggle.tsx`
- Create: `components/__tests__/theme-toggle.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

`components/__tests__/theme-toggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

describe("ThemeToggle", () => {
  it("renders an accessible button", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("toggles theme on click", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(btn);
    // next-themes writes to documentElement.classList
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await user.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- theme-toggle`
Expected: FAIL — modules not yet defined.

- [ ] **Step 3: Create `components/theme/theme-provider.tsx`**

```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 4: Create `components/theme/theme-toggle.tsx`**

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `npm test -- theme-toggle`
Expected: PASS — both assertions green.

- [ ] **Step 6: Wire ThemeProvider into root layout**

Modify `app/layout.tsx` — wrap `{children}` with `<ThemeProvider>` and add `suppressHydrationWarning` on `<html>`:

```tsx
import { ThemeProvider } from "@/components/theme/theme-provider";
// ...
<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>
```

(Preserve existing font setup and other layout content.)

- [ ] **Step 7: Commit**

```bash
git add components/theme components/__tests__/theme-toggle.test.tsx app/layout.tsx
git commit -m "feat(theme): add ThemeProvider and ThemeToggle with tests"
```

---

## Task 5: Sidebar config + SidebarLink (TDD)

**Files:**
- Create: `components/shell/sidebar-config.ts`
- Create: `components/shell/sidebar-link.tsx`
- Create: `components/__tests__/sidebar-link.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/__tests__/sidebar-link.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SidebarLink } from "@/components/shell/sidebar-link";
import { LayoutDashboard } from "lucide-react";

describe("SidebarLink", () => {
  it("renders label and icon", () => {
    render(<SidebarLink href="/" label="Dashboard" icon={LayoutDashboard} active={false} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("shows the badge when provided", () => {
    render(<SidebarLink href="/r" label="Reviews" icon={LayoutDashboard} active={false} badge={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("applies active styles when active", () => {
    render(<SidebarLink href="/" label="Dashboard" icon={LayoutDashboard} active={true} />);
    expect(screen.getByRole("link")).toHaveAttribute("data-active", "true");
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- sidebar-link`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/shell/sidebar-link.tsx`**

```tsx
"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
};

export function SidebarLink({ href, label, icon: Icon, active, badge }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      data-active={active}
      className={cn(
        "group relative flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-accent-soft text-accent-strong font-medium"
          : "text-fg-muted hover:bg-bg-muted hover:text-fg"
      )}
    >
      {active && (
        <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-bg-muted px-1.5 text-xs font-medium text-fg-muted group-data-[active=true]:bg-accent group-data-[active=true]:text-accent-fg">
          {badge}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Create `components/shell/sidebar-config.ts`**

```ts
import {
  LayoutDashboard,
  FileCheck,
  Sparkles,
  Calendar,
  FolderKanban,
  Plus,
  Users,
  CalendarDays,
  Settings,
  ListTodo,
  Inbox,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";

export type Role = "ceo" | "team_member";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "reviews" | "capture";
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const CEO_NAV: NavGroup[] = [
  {
    label: "Daily Cockpit",
    items: [
      { href: "/", label: "Command Center", icon: LayoutDashboard },
      { href: "/reviews", label: "Review Queue", icon: FileCheck, badgeKey: "reviews" },
      { href: "/capture", label: "AI Capture", icon: Sparkles, badgeKey: "capture" },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/projects/new", label: "New Project", icon: Plus },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/team", label: "Team", icon: Users },
      { href: "/team/availability", label: "Leave & Availability", icon: CalendarDays },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/settings/team", label: "Manage Team", icon: Settings },
    ],
  },
];

export const TEAM_NAV: NavGroup[] = [
  {
    label: "My Work",
    items: [
      { href: "/", label: "My Today", icon: LayoutDashboard },
      { href: "/my-tasks", label: "My Tasks", icon: ListTodo },
      { href: "/my-submissions", label: "My Submissions", icon: Inbox },
      { href: "/capture", label: "AI Capture", icon: Sparkles },
      { href: "/calendar", label: "My Calendar", icon: Calendar },
    ],
  },
  {
    label: "Projects",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Me",
    items: [
      { href: "/me", label: "My Profile", icon: UserIcon },
      { href: "/team", label: "Team Roster", icon: Users },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return role === "ceo" ? CEO_NAV : TEAM_NAV;
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- sidebar-link`
Expected: PASS — 3 assertions.

- [ ] **Step 6: Commit**

```bash
git add components/shell/sidebar-link.tsx components/shell/sidebar-config.ts components/__tests__/sidebar-link.test.tsx
git commit -m "feat(shell): add SidebarLink and role-based nav config"
```

---

## Task 6: Sidebar component

**Files:**
- Create: `components/shell/sidebar.tsx`

- [ ] **Step 1: Implement sidebar**

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarLink } from "./sidebar-link";
import { navForRole, type Role } from "./sidebar-config";
import { Badge } from "@/components/ui/badge";

export type SidebarProps = {
  role: Role;
  userName: string;
  userRoleLabel: string;
  badges?: { reviews?: number; capture?: number };
};

export function Sidebar({ role, userName, userRoleLabel, badges = {} }: SidebarProps) {
  const pathname = usePathname();
  const groups = navForRole(role);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] flex-col border-r border-border bg-bg"
      aria-label="Primary navigation"
    >
      <div className="flex h-[var(--topbar-height)] items-center px-5 border-b border-border">
        <Link href="/" className="text-base font-semibold tracking-tight text-fg">
          Project<span className="text-accent">Hub</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {group.label}
            </p>
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
                badge={item.badgeKey ? badges[item.badgeKey] : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-semibold">
            {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{userName}</p>
            <Badge variant="secondary" className="text-[10px]">{userRoleLabel}</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: zero TS errors.

- [ ] **Step 3: Commit**

```bash
git add components/shell/sidebar.tsx
git commit -m "feat(shell): add Sidebar with grouped, role-aware nav"
```

---

## Task 7: Topbar (UserMenu, NotificationsBell, ThemeToggle, search trigger placeholder)

**Files:**
- Create: `components/shell/notifications-bell.tsx`
- Create: `components/shell/user-menu.tsx`
- Create: `components/shell/topbar.tsx`

- [ ] **Step 1: Create `components/shell/notifications-bell.tsx`**

```tsx
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationsBell({ count = 0 }: { count?: number }) {
  return (
    <Button variant="ghost" size="icon" aria-label={`${count} notifications`} className="relative">
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" aria-hidden />
      )}
    </Button>
  );
}
```

- [ ] **Step 2: Create `components/shell/user-menu.tsx`**

```tsx
"use client";

import { LogOut, Settings as SettingsIcon, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UserMenuProps = {
  name: string;
  email: string;
};

export function UserMenu({ name, email }: UserMenuProps) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs text-fg-muted">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem><UserIcon className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
        <DropdownMenuItem><SettingsIcon className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Create `components/shell/topbar.tsx`**

```tsx
"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import { CommandPaletteTrigger } from "./command-palette-trigger";

export type TopbarProps = {
  userName: string;
  userEmail: string;
  notificationCount?: number;
};

export function Topbar({ userName, userEmail, notificationCount = 0 }: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-4 border-b border-border bg-bg/80 px-6 backdrop-blur"
      style={{ marginLeft: "var(--sidebar-width)" }}
    >
      <CommandPaletteTrigger className="flex-1 max-w-[480px]" />
      <div className="ml-auto flex items-center gap-1">
        <NotificationsBell count={notificationCount} />
        <ThemeToggle />
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/shell/notifications-bell.tsx components/shell/user-menu.tsx components/shell/topbar.tsx
git commit -m "feat(shell): add Topbar with notifications, theme toggle, user menu"
```

---

## Task 8: CommandPalette (TDD)

**Files:**
- Create: `lib/use-command-palette.ts`
- Create: `components/shell/command-palette-trigger.tsx`
- Create: `components/shell/command-palette.tsx`
- Create: `components/__tests__/command-palette.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/__tests__/command-palette.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { CommandPalette } from "@/components/shell/command-palette";

const items = [
  { id: "1", label: "Open Reviews", group: "Navigate", run: () => {} },
  { id: "2", label: "New Project", group: "Create", run: () => {} },
];

describe("CommandPalette", () => {
  it("opens with cmd+k and closes with escape", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);
    expect(screen.queryByPlaceholderText(/search or jump/i)).not.toBeInTheDocument();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByPlaceholderText(/search or jump/i)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByPlaceholderText(/search or jump/i)).not.toBeInTheDocument();
  });

  it("filters items by query", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);
    await user.keyboard("{Meta>}k{/Meta}");
    const input = await screen.findByPlaceholderText(/search or jump/i);
    await user.type(input, "Rev");
    expect(screen.getByText("Open Reviews")).toBeInTheDocument();
    expect(screen.queryByText("New Project")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- command-palette`
Expected: FAIL.

- [ ] **Step 3: Create `lib/use-command-palette.ts`**

```ts
"use client";

import * as React from "react";

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
```

- [ ] **Step 4: Create `components/shell/command-palette.tsx`**

```tsx
"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommandPalette } from "@/lib/use-command-palette";

export type CommandItem = {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  run: () => void;
};

export function CommandPalette({ items }: { items: CommandItem[] }) {
  const { open, setOpen } = useCommandPalette();
  const groups = React.useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of items) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 max-w-[640px]">
        <Command label="Global command palette" className="bg-bg">
          <Command.Input
            placeholder="Search or jump to..."
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-fg-subtle"
          />
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="px-4 py-8 text-center text-sm text-fg-muted">
              No results.
            </Command.Empty>
            {groups.map(([group, groupItems]) => (
              <Command.Group
                key={group}
                heading={group}
                className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle [&_[cmdk-group-heading]]:py-1.5"
              >
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      item.run();
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-fg aria-selected:bg-accent-soft aria-selected:text-accent-strong"
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <kbd className="text-xs text-fg-subtle">{item.shortcut}</kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create `components/shell/command-palette-trigger.tsx`**

```tsx
"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommandPaletteTrigger({ className }: { className?: string }) {
  const fire = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };
  return (
    <button
      onClick={fire}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md bg-bg-muted px-3 text-sm text-fg-subtle hover:bg-bg-muted/80 transition-colors",
        className
      )}
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4" />
      <span>Search or jump to...</span>
      <kbd className="ml-auto rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
        ⌘K
      </kbd>
    </button>
  );
}
```

- [ ] **Step 6: Run tests, expect pass**

Run: `npm test -- command-palette`
Expected: PASS — 2 tests green.

- [ ] **Step 7: Commit**

```bash
git add lib/use-command-palette.ts components/shell/command-palette.tsx components/shell/command-palette-trigger.tsx components/__tests__/command-palette.test.tsx
git commit -m "feat(shell): add ⌘K command palette with cmdk"
```

---

## Task 9: AppShell (assembles sidebar + topbar + main)

**Files:**
- Create: `components/shell/app-shell.tsx`

- [ ] **Step 1: Create AppShell**

```tsx
"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette, type CommandItem } from "./command-palette";
import type { Role } from "./sidebar-config";

export type AppShellProps = {
  role: Role;
  user: { name: string; email: string; roleLabel: string };
  badges?: { reviews?: number; capture?: number };
  notificationCount?: number;
  commandItems?: CommandItem[];
  rightRail?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  role,
  user,
  badges,
  notificationCount,
  commandItems = [],
  rightRail,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-bg-subtle text-fg">
      <Sidebar role={role} userName={user.name} userRoleLabel={user.roleLabel} badges={badges} />
      <Topbar userName={user.name} userEmail={user.email} notificationCount={notificationCount} />
      <CommandPalette items={commandItems} />
      <div
        className="flex"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <main className="flex-1 min-w-0 p-8">{children}</main>
        {rightRail && (
          <aside
            className="sticky top-[var(--topbar-height)] hidden h-[calc(100dvh-var(--topbar-height))] w-[var(--rail-width)] shrink-0 border-l border-border bg-bg lg:block"
            aria-label="Contextual rail"
          >
            {rightRail}
          </aside>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TS**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/shell/app-shell.tsx
git commit -m "feat(shell): add AppShell composing sidebar, topbar, command palette"
```

---

## Task 10: Primitives — PageHeader, EmptyState, KPIStat (TDD for KPIStat)

**Files:**
- Create: `components/primitives/page-header.tsx`
- Create: `components/primitives/empty-state.tsx`
- Create: `components/primitives/kpi-stat.tsx`
- Create: `components/__tests__/kpi-stat.test.tsx`

- [ ] **Step 1: Create `components/primitives/page-header.tsx`**

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
};

export function PageHeader({ title, description, breadcrumb, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", className)}>
      {breadcrumb && <div className="text-xs text-fg-muted">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
```

- [ ] **Step 2: Create `components/primitives/empty-state.tsx`**

```tsx
import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-bg p-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-muted">
        <Icon className="h-6 w-6 text-fg-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 3: Write failing test for KPIStat**

`components/__tests__/kpi-stat.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KPIStat } from "@/components/primitives/kpi-stat";

describe("KPIStat", () => {
  it("renders label, value, and positive delta", () => {
    render(<KPIStat label="Active Projects" value={12} delta={{ value: "+2 this week", direction: "up" }} />);
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+2 this week")).toBeInTheDocument();
    expect(screen.getByTestId("delta")).toHaveAttribute("data-direction", "up");
  });

  it("renders without delta when not provided", () => {
    render(<KPIStat label="Team" value={8} />);
    expect(screen.queryByTestId("delta")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run, expect fail**

Run: `npm test -- kpi-stat`
Expected: FAIL.

- [ ] **Step 5: Create `components/primitives/kpi-stat.tsx`**

```tsx
import * as React from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPIStatProps = {
  label: string;
  value: number | string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?: LucideIcon;
  tone?: "default" | "danger";
  className?: string;
};

export function KPIStat({ label, value, delta, icon: Icon, tone = "default", className }: KPIStatProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-bg p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-fg-subtle" />}
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", tone === "danger" ? "text-danger" : "text-fg")}>
        {value}
      </p>
      {delta && (
        <p
          data-testid="delta"
          data-direction={delta.direction}
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs",
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

- [ ] **Step 6: Run, expect pass**

Run: `npm test -- kpi-stat`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/primitives/page-header.tsx components/primitives/empty-state.tsx components/primitives/kpi-stat.tsx components/__tests__/kpi-stat.test.tsx
git commit -m "feat(primitives): add PageHeader, EmptyState, KPIStat"
```

---

## Task 11: Primitives — ProjectCard, TaskRow

**Files:**
- Create: `components/primitives/project-card.tsx`
- Create: `components/primitives/task-row.tsx`
- Create: `components/__tests__/project-card.test.tsx`

- [ ] **Step 1: Write failing test for ProjectCard**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProjectCard } from "@/components/primitives/project-card";

describe("ProjectCard", () => {
  it("renders project title, type pill, and progress", () => {
    render(
      <ProjectCard
        title="API Gateway"
        type="engineering"
        priority="high"
        status="active"
        phaseLabel="Phase 3 of 6 · Development"
        progress={52}
        daysRemaining={8}
        assigneeNames={["Priya Sharma", "Arjun Mehta"]}
      />
    );
    expect(screen.getByText("API Gateway")).toBeInTheDocument();
    expect(screen.getByText(/engineering/i)).toBeInTheDocument();
    expect(screen.getByText("52%")).toBeInTheDocument();
    expect(screen.getByText(/8 days/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- project-card`

- [ ] **Step 3: Create `components/primitives/project-card.tsx`**

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
  assigneeNames: string[];
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
  assigneeNames,
  className,
}: ProjectCardProps) {
  const Wrap: React.ElementType = href ? Link : "div";
  const wrapProps = href ? { href } : {};
  return (
    <Wrap
      {...wrapProps}
      className={cn(
        "group block rounded-lg border border-border bg-bg p-5 shadow-sm transition-all hover:-translate-y-px hover:border-accent/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", PROJECT_TYPE_COLORS[type] ?? PROJECT_TYPE_COLORS.engineering)}>
          {type.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-2">
          <span aria-label={`${priority} priority`} className={cn("inline-block h-2 w-2 rounded-full", PRIORITY_DOT[priority])} />
          <button aria-label="More" className="text-fg-subtle hover:text-fg">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <h3 className="mt-3 truncate text-base font-semibold text-fg">{title}</h3>
      <div className="mt-4">
        <p className="text-xs text-fg-muted">{phaseLabel}</p>
        <div className="mt-1 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-fg">{progress}%</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-fg-muted">
          <Clock className="h-3.5 w-3.5" />
          {daysRemaining} days left
        </div>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase", STATUS_PILL[status])}>
          {status}
        </span>
      </div>
      <div className="mt-3 flex -space-x-2">
        {assigneeNames.slice(0, 3).map((name, i) => (
          <span
            key={i}
            title={name}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-accent text-[10px] font-semibold text-accent-fg"
          >
            {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        ))}
        {assigneeNames.length > 3 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-bg-muted text-[10px] text-fg-muted">
            +{assigneeNames.length - 3}
          </span>
        )}
      </div>
    </Wrap>
  );
}
```

- [ ] **Step 4: Create `components/primitives/task-row.tsx`**

```tsx
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT } from "@/lib/design-tokens";

export type TaskRowProps = {
  title: string;
  assigneeName?: string;
  due?: string;
  priority?: "low" | "medium" | "high" | "critical";
  done?: boolean;
  onToggle?: (next: boolean) => void;
  className?: string;
};

export function TaskRow({ title, assigneeName, due, priority = "medium", done = false, onToggle, className }: TaskRowProps) {
  return (
    <div className={cn("flex h-10 items-center gap-3 rounded-md px-2 hover:bg-bg-muted", className)}>
      <Checkbox checked={done} onCheckedChange={(v) => onToggle?.(Boolean(v))} aria-label={`Mark "${title}" ${done ? "incomplete" : "done"}`} />
      <span aria-label={`${priority} priority`} className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[priority])} />
      <span className={cn("flex-1 truncate text-sm", done ? "text-fg-muted line-through" : "text-fg")}>{title}</span>
      {assigneeName && <span className="text-xs text-fg-muted">{assigneeName}</span>}
      {due && <span className="text-xs text-fg-muted">{due}</span>}
    </div>
  );
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `npm test -- project-card`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/primitives/project-card.tsx components/primitives/task-row.tsx components/__tests__/project-card.test.tsx
git commit -m "feat(primitives): add ProjectCard and TaskRow"
```

---

## Task 12: Primitives — ActionInboxItem, InsightCard, PhaseTracker, barrel

**Files:**
- Create: `components/primitives/action-inbox-item.tsx`
- Create: `components/primitives/insight-card.tsx`
- Create: `components/primitives/phase-tracker.tsx`
- Create: `components/primitives/index.ts`

- [ ] **Step 1: Create `components/primitives/action-inbox-item.tsx`**

```tsx
import * as React from "react";
import { Clock, Eye, Sparkles, ArrowUpRight, Check, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InboxKind = "review" | "capture" | "extension";

const KIND_META: Record<InboxKind, { icon: LucideIcon; bg: string; fg: string; label: string }> = {
  review: { icon: Eye, bg: "bg-purple-100 dark:bg-purple-900/40", fg: "text-purple-700 dark:text-purple-300", label: "Review" },
  capture: { icon: Sparkles, bg: "bg-amber-100 dark:bg-amber-900/40", fg: "text-amber-700 dark:text-amber-300", label: "Capture" },
  extension: { icon: ArrowUpRight, bg: "bg-orange-100 dark:bg-orange-900/40", fg: "text-orange-700 dark:text-orange-300", label: "Extension" },
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
    <div className={cn("flex items-start gap-3 rounded-md border border-border bg-bg p-3 transition-colors hover:border-accent/40", className)}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.bg, meta.fg)}>
        <KindIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{title}</p>
        <p className="truncate text-xs text-fg-muted">
          <span className={meta.fg}>{meta.label}</span> · {context}
          <span className="ml-1 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{age}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-bg-muted hover:text-fg"
          >
            {secondaryAction.label}
          </button>
        )}
        <button
          onClick={primaryAction.onClick}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-fg hover:bg-accent-strong"
        >
          {primaryAction.label}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/primitives/insight-card.tsx`**

```tsx
import * as React from "react";
import { AlertTriangle, Lightbulb, Hand, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightSeverity = "risk" | "opportunity" | "blocker" | "suggestion";

const SEVERITY_META: Record<InsightSeverity, { icon: LucideIcon; stripe: string; iconColor: string }> = {
  risk: { icon: AlertTriangle, stripe: "bg-danger", iconColor: "text-danger" },
  opportunity: { icon: Lightbulb, stripe: "bg-success", iconColor: "text-success" },
  blocker: { icon: Hand, stripe: "bg-warning", iconColor: "text-warning" },
  suggestion: { icon: Sparkles, stripe: "bg-info", iconColor: "text-info" },
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
    <div className={cn("relative overflow-hidden rounded-md border border-border bg-bg p-3 pl-4", className)}>
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", meta.stripe)} aria-hidden />
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.iconColor)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs font-medium text-accent hover:text-accent-strong"
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

- [ ] **Step 3: Create `components/primitives/phase-tracker.tsx`**

```tsx
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhaseStatus = "pending" | "active" | "in_discussion" | "completed";

export type PhaseTrackerStep = {
  id: string;
  label: string;
  status: PhaseStatus;
};

export function PhaseTracker({ steps }: { steps: PhaseTrackerStep[] }) {
  return (
    <ol className="flex w-full items-center gap-2" aria-label="Project phases">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  step.status === "completed" && "border-success bg-success text-white",
                  step.status === "active" && "border-accent bg-accent text-accent-fg",
                  step.status === "in_discussion" && "border-warning bg-warning-soft text-warning",
                  step.status === "pending" && "border-border bg-bg text-fg-subtle"
                )}
              >
                {step.status === "completed" ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="text-[11px] font-medium text-fg-muted">{step.label}</span>
            </div>
            {!last && (
              <span
                className={cn(
                  "h-px flex-1",
                  step.status === "completed" ? "bg-success" : "bg-border"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Create `components/primitives/index.ts`**

```ts
export * from "./action-inbox-item";
export * from "./empty-state";
export * from "./insight-card";
export * from "./kpi-stat";
export * from "./page-header";
export * from "./phase-tracker";
export * from "./project-card";
export * from "./task-row";
```

- [ ] **Step 5: Compile check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add components/primitives/action-inbox-item.tsx components/primitives/insight-card.tsx components/primitives/phase-tracker.tsx components/primitives/index.ts
git commit -m "feat(primitives): add ActionInboxItem, InsightCard, PhaseTracker"
```

---

## Task 13: /design-demo route — wire everything

**Files:**
- Create: `app/design-demo/page.tsx`

- [ ] **Step 1: Create demo page**

```tsx
"use client";

import {
  PageHeader,
  KPIStat,
  ProjectCard,
  TaskRow,
  ActionInboxItem,
  InsightCard,
  PhaseTracker,
  EmptyState,
} from "@/components/primitives";
import { AppShell } from "@/components/shell/app-shell";
import { Inbox } from "lucide-react";

export default function DesignDemoPage() {
  return (
    <AppShell
      role="ceo"
      user={{ name: "Rahul Gupta", email: "rahul@projecthub.test", roleLabel: "CEO" }}
      badges={{ reviews: 7, capture: 12 }}
      notificationCount={3}
      commandItems={[
        { id: "p", group: "Navigate", label: "Open Projects", run: () => location.assign("/projects") },
        { id: "r", group: "Navigate", label: "Open Reviews", run: () => location.assign("/reviews") },
        { id: "n", group: "Create", label: "New Project", run: () => location.assign("/projects/new") },
      ]}
    >
      <div className="space-y-10">
        <PageHeader
          title="Design demo"
          description="Every shared primitive in light + dark. Toggle the theme in the topbar."
          breadcrumb={<span>Internal / Design demo</span>}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">KPI Stats</h2>
          <div className="grid grid-cols-4 gap-4">
            <KPIStat label="Active Projects" value={12} delta={{ value: "+2 this week", direction: "up" }} />
            <KPIStat label="Pending Reviews" value={7} delta={{ value: "3 overdue", direction: "down" }} tone="danger" />
            <KPIStat label="Completed" value={34} delta={{ value: "+5 this month", direction: "up" }} />
            <KPIStat label="Team Members" value={8} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Phase Tracker</h2>
          <PhaseTracker
            steps={[
              { id: "1", label: "Requirements", status: "completed" },
              { id: "2", label: "Design", status: "completed" },
              { id: "3", label: "Development", status: "active" },
              { id: "4", label: "Review", status: "pending" },
              { id: "5", label: "Deploy", status: "pending" },
              { id: "6", label: "Done", status: "pending" },
            ]}
          />
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Action Inbox</h2>
            <ActionInboxItem
              kind="review"
              title="API Gateway rate limiter v2"
              context="Priya · API Gateway"
              age="2h ago"
              primaryAction={{ label: "Review", onClick: () => {} }}
              secondaryAction={{ label: "Defer", onClick: () => {} }}
            />
            <ActionInboxItem
              kind="capture"
              title="Follow-up: Karthik Q2 plan by Friday"
              context="from Wed standup"
              age="5h ago"
              primaryAction={{ label: "Convert", onClick: () => {} }}
              secondaryAction={{ label: "Skip", onClick: () => {} }}
            />
            <ActionInboxItem
              kind="extension"
              title="+3 days for Churn data prep"
              context="Arjun · Churn Model"
              age="8h ago"
              primaryAction={{ label: "Approve", onClick: () => {} }}
              secondaryAction={{ label: "Note", onClick: () => {} }}
            />
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">AI Insights</h2>
            <InsightCard
              severity="risk"
              title="Churn model deadline at risk"
              description="ML pipeline blocked on data access · 2 day delay projected"
              action={{ label: "View project", onClick: () => {} }}
            />
            <InsightCard
              severity="opportunity"
              title="Reuse RAG infrastructure"
              description="API Gateway team's auth service applies to Internal Search"
              action={{ label: "Suggest reuse", onClick: () => {} }}
            />
            <InsightCard
              severity="blocker"
              title="DevOps capacity tight next week"
              description="3 deploys scheduled, only 1 DevOps engineer available"
            />
            <InsightCard
              severity="suggestion"
              title="Karthik response time trending up"
              description="30% slower on review feedback this sprint"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Project Cards</h2>
          <div className="grid grid-cols-3 gap-4">
            <ProjectCard
              href="#"
              title="API Gateway & Rate Limiting"
              type="engineering"
              priority="high"
              status="active"
              phaseLabel="Phase 3 of 6 · Development"
              progress={52}
              daysRemaining={8}
              assigneeNames={["Priya Sharma", "Arjun Mehta", "Vikram Patel"]}
            />
            <ProjectCard
              href="#"
              title="Churn Prediction Model"
              type="data_science"
              priority="critical"
              status="active"
              phaseLabel="Phase 2 of 5 · Experiment"
              progress={38}
              daysRemaining={4}
              assigneeNames={["Meera Iyer", "Priya Sharma"]}
            />
            <ProjectCard
              href="#"
              title="Onboarding Flow Redesign"
              type="design"
              priority="medium"
              status="active"
              phaseLabel="Phase 4 of 5 · Review"
              progress={71}
              daysRemaining={12}
              assigneeNames={["Sneha Kapoor", "Karthik Verma", "Ananya Roy", "Rahul Gupta"]}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Task Rows</h2>
          <div className="rounded-md border border-border bg-bg p-2">
            <TaskRow title="Implement Redis-based throttling" assigneeName="Priya" due="Fri" priority="high" />
            <TaskRow title="Build rate-limit middleware" assigneeName="Arjun" due="Mon" priority="medium" />
            <TaskRow title="Token bucket impl" assigneeName="Priya" due="Today" priority="critical" />
            <TaskRow title="Initial design doc" assigneeName="Rahul" priority="low" done />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Empty State</h2>
          <EmptyState
            icon={Inbox}
            title="You're caught up"
            description="No pending reviews. Take a breath."
          />
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Run dev server and visit page**

Run: `npm run dev`
Open: `http://localhost:3000/design-demo`
Expected:
- Page renders with full sidebar (Daily Cockpit / Work / People / Configuration), topbar with search button, theme toggle, notifications bell, avatar.
- All primitives visible.
- Theme toggle switches between light and dark — every primitive has correct contrast in both.
- ⌘K (or Ctrl+K) opens the command palette; typing filters; Escape closes.
- Sidebar links navigate (404 is OK — those pages don't exist yet).

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass (theme-toggle, sidebar-link, command-palette, kpi-stat, project-card).

- [ ] **Step 4: Commit**

```bash
git add app/design-demo/page.tsx
git commit -m "feat(demo): add /design-demo route showcasing every primitive"
```

---

## Task 14: Final verification & docs touch-up

**Files:**
- Modify: `docs/superpowers/specs/2026-05-02-projecthub-redesign-design.md` (add a status note at the top)

- [ ] **Step 1: Run build to verify production output**

Run: `npm run build`
Expected: build succeeds, type checks pass, no Tailwind errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: all 5 test files pass (`theme-toggle`, `sidebar-link`, `command-palette`, `kpi-stat`, `project-card`).

- [ ] **Step 3: Add a one-line status note to the spec**

Modify the design spec to add a `## Implementation status` section after `## Locked decisions`:

```markdown
## Implementation status

- 2026-05-02: Plan 1 (Foundations) merged — design tokens, theme provider, AppShell, command palette, primitives, /design-demo route.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-02-projecthub-redesign-design.md
git commit -m "docs: mark Plan 1 (Foundations) as merged in design spec"
```

---

## Acceptance criteria

A reviewer can confirm Plan 1 is done if all of these are true:

1. `npm test` passes (5 test files green).
2. `npm run build` succeeds with zero TS or Tailwind errors.
3. Visiting `/design-demo` shows the full AppShell with the CEO sidebar, every primitive renders, ⌘K opens the command palette, and the theme toggle switches between light and dark with correct contrast everywhere.
4. The repo has no `mock-data` regressions — Plan 1 does not touch existing prototype pages.
5. `lib/design-tokens.ts`, the new components under `components/shell/` and `components/primitives/`, and the new tests all exist at the documented paths.

## Out of scope (lands in later plans)

- Login page, NextAuth, role middleware → Plan 2
- Real DB-backed sidebar badges → Plan 3
- Existing prototype pages — they are untouched and can stay broken visually until Plans 4–7 replace them
