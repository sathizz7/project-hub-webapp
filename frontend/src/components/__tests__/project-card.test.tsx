import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProjectCard } from "@/components/primitives/project-card";

describe("ProjectCard", () => {
  it("renders project title, type pill, and progress", () => {
    render(
      <ProjectCard
        title="API Gateway"
        type="engineering"
        priority="high"
        status="active"
        phaseLabel="Phase 3 of 6 · Development"
        progress={52}
        daysRemaining={8}
        assigneeNames={["Priya Sharma", "Arjun Mehta"]}
      />
    );
    expect(screen.getByText("API Gateway")).toBeInTheDocument();
    expect(screen.getByText(/engineering/i)).toBeInTheDocument();
    expect(screen.getByText("52%")).toBeInTheDocument();
    expect(screen.getByText(/8 days/i)).toBeInTheDocument();
  });
});
