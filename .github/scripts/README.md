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

Follows up on open PRs from people outside the org whose CLA ([CLA Assistant](https://cla.strapi.io), `license/cla` status) is still unsigned. Org members, collaborators and bots are skipped.

PRs labeled `community` and `waiting on author` (or `stale`) are also skipped: the lifecycle flow above already follows up on them and decides when they close. The lifecycle flow only handles `community` PRs, so on any other PR these labels don't stop the CLA follow-up, or nothing would ever close the PR. If you've already followed up on a CLA problem by hand on a `community` PR, add `waiting on author` so it doesn't get a second, automated reminder. To stop the CLA follow-up on any other PR, use a label from `CLA_EXEMPT_LABELS`.

```
CLA Assistant comments "please sign the CLA"
        │
        │  (daily cron, check pending for 7 days, no active reminder on the PR)
        ▼
[GitHub Action] Posts a reminder that says exactly what blocks the check:
                - the author's account hasn't signed → link to the CLA and to the recheck
                - commits GitHub can't link to an account → names the commits (short SHA) and explains
                  how to add the email + recheck, or re-author and force-push
                  (fake `users.noreply.github.com` addresses only get the re-author fix)
                - other authors haven't signed → names them (without an @-mention) and their commits
                The reminder states the date the PR will be closed on: 23 days later
        │
        ├── (daily cron, the check passed)
        │       ▼
        │   [GitHub Action] Marks the reminder as resolved. Nothing else happens.
        │
        │  (daily cron, still pending on the date the reminder stated)
        ▼
[GitHub Action] Posts a short close notice (the PR can be reopened once the CLA is signed)
                Closes the PR
                Syncs the Linear ticket → "Canceled" (looks in CPR first, then CMS, and uses
                that team's Canceled state)
```

### The rules

The reminder is the only state the workflow keeps, in a hidden marker at the start of its comment:

- `<!-- community-pr-cla: reminder close-on=2026-12-12 named=author,unlinked -->` is an **active** reminder: the PR is closed if the check is still pending on that date (UTC). `named` lists the kinds of blockers the reminder explained: `author` (the author's account hasn't signed), `unlinked` (commits GitHub can't link to an account) and `co-author` (other authors haven't signed).
- `<!-- community-pr-cla: reminder resolved=2026-11-25 -->` is a reminder the workflow withdrew on that date because the check passed. Its text stays, under a note that it no longer applies.

A PR is closed only when it has an active reminder whose date has come. So no PR is closed without a reminder, and the date in the reminder is the date the workflow acts on, even if `CLA_CLOSE_DAYS` changes later.

New commits, force-pushes and rebases send nothing and don't move the date, as long as the same kinds of blockers remain. When a kind of blocker that no active reminder named starts to block the check (for example, the author signed, then a commit with an unlinked email came in), the PR is not closed on it: the next run posts a new reminder that explains it, with a new close date 23 days later. There are three kinds, so this can move the date twice at most.

When the check passes, the next run marks the reminder as resolved. If the check goes pending again later (for example, a new commit with an unlinked email), the PR starts over: a new reminder once 7 days have passed since the reminder was resolved, and a new close date 23 days after that reminder.

If an active reminder's date passed 7 days ago or more and the PR is still open, the workflow doesn't close it. Something kept it from closing on time: an exempt label, the PR was closed and reopened, or the workflow was off. It posts a new reminder with a new date instead.

The 7 days count from the CLA Assistant's first comment (or the PR's creation, if there is none). So a PR whose check passed before any reminder was sent, and goes pending again weeks later, gets its reminder on the next run. Reminders and close notices state no duration for this reason.

Commit email addresses are never written to comments, markers or logs. Markers are only read at the start of the workflow's own comments.

### Closed and reopened PRs

A PR that the workflow closed and someone reopened is left alone for good. The workflow recognises it from its close notice (`<!-- community-pr-cla: closed -->`).

The PR is closed first, then the notice is posted. If the close fails, nothing else happens and the next run tries again. If the notice fails, the PR stays closed (the reminder already told the author why and when), the Linear ticket is still canceled, and the run fails and names the PR so someone can post the notice by hand. Without the notice, the PR is treated like one closed by someone else.

A PR closed by someone else, or by the lifecycle flow, has no CLA close notice, so after a reopen the usual rules apply: it is closed if its active reminder's date came less than 7 days ago, and gets a new reminder otherwise.

### Failures

A PR with 250 commits or more is skipped and logged: GitHub doesn't list more than that, so the workflow can't tell what blocks the check.

A failure on one PR (for example, a locked conversation, or a Linear error after the close) is logged and the run moves on to the next PR. The job fails at the end, listing the PRs that failed. If `LINEAR_API_KEY` or a team id is missing, the run logs that it didn't sync Linear.

### Settings

Repository variables (Settings → Secrets and variables → Variables):

| Variable                | Default        | Meaning                                                                      |
| ----------------------- | -------------- | ---------------------------------------------------------------------------- |
| `CLA_FOLLOW_UP_ENABLED` | (unset)        | Scheduled runs only comment / close when this is `true`                      |
| `CLA_REMINDER_DAYS`     | 7              | Days the CLA is pending before the reminder                                  |
| `CLA_CLOSE_DAYS`        | 30             | Days the CLA is pending before the PR is closed, for a reminder sent on time |
| `CLA_EXEMPT_LABELS`     | `pr: security` | Comma-separated labels that exempt a PR (see below)                          |
| `LINEAR_CPR_TEAM_ID`    | (unset)        | CPR team ID, to cancel tickets that are still in CPR                         |

A reminder gives the author `CLA_CLOSE_DAYS` minus `CLA_REMINDER_DAYS` days (23 by default), and never less than `CLA_REMINDER_DAYS`.

Setting `CLA_EXEMPT_LABELS` replaces the default, so include `pr: security` if you still want it. On `community` PRs, `waiting on author` and `stale` are exempt whatever the variable says.

The `only_prs` input (or `CLA_ONLY_PRS` locally) takes PR numbers separated by spaces or commas, with or without `#`. Anything else fails the run instead of widening it to every PR.

### Dry run

Until `CLA_FOLLOW_UP_ENABLED` is `true`, the daily run only logs what it would do, including the full text of each reminder. You can also trigger it manually from the Actions tab (`dry_run` defaults to `true`, `only_prs` limits the run to some PRs), or run it locally:

```bash
cd .github/scripts && npm install
GITHUB_TOKEN=$(gh auth token) GITHUB_REPOSITORY=strapi/strapi CLA_ONLY_PRS="26424 26864" \
  node --experimental-strip-types community-pr-cla-action.ts
```
