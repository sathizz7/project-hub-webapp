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
