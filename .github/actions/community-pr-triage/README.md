# Community PR Triage

CLI tool that fetches open community PRs from [strapi/strapi](https://github.com/strapi/strapi), scores them by value and complexity, prints a prioritized triage report, and syncs issues to Linear.

## Prerequisites

- Node.js 18+
- [GitHub CLI (`gh`)](https://cli.github.com/) — authenticated with access to `strapi/strapi`
- [pnpm](https://pnpm.io/)
- A [Linear API key](https://linear.app/settings/api) (for sync mode only)

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env and add your LINEAR_API_KEY
```

## Commands

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `pnpm dry-run`           | Fetch & score all PRs, print report. No Linear changes.     |
| `pnpm start`             | Fetch, score, sync to Linear (create/update/close tickets). |
| `pnpm start -y`          | Same as above but skip confirmation prompts.                |
| `pnpm sprint-update`     | Full sync + post sprint recommendation + create milestone.  |
| `pnpm sprint-update:dry` | Preview sprint recommendation without syncing to Linear.    |
| `pnpm test`              | Run tests (single run).                                     |
| `pnpm test:watch`        | Run tests in watch mode.                                    |

### Flags

- `--dry-run` — Report only, no Linear sync
- `--sprint-update` — Include sprint recommendation, milestone creation, and project update
- `--yes` / `-y` — Skip confirmation prompts (useful for CI)

### Examples

```bash
# Preview what would be synced without touching Linear
pnpm dry-run

# Sync all PRs to Linear (will prompt for confirmation)
pnpm start

# Sync + generate sprint recommendation with milestone
pnpm sprint-update

# Run everything non-interactively (CI or scripting)
pnpm start --sprint-update -y
```

## GitHub Action

The action is defined in `.github/workflows/community-pr-triage.yml` and has two trigger modes:

### Scheduled (automatic)

Runs every other Tuesday at 9am UTC (biweekly, even ISO weeks). Performs a full sync + sprint update automatically.

### Manual dispatch (from GitHub Actions UI)

Go to Actions → "Community PR Triage" → "Run workflow" and configure two checkboxes:

| sync | sprint-update | Result                                                                                  |
| ---- | ------------- | --------------------------------------------------------------------------------------- |
| ☐    | ☐             | **Dry run** — fetch & score PRs, print report. Nothing written to Linear.               |
| ☑   | ☐             | **Sync only** — create/update/close Linear tickets. No sprint recommendation.           |
| ☑   | ☑            | **Sync + sprint update** — sync tickets, post sprint recommendation, create milestone.  |
| ☐    | ☑            | **Sprint preview** — dry run, prints sprint recommendation to logs but doesn't post it. |

Note: Sprint update requires sync to be enabled to actually post to Linear, since it needs ticket URLs to render hoverable chips in the project update.

## How it works

1. **Fetch** — Uses `gh` CLI to list open PRs from `strapi/strapi` and fetches org members to filter out internal authors and bots
2. **Enrich** — Parses PR bodies for issue references, fetches linked issues to extract severity, status, and engagement data
3. **Score** — Each PR gets a value score based on type, linked issue severity, community engagement, and age. Complexity is derived from LOC, file count, and area risk tier
4. **Prioritize** — Value score maps to priority tiers: urgent (100+), high (70-99), normal (50-69), low (<50). Low-complexity PRs with value >= 30 are flagged as quick wins
5. **Report** — Prints a grouped report by priority tier, saves markdown to `reports/`
6. **Sync** — Creates new Linear issues for new PRs, updates existing ones, marks merged PRs as Done and closed PRs as Canceled. Links related GitHub issues in Linear.
7. **Sprint** — Selects top 10 PRs for a sprint milestone with a mix of urgent/high, quick wins, and feature PRs

## Architecture

```
src/
├── index.ts       # CLI entry point
├── config.ts      # Environment variable parsing and validation
├── fetcher.ts     # GitHub data fetching (gh CLI + GraphQL)
├── scorer.ts      # Value, complexity, priority scoring
├── syncer.ts      # Linear issue create/update/close + relations
├── reporter.ts    # Console and markdown report generation
├── sprint.ts      # Sprint PR selection, milestone, project update
└── types.ts       # TypeScript interfaces
```

## FAQ

### How are PRs selected for each sprint milestone?

The tool selects 10 PRs using a balanced mix:

1. **4-5 urgent/high priority** — PRs with the highest value scores (linked to critical bugs, confirmed issues, high community engagement)
2. **3-4 quick wins** — Low-complexity PRs with reasonable value (small fixes that can be reviewed fast)
3. **1-2 enhancements/features** — To ensure feature PRs aren't perpetually deprioritized
4. **Remaining slots** — Filled with the next highest-value PRs regardless of category

Within each category, PRs are sorted by value score descending. Duplicates are skipped (a PR that's both urgent and a quick win only appears once).

### Will syncing overwrite what engineers manually add to tickets?

No. The sync uses a **label merge strategy**: it only manages its own set of labels (priority tier, complexity, CI status, quick win, source area, etc.). Any labels added manually by engineers are preserved during updates.

Similarly, manually set fields like assignee, cycle, status changes (e.g., moving to "In Progress"), and comments are never touched by the sync.

### If I manually change a ticket's priority, will the next sync overwrite it?

**The priority dropdown (Urgent/High/Normal/Low) is preserved.** The sync only sets priority on ticket creation — it never updates it afterward. So if an engineer changes the priority dropdown from Urgent to Normal, it stays.

**Priority labels are recomputed each sync.** Labels like "Priority: Urgent" are managed by the automation and will be reset to match the computed score on every run. These labels reflect the tool's assessment; the dropdown reflects the team's decision.

### What's the intended workflow?

1. **Automated biweekly run** — Every other Tuesday at 9am UTC, the GitHub Action runs a full sync + sprint update. New community PRs get Linear tickets automatically, existing tickets get updated scores, and a sprint recommendation is posted.
2. **Review sprint recommendation** — The sprint update appears in the [Community PR Sprint Planning](https://linear.app/strapi/project/community-pr-sprint-planning-1e6f244b622b) project. It highlights 10 recommended PRs grouped by area with hoverable ticket chips.
3. **Engineers pick tickets** — Engineers review the recommended PRs, pick ones relevant to their area, and move them to the CMS team's current sprint/cycle.
4. **PR gets reviewed/merged** — Once a PR is merged on GitHub, the next sync run marks the Linear ticket as "Done". If closed without merging, it's marked "Canceled".
5. **Ad-hoc runs** — Anyone can trigger the action manually from GitHub Actions at any time to get a fresh report or re-sync.

### How does area detection work?

Two-pass strategy:

1. **Labels first** — Checks for `source: core:<area>` or `source: plugin:<area>` GitHub labels
2. **File paths fallback** — If no label found, parses changed file paths matching `packages/core/<name>/` or `packages/plugins/<name>/` and picks the most frequent package name

### How are relations between tickets created?

For each PR that references a GitHub issue (via `#1234` or full URL), the tool searches the CMS-Github Linear team for tickets with a GitHub attachment URL matching that issue number. If found, a "related" relation is created between the CPR ticket and the CMS-Github ticket. Relations are always deduplicated.
