import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KPIStat } from "@/components/primitives/kpi-stat";

describe("KPIStat", () => {
  it("renders label, value, and positive delta", () => {
    render(<KPIStat label="Active Projects" value={12} delta={{ value: "+2 this week", direction: "up" }} />);
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("+2 this week")).toBeInTheDocument();
    expect(screen.getByTestId("delta")).toHaveAttribute("data-direction", "up");
  });

  it("renders without delta when not provided", () => {
    render(<KPIStat label="Team" value={8} />);
    expect(screen.queryByTestId("delta")).not.toBeInTheDocument();
  });
});
