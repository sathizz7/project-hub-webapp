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
