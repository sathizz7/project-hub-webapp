"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskRow, EmptyState } from "@/components/primitives";
import { CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SerializedTask } from "../types";

export function TasksTab({ tasks }: { tasks: SerializedTask[] }) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);

  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} title="No tasks" description="Tasks will appear here once added to this project." />;
  }

  async function toggleTask(task: SerializedTask) {
    setToggling(task.id);
    const newStatus = task.status === "completed" ? "in_progress" : "completed";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setToggling(null);
    router.refresh();
  }

  const active = tasks.filter(t => t.status !== "completed" && t.status !== "killed");
  const done = tasks.filter(t => t.status === "completed" || t.status === "killed");

  return (
    <div className="space-y-4">
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
      {done.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Completed ({done.length})</p>
          <div className="rounded-md border border-border bg-bg p-2">
            {done.map(task => (
              <TaskRow
                key={task.id}
                title={task.title}
                assigneeName={task.assignee?.name}
                priority={task.priority}
                done
                onToggle={() => toggling !== task.id && toggleTask(task)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
