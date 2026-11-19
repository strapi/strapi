# GitHub Actions scripts

TypeScript helpers used by workflows under `.github/workflows/`.

## Scripts

| File                             | Workflow                           | Description                                             |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| `community-pr-lifecycle.ts`      | `community-pr-lifecycle.yml`       | Syncs community PR "waiting on author" → stale → closed |
| `community-pr-cla.ts`            | (library)                          | Diagnoses unsigned CLAs, builds reminder/close comments |
| `community-pr-cla-action.ts`     | `community-pr-cla.yml`             | Daily CLA reminder → close for external PRs             |
| `issue-template-check.ts`        | (library)                          | Template validation and invalid-template grace period   |
| `issue-template-check-action.ts` | `template-check-on-new-issue.yaml` | Open/edit issue template check                          |
| `issue-template-label-action.ts` | `issues_handleLabel.yml`           | Re-validate when `flag: invalid template` is labeled    |
| `issue-template-cron-action.ts`  | `issues_dailyCron.yml`             | Daily sweep of flagged invalid-template issues          |

## Tests

```bash
cd .github/scripts
npm install
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

## Community PR CLA follow-up

Follows up on open PRs from people outside the org whose CLA ([CLA Assistant](https://cla.strapi.io), `license/cla` status) is still unsigned. Org members, collaborators, bots and PRs whose `license/cla` passed are skipped.

PRs labeled `waiting on author` or `stale` are also skipped: the lifecycle flow above already follows up on them and decides when they close. If you've already followed up on a CLA problem by hand, add `waiting on author` so the PR doesn't get a second, automated reminder.

```
CLA Assistant comments "please sign the CLA"   (clock starts at that comment)
        │
        │  (daily cron, still pending after 7 days)
        ▼
[GitHub Action] Posts one reminder that says exactly what blocks the check:
                - the author hasn't signed → link to the CLA
                - commits GitHub can't link to an account → names the commits (short SHA) and explains
                  how to add the email + recheck, or re-author and force-push
                  (fake `users.noreply.github.com` addresses only get the re-author fix)
                - other authors haven't signed → names them and their commits
        │
        │  (daily cron, still pending after 30 days, and the reminder is at least 7 days old)
        ▼
[GitHub Action] Closes the PR with a short comment (it can be reopened once the CLA is signed)
                Syncs the Linear ticket → "Canceled" (CMS team, same as the lifecycle above)
```

Commit email addresses are never written to comments or logs. Comments carry a hidden marker (`<!-- community-pr-cla: reminder -->` / `closed`), so a PR never gets the same comment twice, and a PR that was reopened after being closed is left alone.

### Settings

Repository variables (Settings → Secrets and variables → Variables):

| Variable                | Default        | Meaning                                                                                   |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `CLA_FOLLOW_UP_ENABLED` | (unset)        | Scheduled runs only comment / close when this is `true`                                   |
| `CLA_REMINDER_DAYS`     | 7              | Days the CLA is pending before the reminder (and the close grace)                         |
| `CLA_CLOSE_DAYS`        | 30             | Days the CLA is pending before the PR is closed                                           |
| `CLA_EXEMPT_LABELS`     | `pr: security` | Extra comma-separated labels that exempt a PR (on top of `waiting on author` and `stale`) |

### Dry run

Until `CLA_FOLLOW_UP_ENABLED` is `true`, the daily run only logs what it would do, including the full text of each reminder. You can also trigger it manually from the Actions tab (`dry_run` defaults to `true`, `only_prs` limits the run to some PRs), or run it locally:

```bash
cd .github/scripts && npm install
GITHUB_TOKEN=$(gh auth token) GITHUB_REPOSITORY=strapi/strapi CLA_ONLY_PRS="26424 26864" \
  node --experimental-strip-types community-pr-cla-action.ts
```
