"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  ClipboardCheck,
  Users,
  UserPlus,
  CalendarDays,
  Calendar,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getPendingReviews, getPendingCaptureItems } from "@/lib/mock-data";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "reviews" | "capture";
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/", label: "Command Center", icon: LayoutDashboard },
      { href: "/calendar", label: "CEO Calendar", icon: Calendar },
    ],
  },
  {
    title: "PROJECTS",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/projects/new", label: "New Project", icon: Plus },
    ],
  },
  {
    title: "REVIEWS",
    items: [
      { href: "/reviews", label: "Review Queue", icon: ClipboardCheck, badgeKey: "reviews" },
    ],
  },
  {
    title: "TEAM",
    items: [
      { href: "/team", label: "Team", icon: Users },
      { href: "/team/manage", label: "Manage Team", icon: UserPlus },
      { href: "/team/availability", label: "Leave & Availability", icon: CalendarDays },
    ],
  },
  {
    title: "AI",
    items: [
      { href: "/capture", label: "AI Capture", icon: Sparkles, badgeKey: "capture" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const reviewCount = getPendingReviews().length;
  const captureCount = getPendingCaptureItems().length;

  const badgeCounts: Record<string, number> = {
    reviews: reviewCount,
    capture: captureCount,
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-50">
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">ProjectHub</h1>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          CEO Command Center
        </p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {navSections.map((section, sectionIdx) => (
          <div key={section.title} className={cn(sectionIdx > 0 && "mt-5")}>
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider px-3 mb-2">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badgeKey && count > 0 && (
                      <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-amber-500 text-[10px] font-bold text-white px-1">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-xs text-blue-600 font-medium">Prototype Mode</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Frontend mockup — no backend
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            R
          </div>
          <div>
            <p className="text-sm font-medium">Rahul</p>
            <p className="text-xs text-muted-foreground">CEO</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
