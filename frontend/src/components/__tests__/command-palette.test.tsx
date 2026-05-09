import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { CommandPalette } from "@/components/shell/command-palette";

const items = [
  { id: "1", label: "Open Reviews", group: "Navigate", run: () => {} },
  { id: "2", label: "New Project", group: "Create", run: () => {} },
];

describe("CommandPalette", () => {
  it("opens with cmd+k and closes with escape", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);
    expect(screen.queryByPlaceholderText(/search or jump/i)).not.toBeInTheDocument();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByPlaceholderText(/search or jump/i)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByPlaceholderText(/search or jump/i)).not.toBeInTheDocument();
  });

  it("filters items by query", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={items} />);
    await user.keyboard("{Meta>}k{/Meta}");
    const input = await screen.findByPlaceholderText(/search or jump/i);
    await user.type(input, "Rev");
    expect(screen.getByText("Open Reviews")).toBeInTheDocument();
    expect(screen.queryByText("New Project")).not.toBeInTheDocument();
  });
});
