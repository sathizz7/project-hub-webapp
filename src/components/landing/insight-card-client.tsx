"use client";

import { useRouter } from "next/navigation";
import { InsightCard } from "@/components/primitives";
import type { InsightData } from "@/lib/command-center-data";

export function InsightCardClient({ severity, title, description, actionHref, actionLabel }: InsightData & { actionHref?: string; actionLabel?: string }) {
  const router = useRouter();
  return (
    <InsightCard
      severity={severity}
      title={title}
      description={description}
      action={actionHref && actionLabel ? { label: actionLabel, onClick: () => router.push(actionHref) } : undefined}
    />
  );
}
