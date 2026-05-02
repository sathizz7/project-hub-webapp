import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

describe("ThemeToggle", () => {
  it("renders an accessible button", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("toggles theme on click", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await user.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
