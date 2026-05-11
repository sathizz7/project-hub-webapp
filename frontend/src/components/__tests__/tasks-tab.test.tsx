import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TasksTab } from "@/components/projects/workspace/tabs/tasks-tab";
import type { SerializedTask } from "@/components/projects/workspace/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const tasks: SerializedTask[] = [
  { id: "t1", title: "Implement Redis throttling", priority: "high", status: "in_progress", dueDate: "2026-05-10T00:00:00.000Z", completedAt: null, assignee: { id: "u1", name: "Priya", avatarColor: "#6366f1" } },
  { id: "t2", title: "Write unit tests", priority: "medium", status: "completed", dueDate: null, completedAt: null, assignee: null },
];

describe("TasksTab", () => {
  it("renders all task titles", () => {
    render(<TasksTab tasks={tasks} assignees={[]} phases={[]} projectId="p1" />);
    expect(screen.getByText(/implement redis throttling/i)).toBeInTheDocument();
    expect(screen.getByText(/write unit tests/i)).toBeInTheDocument();
  });

  it("shows completed tasks as done", () => {
    render(<TasksTab tasks={tasks} assignees={[]} phases={[]} projectId="p1" />);
    const doneRow = screen.getByText(/write unit tests/i).closest("div");
    expect(doneRow).not.toBeNull();
  });

  it("shows assignee name when present", () => {
    render(<TasksTab tasks={tasks} assignees={[]} phases={[]} projectId="p1" />);
    expect(screen.getByText(/priya/i)).toBeInTheDocument();
  });

  it("shows empty state when no tasks", () => {
    render(<TasksTab tasks={[]} assignees={[]} phases={[]} projectId="p1" />);
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });
});
