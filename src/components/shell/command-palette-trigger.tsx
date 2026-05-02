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
