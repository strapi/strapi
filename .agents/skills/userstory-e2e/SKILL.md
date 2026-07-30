---
name: userstory-e2e
description: Generate or update Playwright e2e tests for the billing portal so they codify the acceptance criteria in docs/UserStories/*.md. Use when a UserStory file is added or updated and you need matching e2e coverage in front/e2e/. Uses the Playwright MCP to drive the running app and discover selectors before producing @playwright/test specs.
---

# Generate e2e tests from UserStories

The user-story files in [docs/UserStories/](../../../docs/UserStories/) are the source of truth for what the portal must do. Each acceptance criterion (`AC1.1`, `AC1.2`, …) should be backed by a Playwright test in [front/e2e/](../../../front/e2e/). This skill drives the live app via the Playwright MCP to discover the right selectors, then writes deterministic specs that use the API-mocking fixtures already in place.

## Source of truth

- One markdown file per page/area: [login.md](../../../docs/UserStories/login.md), [protected-routes.md](../../../docs/UserStories/protected-routes.md), [subscriptions.md](../../../docs/UserStories/subscriptions.md), [manage-seats.md](../../../docs/UserStories/manage-seats.md), [invoices.md](../../../docs/UserStories/invoices.md), [payment-methods.md](../../../docs/UserStories/payment-methods.md). New stories go in the same folder.
- Each AC has a Given/When/Then. The When/Then is what the test asserts; the Given is the fixture / mock state.

If the user names a story (e.g. "invoices") work only on that file. If they say "all", iterate over every file.

## Where the tests live

- Spec files: `front/e2e/<area>.spec.ts` (one spec per story file — e.g. `front/e2e/invoices.spec.ts`).
- API mocking: [front/e2e/helpers/mockApi.ts](../../../front/e2e/helpers/mockApi.ts) — `authenticate(page, overrides)` boots the app with `setupApiMocks` and resolves the session. Pass `overrides` keyed by URL path-suffix to swap specific responses.
- Fixtures: [front/e2e/fixtures/mockData.ts](../../../front/e2e/fixtures/mockData.ts) — reuse the existing `mock*` objects (`mockSubscription`, `mockCloudSubscription`, `mockGrowthSubscriptionWithSeatAddon`, `mockInvoices`, `mockSeatChangePreview`, etc.). Only add a new fixture if no existing one fits, and add it next to the others.
- Run command: `pnpm --filter front test:e2e` (UI mode: `:e2e:ui`).

## Workflow

For each AC you need to cover:

1. **Read the AC.** Lift Given → fixture, When → user action, Then → assertion.
2. **Drive the live app with the Playwright MCP** to confirm the AC is implemented and to discover the right selectors.
   - The dev server runs at `http://localhost:5173`. If it's not running, ask the user to start it (`pnpm dev`) rather than starting it yourself — it's a long-running background process.
   - Use `mcp__plugin_playwright_playwright__browser_navigate` to open the page, then `browser_snapshot` to capture the accessible tree. Prefer role-based locators (`getByRole`, `getByText`) over CSS selectors so the generated specs aren't tied to design-system internals.
   - For interactive flows, drive the UI with `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`. Take a `browser_snapshot` after each step to see the resulting state.
   - You don't need to log in via the real OTP flow — the mocked spec will use `authenticate(page, overrides)` instead. Use the MCP only to verify the behaviour and read selectors.
3. **Write or update the spec** in `front/e2e/<area>.spec.ts`. Follow the conventions from the existing files (look at [manage-seats.spec.ts](../../../front/e2e/manage-seats.spec.ts) for the canonical shape):
   - Top-level `test.describe('<Area>', ...)` grouping, nested `test.describe(...)` per story.
   - One `test('AC<n.m> — <short verb>', ...)` per acceptance criterion. Keep the AC reference in the title so a failure points straight back at the story.
   - Use `test.beforeEach` to call `authenticate(page, { ... })` with fixture overrides for that story's Given clause.
   - Prefer `page.getByRole(...)` and `page.getByText(...)`. Reserve CSS/test-ids for cases where the design system doesn't expose an accessible name.
   - When the same line item / text appears in multiple sections (e.g. the two-section invoice breakdown in [manage-seats.spec.ts:85-99](../../../front/e2e/manage-seats.spec.ts#L85-L99)), assert with `toHaveCount(n)` against the section heading rather than relying on strict-mode single-match.
   - For mutation flows that hit TanStack Query (subscription / invoices / payment methods / customer profile updates), assert through `await expect(...).toBeVisible()` / `toHaveText(...)` — Playwright's auto-retry handles the cache→render gap; don't manually `waitForTimeout`.
4. **Run the spec** and fix failures before moving on:
   ```bash
   pnpm --filter front test:e2e front/e2e/<area>.spec.ts
   ```
   If the dev server isn't reachable or a fixture is missing, fix at the source rather than weakening the assertion.
5. **Report** for each AC: covered ✅ / skipped (with reason) / new fixture added.

## Conventions to keep

- **One test per AC.** Don't bundle two ACs into one test — a failure should map back to a single Given/When/Then.
- **Don't echo the AC text into comments.** The test name carries the reference (`AC2.1 — Modal opens with a plan-named title`); the assertions speak for themselves.
- **Fixtures > inline data.** If a test needs a new shape (e.g. a downgraded subscription, a coupon-applied preview), add a named export to `mockData.ts` and reuse it.
- **No real backend calls.** Every `/api/**` interaction goes through `authenticate(page, overrides)`; never let a test hit the real server.
- **Skip silently invalid ACs.** If an AC describes behaviour that isn't implemented yet, report it as "blocked" and don't write a passing test that papers over the gap. Surface it back to the user.

## When to stop

- All requested ACs are covered by tests that pass against the current build.
- If something can't be tested deterministically (e.g. depends on real Chargebee state), document the gap in the report and leave the AC uncovered rather than writing a flaky test.
