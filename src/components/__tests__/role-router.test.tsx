import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CeoCommandCenterStub } from "@/components/landing/ceo-command-center-stub";
import { TeamMyTodayStub } from "@/components/landing/team-my-today-stub";

describe("Landing stubs", () => {
  it("CEO stub greets by first name", () => {
    render(<CeoCommandCenterStub name="Rahul" />);
    expect(screen.getByText(/good morning, rahul\./i)).toBeInTheDocument();
  });

  it("Team stub greets by first name", () => {
    render(<TeamMyTodayStub name="Priya" />);
    expect(screen.getByText(/hey priya\./i)).toBeInTheDocument();
  });
});
