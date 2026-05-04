import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemberCard } from "@/components/team/member-card";
import type { SerializedMember } from "@/lib/team-helpers";

const member: SerializedMember = {
  id: "u1",
  name: "Priya Sharma",
  role: "Senior Data Scientist",
  email: "priya@test.com",
  avatarColor: "#9333EA",
  department: "Data Science",
  activeProjectCount: 2,
  performance: { score: 87, avgResponseHours: 3.5, submissionsCount: 6 },
};

describe("MemberCard", () => {
  it("renders the member name", () => {
    render(<MemberCard member={member} />);
    expect(screen.getByText(/priya sharma/i)).toBeInTheDocument();
  });
  it("renders the job role", () => {
    render(<MemberCard member={member} />);
    expect(screen.getByText(/senior data scientist/i)).toBeInTheDocument();
  });
  it("renders the department badge", () => {
    render(<MemberCard member={member} />);
    expect(screen.getByText(/data science/i)).toBeInTheDocument();
  });
  it("renders the performance score", () => {
    render(<MemberCard member={member} />);
    expect(screen.getByText(/87/)).toBeInTheDocument();
  });
  it("renders active project count", () => {
    render(<MemberCard member={member} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});
