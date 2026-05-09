"use client";

import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/primitives";
import { Users } from "lucide-react";
import { MemberCard } from "./member-card";
import { filterMembers, sortMembers, type SerializedMember } from "@/lib/team-helpers";

const DEPARTMENTS = ["all", "Engineering", "Data Science", "Design", "Product", "Leadership"];
const SORT_OPTIONS = [
  { value: "name",     label: "Name (A–Z)" },
  { value: "score",    label: "Performance ↓" },
  { value: "response", label: "Response time ↑" },
];

export function TeamOverview({ members }: { members: SerializedMember[] }) {
  const [dept, setDept] = useState("all");
  const [sort, setSort] = useState("name");

  const visible = sortMembers(filterMembers(members, dept), sort);

  return (
    <div className="space-y-6">
      <PageHeader title="Team" description={`${members.length} members`} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {DEPARTMENTS.map(d => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                dept === d
                  ? "bg-accent text-accent-fg"
                  : "bg-bg-subtle text-fg-muted hover:bg-bg-muted"
              }`}
            >
              {d === "all" ? "All" : d}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="ml-auto rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/30"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Users} title="No team members" description="No members match this filter." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map(m => <MemberCard key={m.id} member={m} />)}
        </div>
      )}
    </div>
  );
}
