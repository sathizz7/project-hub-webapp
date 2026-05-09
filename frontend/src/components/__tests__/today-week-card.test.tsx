import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TodayWeekCard } from "@/components/landing/today-week-card";

describe("TodayWeekCard", () => {
  it("shows leave names when people are on leave today", () => {
    render(<TodayWeekCard activeLeavesToday={[{ userName: "Alice Mehta" }, { userName: "Bob Sharma" }]} upcomingLeaveCount={3} tasksThisWeek={[]} />);
    expect(screen.getByText(/alice mehta/i)).toBeInTheDocument();
    expect(screen.getByText(/bob sharma/i)).toBeInTheDocument();
  });

  it("shows 'No one on leave today' when list is empty", () => {
    render(<TodayWeekCard activeLeavesToday={[]} upcomingLeaveCount={0} tasksThisWeek={[]} />);
    expect(screen.getByText(/no one on leave today/i)).toBeInTheDocument();
  });

  it("shows task titles in the week section", () => {
    render(<TodayWeekCard activeLeavesToday={[]} upcomingLeaveCount={0} tasksThisWeek={[{ id: "t1", title: "Ship auth module", dueDate: new Date("2026-05-05") }, { id: "t2", title: "Deploy to staging", dueDate: new Date("2026-05-07") }]} />);
    expect(screen.getByText(/ship auth module/i)).toBeInTheDocument();
    expect(screen.getByText(/deploy to staging/i)).toBeInTheDocument();
  });

  it("shows 'No tasks this week' when list is empty", () => {
    render(<TodayWeekCard activeLeavesToday={[]} upcomingLeaveCount={0} tasksThisWeek={[]} />);
    expect(screen.getByText(/no tasks this week/i)).toBeInTheDocument();
  });

  it("shows upcoming leave badge when upcomingLeaveCount > 0", () => {
    render(<TodayWeekCard activeLeavesToday={[]} upcomingLeaveCount={4} tasksThisWeek={[]} />);
    expect(screen.getByText(/4.*upcoming/i)).toBeInTheDocument();
  });

  it("hides upcoming badge when upcomingLeaveCount is 0", () => {
    render(<TodayWeekCard activeLeavesToday={[]} upcomingLeaveCount={0} tasksThisWeek={[]} />);
    expect(screen.queryByText(/upcoming/i)).not.toBeInTheDocument();
  });
});
