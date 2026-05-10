import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ReviewRow } from "@/components/reviews/review-queue";
import type { SerializedReviewSub } from "@/lib/review-and-projects-helpers";

const sub: SerializedReviewSub = {
  id: "s1",
  title: "API Gateway Architecture Doc",
  type: "architecture",
  description: "Covers request flow and rate limiting",
  link: "",
  createdAt: "2026-05-10T08:00:00.000Z",
  project: { id: "p1", title: "API Gateway", requirement: "Build a gateway" },
  phase: { phaseName: "Design" },
  user: { id: "u1", name: "Arjun Mehta", avatarColor: "#0EA5E9" },
  feedback: [{ id: "f1", text: "Good work", isAi: false, createdAt: "2026-05-10T09:00:00.000Z", fromUser: { id: "u0", name: "Rahul", avatarColor: "#4F46E5" } }],
};

describe("ReviewRow", () => {
  it("renders the submission title", () => {
    render(<ReviewRow sub={sub} onClick={() => {}} />);
    expect(screen.getByText(/api gateway architecture doc/i)).toBeInTheDocument();
  });

  it("renders the project name", () => {
    render(<ReviewRow sub={sub} onClick={() => {}} />);
    expect(screen.getByText(/api gateway/i)).toBeInTheDocument();
  });

  it("renders the submitter name", () => {
    render(<ReviewRow sub={sub} onClick={() => {}} />);
    expect(screen.getByText(/arjun mehta/i)).toBeInTheDocument();
  });

  it("shows feedback count", () => {
    render(<ReviewRow sub={sub} onClick={() => {}} />);
    expect(screen.getByText(/1 review/i)).toBeInTheDocument();
  });

  it("calls onClick when the row is clicked", async () => {
    const onClick = vi.fn();
    render(<ReviewRow sub={sub} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
