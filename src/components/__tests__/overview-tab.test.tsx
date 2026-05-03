import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OverviewTab } from "@/components/projects/workspace/tabs/overview-tab";
import type { AiPlan, SerializedCheckpoint } from "@/components/projects/workspace/types";

const aiPlan: AiPlan = {
  summary: "Build a high-performance API gateway",
  milestones: [{ name: "Core Gateway Live", description: "Routing working", targetDay: 10 }],
  killCriteria: ["Cannot achieve 5k req/s"],
  risks: [{ risk: "Redis SPoF", mitigation: "Use Sentinel", severity: "medium" }],
};

const checkpoints: SerializedCheckpoint[] = [
  { id: "c1", decision: "continue", notes: "On track at day 8", createdAt: "2026-05-01T10:00:00.000Z" },
  { id: "c2", decision: "kill", notes: "Descoped", createdAt: "2026-04-20T10:00:00.000Z" },
];

describe("OverviewTab", () => {
  it("renders the objective/requirement", () => {
    render(<OverviewTab requirement="Build a centralized API gateway" aiPlan={aiPlan} techStack={["Go", "Redis"]} checkpoints={[]} />);
    expect(screen.getByText(/build a centralized api gateway/i)).toBeInTheDocument();
  });

  it("renders AI plan summary", () => {
    render(<OverviewTab requirement="req" aiPlan={aiPlan} techStack={[]} checkpoints={[]} />);
    expect(screen.getByText(/build a high-performance api gateway/i)).toBeInTheDocument();
  });

  it("renders kill criteria", () => {
    render(<OverviewTab requirement="req" aiPlan={aiPlan} techStack={[]} checkpoints={[]} />);
    expect(screen.getByText(/cannot achieve 5k req\/s/i)).toBeInTheDocument();
  });

  it("renders tech stack chips", () => {
    render(<OverviewTab requirement="req" aiPlan={{}} techStack={["Go", "Redis", "Docker"]} checkpoints={[]} />);
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Redis")).toBeInTheDocument();
  });

  it("renders checkpoint history with decision labels", () => {
    render(<OverviewTab requirement="req" aiPlan={{}} techStack={[]} checkpoints={checkpoints} />);
    expect(screen.getByText(/on track at day 8/i)).toBeInTheDocument();
    expect(screen.getByText(/continue/i)).toBeInTheDocument();
    expect(screen.getByText(/kill/i)).toBeInTheDocument();
  });

  it("shows 'No checkpoints yet' when list is empty", () => {
    render(<OverviewTab requirement="req" aiPlan={{}} techStack={[]} checkpoints={[]} />);
    expect(screen.getByText(/no checkpoints yet/i)).toBeInTheDocument();
  });
});
