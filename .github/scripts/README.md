# GitHub Actions scripts

TypeScript helpers used by workflows under `.github/workflows/`.

## Scripts

| File                             | Workflow                           | Description                                                 |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| `community-pr-lifecycle.ts`      | `community-pr-lifecycle.yml`       | Syncs community PR "waiting on author" → stale → closed     |
| `issue-template-check.ts`        | (library)                          | Template validation and invalid-template grace-period logic |
| `issue-template-check-action.ts` | `template-check-on-new-issue.yaml` | Open/edit issue template check                              |
| `issue-template-label-action.ts` | `issues_handleLabel.yml`           | Re-validate when `flag: invalid template` is labeled        |
| `issue-template-cron-action.ts`  | `issues_dailyCron.yml`             | Daily sweep of flagged invalid-template issues              |

## Tests

```bash
cd .github/scripts
npm install --ignore-scripts
npm test
```

## Community PR lifecycle

Automates the lifecycle of community PRs after a team review, from "waiting on author" through to automatic closure.

## Flow

```
Team reviews PR → leaves feedback → manually adds "waiting on author" label
        │
        ▼
[GitHub Action] Syncs Linear ticket → "Waiting on Author"
                Posts a comment on the PR with the timeline
        │
        │  (daily cron, no author activity for 14 days)
        ▼
[GitHub Action] Removes "waiting on author", adds "stale"
                Posts a stale warning comment
        │
        │  (daily cron, still no activity after 30 more days)
        ▼
[GitHub Action] Closes the PR
                Posts a closing comment
                Syncs Linear ticket → "Canceled"
```

## Thresholds

Configurable via **GitHub repository variables** (Settings → Secrets and variables → Variables) without any code change. Falls back to the defaults below if not set.

| Variable                 | Default | Meaning                                            |
| ------------------------ | ------- | -------------------------------------------------- |
| `WAITING_ON_AUTHOR_DAYS` | 14      | Days before a "waiting on author" PR becomes stale |
| `STALE_DAYS`             | 30      | Days before a stale PR is closed                   |

## Linear config

State IDs are stored in `.github/scripts/.env` (committed, not secrets — these are not sensitive):

| Variable                              | Linear state                   |
| ------------------------------------- | ------------------------------ |
| `LINEAR_CMS_STATUS_WAITING_ON_AUTHOR` | CMS team → "Waiting on Author" |
| `LINEAR_CMS_STATUS_CANCELED`          | CMS team → "Canceled"          |

> Only CMS team tickets are synced. By the time "waiting on author" is added, the ticket has been picked up from the CPR team into CMS.

## Required secrets

These already exist in the repo from the community PR triage workflow:

| Secret               | Description             |
| -------------------- | ----------------------- |
| `LINEAR_API_KEY`     | Linear personal API key |
| `LINEAR_CMS_TEAM_ID` | CMS team ID             |

## Manual dry run

Trigger the workflow manually from the GitHub Actions tab. The `dry_run` input defaults to `true` — it logs which PRs would be promoted or closed without making any changes.
