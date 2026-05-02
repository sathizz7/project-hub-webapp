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
