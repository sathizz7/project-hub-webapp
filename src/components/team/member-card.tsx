import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SerializedMember } from "@/lib/team-helpers";

const DEPT_COLORS: Record<string, string> = {
  "Engineering":  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "Data Science": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  "Design":       "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "Product":      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "Leadership":   "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "Other":        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-xl font-bold tabular-nums", color)}>{pct}</span>
      <span className="text-xs text-fg-muted">/100</span>
    </div>
  );
}

export function MemberCard({ member }: { member: SerializedMember }) {
  const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const deptClass = DEPT_COLORS[member.department] ?? DEPT_COLORS["Other"];

  return (
    <Link
      href={`/team/${member.id}`}
      className="group block rounded-lg border border-border bg-bg p-5 shadow-sm hover:border-accent/40 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: member.avatarColor }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-fg truncate">{member.name}</p>
          <p className="text-xs text-fg-muted truncate">{member.role}</p>
        </div>
      </div>

      <Badge className={cn("text-[11px] mb-4", deptClass)}>{member.department}</Badge>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <ScoreGauge score={member.performance.score} />
          <p className="text-[10px] text-fg-muted mt-0.5">Perf Score</p>
        </div>
        <div>
          <p className="text-xl font-bold text-fg tabular-nums">{member.activeProjectCount}</p>
          <p className="text-[10px] text-fg-muted mt-0.5">Projects</p>
        </div>
        <div>
          <p className="text-xl font-bold text-fg tabular-nums">
            {member.performance.avgResponseHours > 0
              ? `${member.performance.avgResponseHours.toFixed(0)}h`
              : "—"}
          </p>
          <p className="text-[10px] text-fg-muted mt-0.5">Avg response</p>
        </div>
      </div>
    </Link>
  );
}
