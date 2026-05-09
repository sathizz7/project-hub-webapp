import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CaptureView } from "@/components/capture/capture-view";
import type { ParsedCaptureSession } from "@/components/capture/capture-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const mockSession: ParsedCaptureSession = {
  id: "s1",
  rawInput: "Remind Arjun to finish the doc by Thursday",
  createdAt: "2026-05-10T08:00:00.000Z",
  items: [
    { id: "i1", type: "follow_up", title: "Finish the doc", description: "Arjun to complete the doc", priority: "high", status: "pending", createdAt: "2026-05-10T08:00:00.000Z" },
  ],
};

describe("CaptureView", () => {
  it("renders a textarea for input", () => {
    render(<CaptureView recentSessions={[]} userId="u1" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders a Process button", () => {
    render(<CaptureView recentSessions={[]} userId="u1" />);
    expect(screen.getByRole("button", { name: /process/i })).toBeInTheDocument();
  });

  it("shows 'No items yet' when no current session", () => {
    render(<CaptureView recentSessions={[]} userId="u1" />);
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument();
  });

  it("renders session items when initialSession is passed", () => {
    render(<CaptureView recentSessions={[mockSession]} userId="u1" initialSession={mockSession} />);
    expect(screen.getAllByText(/finish the doc/i).length).toBeGreaterThan(0);
  });

  it("shows recent session count in history section", () => {
    render(<CaptureView recentSessions={[mockSession, mockSession]} userId="u1" />);
    expect(screen.getByText("Session History (2)")).toBeInTheDocument();
  });
});
