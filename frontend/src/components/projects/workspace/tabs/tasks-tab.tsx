"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskRow, EmptyState } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckSquare, Plus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { SerializedTask, SerializedPhase, ProjectWorkspaceData } from "../types";

type Assignee = ProjectWorkspaceData["assignees"][number];

type Props = {
  tasks: SerializedTask[];
  assignees: Assignee[];
  phases: SerializedPhase[];
  projectId: string;
};

type Priority = "low" | "medium" | "high" | "critical";

export function TasksTab({ tasks, assignees, phases, projectId }: Props) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);

  // Add-task form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleTask(task: SerializedTask) {
    setToggling(task.id);
    const newStatus = task.status === "completed" ? "in_progress" : "completed";
    const res = await fetch(`/api/proxy/v1/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const envelope = await res.json().catch(() => null);
    setToggling(null);
    if (!res.ok || envelope?.status !== "success") {
      console.error("Failed to update task:", envelope?.message ?? res.statusText);
      return;
    }
    router.refresh();
  }

  function resetForm() {
    setTitle("");
    setAssigneeId("");
    setPhaseId("");
    setPriority("medium");
    setDueDate("");
    setError(null);
  }

  async function submitNewTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = {
      title: title.trim(),
      project_id: projectId,
      priority,
    };
    if (assigneeId) body.assignee_id = assigneeId;
    if (phaseId) body.phase_id = phaseId;
    if (dueDate) body.due_date = new Date(dueDate).toISOString();

    try {
      const res = await fetch("/api/proxy/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const envelope = await res.json().catch(() => null);
      if (!res.ok || envelope?.status !== "success") {
        setError(envelope?.message ?? "Failed to create task");
        return;
      }
      resetForm();
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const active = tasks.filter(t => t.status !== "completed" && t.status !== "killed");
  const done = tasks.filter(t => t.status === "completed" || t.status === "killed");

  return (
    <div className="space-y-4">
      {/* Add-task form */}
      <div className="flex justify-end">
        {!showForm ? (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={submitNewTask}
          className="rounded-md border border-border bg-bg p-4 space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Write API documentation"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-task-assignee">Assignee</Label>
              <select
                id="new-task-assignee"
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Unassigned</option>
                {assignees.map(a => (
                  <option key={a.user.id} value={a.user.id}>
                    {a.user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-task-phase">Phase</Label>
              <select
                id="new-task-phase"
                value={phaseId}
                onChange={e => setPhaseId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No phase</option>
                {phases.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.phaseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-task-priority">Priority</Label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-task-due">Due date</Label>
              <Input
                id="new-task-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {tasks.length === 0 && !showForm && (
        <EmptyState
          icon={CheckSquare}
          title="No tasks"
          description="Click 'New Task' above to add the first one."
        />
      )}

      {/* Active tasks */}
      {active.length > 0 && (
        <div className="rounded-md border border-border bg-bg p-2">
          {active.map(task => (
            <TaskRow
              key={task.id}
              title={task.title}
              assigneeName={task.assignee?.name}
              due={task.dueDate ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true }) : undefined}
              priority={task.priority}
              done={false}
              onToggle={() => toggling !== task.id && toggleTask(task)}
            />
          ))}
        </div>
      )}

      {/* Completed tasks — show who + when */}
      {done.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Completed ({done.length})
          </p>
          <div className="rounded-md border border-border bg-bg p-2">
            {done.map(task => (
              <div key={task.id} className="flex items-start gap-3 px-2 py-2">
                <button
                  type="button"
                  onClick={() => toggling !== task.id && toggleTask(task)}
                  aria-label="Reopen task"
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-emerald-600 bg-emerald-600 text-white"
                >
                  <CheckSquare className="h-2.5 w-2.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg-muted line-through">{task.title}</p>
                  {(task.assignee || task.completedAt) && (
                    <p className="mt-0.5 text-xs text-fg-muted flex items-center gap-1.5">
                      {task.assignee && (
                        <>
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                            )}
                            style={{ backgroundColor: task.assignee.avatarColor }}
                            title={task.assignee.name}
                          >
                            {task.assignee.name.charAt(0).toUpperCase()}
                          </span>
                          <span>Completed by {task.assignee.name}</span>
                        </>
                      )}
                      {task.completedAt && (
                        <>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
