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

PRs labeled `community` and `waiting on author` (or `stale`) are also skipped: the lifecycle flow above already follows up on them and decides when they close. The lifecycle flow only handles `community` PRs, so on any other PR these labels don't stop the CLA follow-up, or nothing would ever close the PR. If you've already followed up on a CLA problem by hand on a `community` PR, add `waiting on author` so it doesn't get a second, automated reminder. To stop the CLA follow-up on any other PR, use a label from `CLA_EXEMPT_LABELS`.

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
        │  (daily cron, only if something the reminder didn't name now blocks the check)
        ▼
[GitHub Action] Posts one follow-up reminder about what blocks the check now
        │
        │  (daily cron, still pending 30 days after the CLA Assistant comment)
        ▼
[GitHub Action] If the latest reminder is 30 days old or more (for example, the check was
                green for months and went pending again), posts one final reminder first
        │
        │  (daily cron, and the latest reminder is at least 7 days old)
        ▼
[GitHub Action] Closes the PR with a short comment (it can be reopened once the CLA is signed)
                Syncs the Linear ticket → "Canceled" (looks in CPR first, then CMS, and uses
                that team's Canceled state)
```

The clock never restarts: it runs from the CLA Assistant's first comment (or the PR's creation, if there is none), even if the check passed in between. So a PR whose check goes pending again long after its last reminder can be closed soon, but it first gets one final reminder (once per PR) and at least 7 days to act on it. The close notice states no duration, since the check may have passed in between.

A PR gets at most two regular reminders. Each reminder's hidden marker records what it named: `<!-- community-pr-cla: reminder blockers=author,<sha>,… -->`, where `author` means the author hadn't signed and each SHA is an unlinked or unsigned co-author's commit. A follow-up is only sent when something the latest reminder didn't name now blocks the check, for example when the author signed and then a commit with an unlinked email came in. A force-push that keeps the same blockers, or fewer, sends nothing. A rebase does give commits new SHAs, so it can bring the one follow-up, but never a third regular reminder.

The final reminder (`<!-- community-pr-cla: reminder final blockers=… -->`) is sent at most once per PR, whatever the cap, and only when the latest reminder's close date is long stale. The close then waits at least 7 days after it.

Commit email addresses are never written to comments, markers or logs. Markers are only read at the start of the workflow's own comments.

A PR that the workflow closed and someone reopened is left alone. The workflow recognises this from its close notice (`<!-- community-pr-cla: closed -->`), so it makes sure every PR it closes has one. It closes the PR, then posts the notice. If posting fails, it checks whether GitHub stored the notice anyway before it retries once. If the notice still isn't there, it reopens the PR and the next run tries the whole close again.

A PR closed by someone else, or by the lifecycle flow, has no CLA close notice, so after a reopen it isn't treated as reopened. It gets a reminder only if it never got one, and is closed on the usual schedule.

A failure on one PR (for example, a locked conversation, or a Linear error after the close) is logged and the run moves on to the next PR. The job fails at the end, listing the PRs that failed. If `LINEAR_API_KEY` or a team id is missing, the run logs that it didn't sync Linear.

### Settings

Repository variables (Settings → Secrets and variables → Variables):

| Variable                | Default        | Meaning                                                           |
| ----------------------- | -------------- | ----------------------------------------------------------------- |
| `CLA_FOLLOW_UP_ENABLED` | (unset)        | Scheduled runs only comment / close when this is `true`           |
| `CLA_REMINDER_DAYS`     | 7              | Days the CLA is pending before the reminder (and the close grace) |
| `CLA_CLOSE_DAYS`        | 30             | Days the CLA is pending before the PR is closed                   |
| `CLA_EXEMPT_LABELS`     | `pr: security` | Comma-separated labels that exempt a PR (see below)               |

Setting `CLA_EXEMPT_LABELS` replaces the default, so include `pr: security` if you still want it. `waiting on author` and `stale` are always exempt, whatever the variable says.

The `only_prs` input (or `CLA_ONLY_PRS` locally) takes PR numbers separated by spaces or commas, with or without `#`. Anything else fails the run instead of widening it to every PR.

### Dry run

Until `CLA_FOLLOW_UP_ENABLED` is `true`, the daily run only logs what it would do, including the full text of each reminder. You can also trigger it manually from the Actions tab (`dry_run` defaults to `true`, `only_prs` limits the run to some PRs), or run it locally:

```bash
cd .github/scripts && npm install
GITHUB_TOKEN=$(gh auth token) GITHUB_REPOSITORY=strapi/strapi CLA_ONLY_PRS="26424 26864" \
  node --experimental-strip-types community-pr-cla-action.ts
```
