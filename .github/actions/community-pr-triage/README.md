# Community PR Triage

A CLI tool and GitHub Action that automatically fetches open community PRs from [strapi/strapi](https://github.com/strapi/strapi), scores them by value and complexity, generates prioritized triage reports, and syncs issues to [Linear](https://linear.app).

Built to help the Strapi team efficiently review and prioritize external contributions by combining heuristic scoring with AI-powered relation detection.

## Features

- **Automated PR scoring** — Computes a value score based on PR type, linked issue severity, community engagement (thumbs-up, comments), and PR age
- **Complexity estimation** — Derives complexity from lines of code, file count, and area risk tier (critical/high/medium/low)
- **Priority tiers** — Maps value scores to Urgent / High / Normal / Low with quick-win detection for low-complexity, high-value PRs
- **Linear sync** — Creates, updates, and closes Linear tickets automatically with rich descriptions, labels, and GitHub PR attachments
- **Cross-team deduplication** — Searches CPR, CMS, and CMS-Github teams to prevent duplicate tickets when issues are transferred between teams
- **Sibling PR linking** — Automatically detects and links PRs that reference the same GitHub issue
- **Sprint planning** — Selects top 10 PRs for a sprint milestone with a balanced mix of urgent fixes, quick wins, and features
- **Project updates** — Generates progress reports comparing GitHub state against Linear state, tracking which PRs have been picked up by the CMS team
- **AI-powered relations** — Uses Claude to discover hidden connections between PRs and existing Linear issues (optional, requires Anthropic API key)
- **Sync preview** — Dry-run mode shows which PRs would be created, updated, or have been picked up by CMS before syncing
- **Markdown reports** — Generates detailed triage reports with priority groupings, CI status, quick-win highlights, and sync preview
- **GitHub Actions** — Separate workflows for triage (biweekly) and project updates (weekly)

## Prerequisites

- Node.js 20+
- [GitHub CLI (`gh`)](https://cli.github.com/) — authenticated with access to `strapi/strapi`
- [pnpm](https://pnpm.io/)
- A [Linear API key](https://linear.app/settings/api) (for sync mode)
- An [Anthropic API key](https://console.anthropic.com/) (optional, for AI relation detection)

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in your API keys and Linear IDs (see Environment Variables below)
```

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm run sync` | Fetch, score, preview sync stats, confirm, sync to Linear |
| `pnpm run sync:dry` | Fetch, score, preview sync stats only |
| `pnpm run update` | Fetch, score, generate project update, confirm, post to Linear + create milestone |
| `pnpm run update:dry` | Fetch, score, generate project update report only |
| `pnpm run all` | Sync + project update (two confirmations) |
| `pnpm run all:dry` | Preview everything, no writes |
| `pnpm test` | Run tests (single run). |
| `pnpm test:watch` | Run tests in watch mode. |

All commands accept `-y` / `--yes` to skip confirmations.

### Flags

- `--sync` — Sync tickets to Linear (create/update/close)
- `--update` — Generate project update (status diff, sprint recommendation, milestone)
- `--dry-run` — Preview only, no writes to Linear
- `--yes` / `-y` — Skip confirmation prompts (useful for CI)

Without `--sync` or `--update`, the tool fetches, scores, and prints a report only (equivalent to dry-run).

### Examples

```bash
# Preview sync stats without touching Linear
pnpm run sync:dry

# Sync all PRs to Linear (will prompt for confirmation)
pnpm run sync

# Preview project update
pnpm run update:dry

# Post project update to Linear
pnpm run update

# Sync + project update non-interactively
pnpm run all -- -y
```

## GitHub Action

Defined in [`.github/workflows/community-pr-triage.yml`](.github/workflows/community-pr-triage.yml).

**Scheduled:** Runs every Monday at 9am UTC. Performs a dry-run report by default.

**Manual dispatch:** Go to **Actions** → **Community PR Triage** → **Run workflow** and select from the dropdown:

| Selection | Result |
|-----------|--------|
| `dry-run` | Fetch & score PRs, print report with sync preview. Nothing written to Linear. |
| `sync` | Create/update/close Linear tickets. |
| `update` | Post project update to Linear, create sprint milestone, assign top PRs. |
| `sync + update` | Both sync and project update. |

The project update compares GitHub state against Linear state and reports:
- **Picked up** — PRs transferred from CPR to CMS team (with current status)
- **Merged** — PRs successfully merged
- **In Progress** — PRs being worked on in CPR team
- **New** — Open PRs not yet synced to Linear
- **Closed** — PRs closed without merge
- **Stale** — PRs in Todo for more than 14 days

### Required Secrets

Add these as repository secrets in **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `LINEAR_API_KEY` | Linear personal API key |
| `LINEAR_CPR_TEAM_ID` | CMS-Community-PRs team ID (for triage issue creation) |
| `LINEAR_CMS_TEAM_ID` | CMS team ID (for tracking picked-up PRs) |
| `LINEAR_CMS_GITHUB_TEAM_ID` | CMS-Github team ID (for relation matching) |
| `LINEAR_PROJECT_ID` | Project ID for sprint tracking and project updates |
| `LINEAR_STATUS_TODO` | Status ID for "Todo" |
| `LINEAR_STATUS_DONE` | Status ID for "Done" |
| `LINEAR_STATUS_CANCELED` | Status ID for "Canceled" |
| `LINEAR_LABELS` | JSON mapping of PR type labels to Linear label IDs |
| `LINEAR_TRIAGE_LABELS` | JSON with priority, complexity, CI, quickWin, and hasLinkedIssue label IDs |

`GITHUB_TOKEN` is provided automatically by GitHub Actions.

## How it works

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│  Fetch   │───▶│ Enrich  │───▶│  Score  │───▶│ Prioritize │───▶│ Report │───▶│  Sync  │───▶│ Sprint │
│  (gh)    │    │ (issues)│    │ (value) │    │  (tiers)   │    │  (md)  │    │(Linear)│    │(Linear)│
└─────────┘    └─────────┘    └─────────┘    └────────────┘    └────────┘    └────────┘    └────────┘
```

1. **Fetch** — Uses `gh` CLI to list open PRs from `strapi/strapi`, fetches org members to filter out internal authors and bots, batch-fetches CI statuses via GraphQL
2. **Enrich** — Parses PR bodies for issue references (`#1234`, full URLs), fetches linked issues to extract severity labels, reproduction status, and engagement metrics
3. **Score** — Each PR gets a value score: `(base + severity + status + engagement) × urgency`. Base score depends on PR type (fix=30, enhancement=20, etc.). Urgency increases with PR age.
4. **Prioritize** — Value score maps to priority tiers: Urgent (100+), High (70-99), Normal (50-69), Low (<50). Low-complexity PRs with value ≥ 30 are flagged as quick wins.
5. **Report** — Prints a grouped console report and saves a markdown report to `reports/` (includes sync preview when Linear API key is available)
6. **Sync** — Creates new Linear issues for new PRs, updates existing ones with fresh scores/labels, marks merged PRs as Done and closed PRs as Canceled. Searches across CPR, CMS, and CMS-Github teams to prevent duplicates. Attaches GitHub PR URLs and links related issues (including sibling PRs that reference the same GitHub issue).
7. **Project Update** — Compares GitHub state against Linear state to generate a progress report. Tracks PRs transferred from CPR to CMS team, merged PRs, stale tickets, and new contributions. Includes a sprint recommendation (top 10 PRs), creates a milestone, and assigns selected PRs to the project.

### Scoring details

**Value breakdown:**

| Component | Source | Range |
|-----------|--------|-------|
| Base | PR type label (`pr: fix`=30, `pr: enhancement`=20, `pr: doc`=15, `pr: feature`=10, `pr: chore`=10, dependencies=5) | 5–30 |
| Severity | Highest severity of linked issues (critical=50, high=35, medium=20, low=5) | 0–50 |
| Status | Best reproduction status (confirmed=15, pending=5, can't repro=-10) | -10–15 |
| Engagement | Thumbs-up + half of comments, with bonus tiers at 10/20/50 thumbs-up, capped at 40 | 0–40 |
| Urgency | Multiplier based on PR age (8d=1.2×, 15d=1.4×, 22d=1.6×, 31d=1.8×, 46d+=2.0×) | 1.0–2.0× |

**Complexity tiers:**

| Tier | LOC | Adjusted by area risk |
|------|-----|-----------------------|
| Low | ≤50 LOC, ≤10 files | Bumped down in `low` risk areas |
| Medium | 51–300 LOC or >10 files | — |
| High | 301–1000 LOC | Bumped up in `critical` risk areas |
| Very High | >1000 LOC | — |

### Area risk tiers

| Tier | Areas |
|------|-------|
| Critical | `database`, `strapi` (core) |
| High | `content-manager`, `upload`, `users-permissions` |
| Medium | `admin`, `content-type-builder`, `i18n` |
| Low | `documentation`, `graphql`, `typescript`, `dependencies` |

### Area detection

Two-pass strategy:
1. **Labels first** — Checks for `source: core:<area>` or `source: plugin:<area>` GitHub labels
2. **File paths fallback** — Parses changed file paths matching `packages/core/<name>/` or `packages/plugins/<name>/` and picks the most frequent package name

## Architecture

```
src/
├── index.ts            # CLI entry point (dotenv, arg parsing, orchestration)
├── config.ts           # Environment variable parsing and validation
├── fetcher.ts          # GitHub data fetching (gh CLI + GraphQL batch CI)
├── scorer.ts           # Value, complexity, priority scoring algorithms
├── syncer.ts           # Linear issue CRUD, label merging, relation linking, sibling detection
├── reporter.ts         # Console and markdown report generation (with sync preview)
├── project-update.ts   # Project update: status diff, sprint recommendation, milestone creation
├── ai-relations.ts     # AI-powered relation discovery (Claude + Linear search)
├── types.ts            # TypeScript interfaces
└── __tests__/          # Unit tests (vitest)
    ├── fetcher.test.ts
    ├── scorer.test.ts
    ├── syncer.test.ts
    ├── reporter.test.ts
    └── sprint.test.ts
```

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `LINEAR_API_KEY` | Yes | Linear personal API key |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (only for AI relations) |
| `GITHUB_REPO` | No | Target repo (default: `strapi/strapi`) |
| `GITHUB_ORG` | No | GitHub org for internal author detection (default: `strapi`) |
| `LINEAR_CPR_TEAM_ID` | Yes | CMS-Community-PRs team for triage tickets |
| `LINEAR_CMS_TEAM_ID` | Yes | CMS team for tracking picked-up PRs |
| `LINEAR_CMS_GITHUB_TEAM_ID` | Yes | CMS-Github team for issue relation matching |
| `LINEAR_PROJECT_ID` | Yes | Linear project for sprint milestones and project updates |
| `LINEAR_STATUS_*` | Yes | Linear workflow status IDs (todo, done, canceled) |
| `LINEAR_LABELS` | Yes | JSON: GitHub PR type label → Linear label ID |
| `LINEAR_TRIAGE_LABELS` | Yes | JSON: priority, complexity, CI, quickWin, hasLinkedIssue label IDs |

## FAQ

### How are PRs selected for each sprint milestone?

The tool selects 10 PRs using a balanced mix:

1. **4-5 urgent/high priority** — PRs with the highest value scores
2. **3-4 quick wins** — Low-complexity PRs with reasonable value
3. **1-2 enhancements/features** — To ensure feature PRs aren't perpetually deprioritized
4. **Remaining slots** — Filled with the next highest-value PRs

Within each category, PRs are sorted by value score descending. Duplicates are skipped.

### Will syncing overwrite what engineers manually add to tickets?

No. The sync uses a **label merge strategy**: it only manages its own set of labels (priority, complexity, CI status, quick win, source area). Any labels added manually by engineers are preserved.

Manually set fields like assignee, cycle, status changes, and comments are never touched. Descriptions are updated each sync with fresh scores.

### If I manually change a ticket's priority, will the next sync overwrite it?

**The priority dropdown (Urgent/High/Normal/Low) is preserved.** The sync only sets priority on ticket creation — it never updates it afterward.

**Priority labels are recomputed each sync.** Labels like "Priority: Urgent" are managed by the automation and will be reset to match the computed score. These labels reflect the tool's assessment; the dropdown reflects the team's decision.

### What happens when a PR ticket is moved from CPR to CMS team?

The sync won't re-create it. It searches across CPR, CMS, and CMS-Github teams to find existing tickets. Tickets in the CMS team are skipped during updates — the CMS team owns them. The project update report tracks these as "Picked Up" so you can see which PRs are being worked on.

### How does sibling PR detection work?

When two or more PRs reference the same GitHub issue, their Linear tickets are automatically linked with a "related" relation. This surfaces in both the dry-run preview and during sync.

### How does AI relation detection work?

When `ANTHROPIC_API_KEY` is set, the tool runs a two-phase approach:

1. **Explicit matching** — Searches Linear for issues linked to the same GitHub issues referenced in the PR
2. **AI discovery** — Uses Claude Sonnet to generate search queries based on the PR content, then uses Claude Haiku to evaluate whether discovered Linear issues are truly related (filtering at ≥60% confidence)

### What's the intended workflow?

1. **Weekly project update (Monday)** — GitHub Action generates a progress report with sprint recommendation, showing what changed
2. **Weekly triage (Tuesday)** — GitHub Action syncs PRs to Linear (create/update/close tickets)
3. **Engineers pick tickets** — Review recommended PRs, transfer tickets from CPR to CMS team
4. **PR gets reviewed/merged** — Next sync marks the Linear ticket as Done (or Canceled if closed)
5. **Ad-hoc runs** — Trigger manually from GitHub Actions or CLI anytime

## License

MIT
