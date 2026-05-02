# ProjectHub Stitch Designs — Screen Inventory

**Stitch project:** [ProjectHub Redesign](https://stitch.withgoogle.com/app/projects/14849942036515145759)
**Project ID:** `14849942036515145759`
**Design system asset ID:** `5278782880358906860`

Open the project in Stitch's web UI to view full-fidelity HTML+CSS for each screen.

## Design system in Stitch

- **Display name:** ProjectHub Design System
- **Color mode:** LIGHT (with dark parity to be applied at implementation time via `next-themes`)
- **Color variant:** NEUTRAL
- **Primary:** `#4F46E5` (Indigo 600)
- **Roundness:** ROUND_EIGHT
- **Fonts:** Stitch substituted Inter for Geist in its theme tokens; the implementation will still use Geist Sans/Mono per the design spec — Inter renders nearly identical at 14px body and is a safe fallback.

## Screens generated

| # | Screen | Stitch screen ID | Status |
|---|--------|------------------|--------|
| 1 | Review Queue (CEO) | `0f59e7dc21544442bef57cd56b95e39c` | ✓ Generated |
| 2 | AI Capture | `2eaf2a985a984ba7a9838423fd61714a` | ✓ Generated |
| 3 | Command Center (CEO `/`) | — | ⏳ Pending (timed out, may still be generating) |
| 4 | Org Calendar | — | ⏳ Pending |
| 5 | Projects List | — | ⏳ Pending |
| 6 | Project Workspace (Tasks/Kanban tab) | — | ⏳ Pending |
| 7 | New Project Wizard (Step 2 — AI Plan) | — | ⏳ Pending |
| 8 | Team Overview | — | Not started |
| 9 | Member Profile | — | Not started |
| 10 | Leave & Availability | — | Not started |
| 11 | Manage Team | — | Not started |
| 12 | Team-member My Today | — | Not started |
| 13 | Team-member My Tasks (Kanban) | — | Not started |

## How to view a generated screen

```
1. Open https://stitch.withgoogle.com/app/projects/14849942036515145759
2. Find the screen by name in the project library
3. Each screen has an HTML download URL and a screenshot URL (preserved in the tool response when generated)
```

## Variants planned (after all base screens land)

For the 3 highest-impact screens — Command Center, Project Workspace, My Today — use `mcp__stitch__generate_variants` with `creativeRange=REFINE`, `variantCount=2`, `aspects=[LAYOUT]` to produce alternative layouts for side-by-side comparison.

## Implementation handoff

When implementing the Next.js frontend:

1. Open each Stitch screen, download its HTML, and use it as a visual reference (not as code to ship).
2. Re-implement using shadcn/ui + Tailwind 4 + the custom components defined in [`docs/superpowers/specs/2026-05-02-projecthub-redesign-design.md`](superpowers/specs/2026-05-02-projecthub-redesign-design.md).
3. Apply Geist Sans + Geist Mono via Next.js's font loader (already in `package.json`).
4. Implement light + dark themes via `next-themes`; the Stitch screens cover the light direction, dark mirrors it on the same neutral-slate scale.
