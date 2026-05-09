"use client";

import { useState } from "react";
import { ProjectCard, PageHeader, EmptyState } from "@/components/primitives";
import { FolderOpen } from "lucide-react";
import {
  filterProjects,
  sortProjects,
  type SerializedProjectListItem,
} from "@/lib/review-and-projects-helpers";

const TYPE_OPTIONS = [
  "all", "engineering", "research", "data_science", "design", "marketing",
  "strategy", "product", "operations", "hr", "legal", "sales", "finance", "mixed",
];

const STATUS_OPTIONS = ["all", "active", "completed", "killed"];

const SORT_OPTIONS = [
  { value: "recent",   label: "Recently created" },
  { value: "priority", label: "Priority" },
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "progress", label: "Progress (least done)" },
];

export function ProjectsList({ projects }: { projects: SerializedProjectListItem[] }) {
  const [typeFilter, setTypeFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort]                 = useState("recent");

  const visible = sortProjects(
    filterProjects(projects, { type: typeFilter, status: statusFilter }),
    sort
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${visible.length} of ${projects.length} project${projects.length !== 1 ? "s" : ""}`}
        actions={
          <a
            href="/projects/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent/90 transition-colors"
          >
            + New Project
          </a>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/30 capitalize"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t === "all" ? "All types" : t.replace("_", " ")}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/30 capitalize"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="ml-auto rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:ring-2 focus:ring-accent/30"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects" description="No projects match the current filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              href={`/projects/${project.id}`}
              title={project.title}
              type={project.type}
              priority={project.priority as "low" | "medium" | "high" | "critical"}
              status={project.status as "active" | "completed" | "paused" | "killed"}
              phaseLabel={project.activePhaseLabel}
              progress={project.progress}
              daysRemaining={project.daysRemaining}
              assigneeNames={project.assigneeNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
