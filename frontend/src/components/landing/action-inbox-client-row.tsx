"use client";

import { useRouter } from "next/navigation";
import { ActionInboxItem } from "@/components/primitives";

export type SerializedInboxItem =
  | { kind: "review"; id: string; title: string; projectTitle: string; submitterName: string; age: string }
  | { kind: "capture"; id: string; title: string; itemType: string; age: string }
  | { kind: "extension"; id: string; projectTitle: string; requesterName: string; daysRequested: number; age: string };

export function ActionInboxClientRow({ item }: { item: SerializedInboxItem }) {
  const router = useRouter();

  if (item.kind === "review") {
    return (
      <ActionInboxItem
        kind="review"
        title={item.title}
        context={`${item.projectTitle} · ${item.submitterName}`}
        age={item.age}
        primaryAction={{ label: "Review", onClick: () => router.push("/reviews") }}
      />
    );
  }

  if (item.kind === "capture") {
    return (
      <ActionInboxItem
        kind="capture"
        title={item.title}
        context={item.itemType}
        age={item.age}
        primaryAction={{ label: "Process", onClick: () => router.push("/capture") }}
      />
    );
  }

  // extension
  return (
    <ActionInboxItem
      kind="extension"
      title={`+${item.daysRequested}d — ${item.projectTitle}`}
      context={`Requested by ${item.requesterName}`}
      age={item.age}
      primaryAction={{ label: "Decide", onClick: () => router.push("/projects") }}
    />
  );
}
