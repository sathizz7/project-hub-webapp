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
