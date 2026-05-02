import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SidebarLink } from "@/components/shell/sidebar-link";
import { LayoutDashboard } from "lucide-react";

describe("SidebarLink", () => {
  it("renders label and icon", () => {
    render(<SidebarLink href="/" label="Dashboard" icon={LayoutDashboard} active={false} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("shows the badge when provided", () => {
    render(<SidebarLink href="/r" label="Reviews" icon={LayoutDashboard} active={false} badge={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("applies active styles when active", () => {
    render(<SidebarLink href="/" label="Dashboard" icon={LayoutDashboard} active={true} />);
    expect(screen.getByRole("link")).toHaveAttribute("data-active", "true");
  });
});
