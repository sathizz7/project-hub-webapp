import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamMyTodayStub } from "@/components/landing/team-my-today-stub";

describe("Landing stubs", () => {
  it("Team stub greets by first name", () => {
    render(<TeamMyTodayStub name="Priya" />);
    expect(screen.getByText(/hey priya\./i)).toBeInTheDocument();
  });
});
