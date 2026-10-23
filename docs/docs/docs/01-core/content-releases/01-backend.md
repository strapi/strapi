---
title: Backend Design
description: Content Releases backend
tags:
  - content-releases
  - tech design
---

All backend code can be found in:

```
 packages/core/content-releases/server
```

## Content-types

The content-releases plugin creates two hidden content-types.

### Release

The `Release` content type stores all the information about a release and its associated Release Actions. It is saved in the database as `strapi_releases`. The schema can be found in:

```
packages/core/content-releases/server/src/content-types/release/schema.ts
```

`releasedAt` is when the release ran, whatever the outcome: a release with `releasedAt` set is frozen (it can't be edited, deleted or published again, and it no longer counts as pending). On a "Failed" release, nothing went live.

### Release Action

Th `Release Action` content type is associated with any entry from any content-type that has draft and publish enabled. It is responsible for storing the action to perform for an associated entry. It is saved in the database as `strapi_release_actions`. In v4, we used built-in polymorphic relations, but for v5, we stored `contentType`, `locale`, and `entryDocumentId` in the Release Action schema to create a "manual" relationship between actions and entries. This approach allows us to link a release action to a document ID instead of a specific entry ID, as the entry ID may change over time and is not reliable.

The schema can be found in:

```
packages/core/content-releases/server/src/content-types/release-action/schema.ts
```

## Routes

Release and Release Action routes are only accessible on the Admin API.

### Release

Release routes can be found in:

```
packages/core/content-releases/server/src/routes/release.ts
```

**Get all releases**:

- method: `GET`
- endpoint: `/content-releases/`
- params:
  ```ts
  {
    page: number;
    pageSize: number;
    // Any field of the release, e.g. filters[status][$in][0]=failed or
    // filters[scheduledAt][$null]=true
    filters?: Record<string, unknown>;
    sort?: string | string[]; // e.g. 'updatedAt:desc'
  }
  ```
- response `meta`: `pagination`, `pendingReleasesCount` (releases without `releasedAt`) and `statusCounts` (how many releases have each status, whatever the filters)

**Get all releases with/without an entry**:

- method: `GET`
- endpoint: `/content-releases/getByDocumentAttached`
- params:
  ```ts
  {
    contentTypeUid: string;
    locale?: string;
    documentId?: string;
    hasEntryAttached?: boolean;
  }
  ```

**Get a single release**

- method: `GET`
- endpoint: `/content-releases/:id`

**Create a release**:

- method: `POST`
- endpoint: `/content-releases/`
- body:
  ```ts
  {
    name: string;
    scheduledAt: string | null; // ISO date
    timezone: string | null; // required when scheduledAt is set
    releaseCondition?: 'all_or_nothing' | 'allow_partial'; // all_or_nothing if omitted
  }
  ```

**Update a release**:

- method: `PUT`
- endpoint: `/content-releases/:id`
- body:
  ```ts
  {
    name: string;
    scheduledAt?: string | null; // null or omitted unschedules the release
    timezone?: string | null; // required when scheduledAt is set
    releaseCondition?: 'all_or_nothing' | 'allow_partial';
  }
  ```

**Delete a release**:

- method: `DELETE`
- endpoint: `/content-releases/:id`

**Publish a release**:

- method: `POST`
- endpoint: `/content-releases/:id/publish`

**Create a release from skipped entries**:

- method: `POST`
- endpoint: `/content-releases/:id/create-from-skipped-entries`
- permissions: `plugin::content-releases.create` and `plugin::content-releases.create-action`
- response: the new release, with `actions.meta.count`
- body:
  ```ts
  {
    name: string;
    scheduledAt: string | null; // ISO date
    timezone: string | null; // required when scheduledAt is set
    releaseCondition?: 'all_or_nothing' | 'allow_partial';
    actionIds?: number[]; // skipped entries to carry over; all of them if omitted
  }
  ```

### Release Action

**Create a release action**

- method: `POST`
- endpoint: `/content-releases/:releaseId/actions`
- body:

  ```ts
  {
    type: 'publish' | 'unpublish',
    contentType: string;
    locale?: string;
    entryDocumentId?: string;
  }
  ```

**Get release actions from a release**

- method: `GET`
- endpoint: `/content-releases/:releaseId/actions`
- params:
  ```ts
  {
    page: number;
    pageSize: number;
    groupBy?: 'contentType' | 'action' | 'locale';
    // ready / notReady: whether the entry is publishable (every unpublish is). On a release that
    // ran, that's what the run found.
    // released / skipped: what the run did with the entry. Nothing matches on a planned release.
    filter?: 'ready' | 'notReady' | 'released' | 'skipped';
    // Any field of the release action, narrowing the result further, e.g.
    // filters[outcome][$in][0]=skipped_invalid
    filters?: Record<string, unknown>;
  }
  ```
- each action has its `entry`, or `null` when the entry or its content type was deleted after the release ran

**Update a release action**

- method: `PUT`
- endpoint: `/content-releases/:releaseId/actions/:actionId`
- body:
  ```ts
  {
    type: 'publish' | 'unpublish';
  }
  ```

**Delete a release action**

- method: `DELETE`
- endpoint: `/content-releases/:releaseId/actions/:actionId`

## Controllers

### Release

Handles requests to interact with the Release content type

```
packages/core/content-releases/server/src/controllers/release.ts
```

### Release Action

Handles requests to interact with the Release Action content type

## Services

### Release

Interacts with the database for Release CRUD operations

```
packages/core/content-releases/server/src/services/release.ts
```

### Release Actions

Interacts with the database for Release Actions CRUD operations

```
packages/core/content-releases/server/src/services/release-action.ts
```

### Release Validation

Exposes validation functions to run before performing operations on a Release

```
packages/core/content-releases/server/src/services/validation.ts
```

### Scheduling

Exposes methods to schedule release date for releases.

```
packages/core/content-releases/server/src/services/scheduling.ts
```

#### Overdue releases

`syncFromDatabase` only arms future dates, so a release whose scheduled run didn't happen would stay in Pending with a past date. `freezeOverdueReleases` runs at bootstrap, before `syncFromDatabase`, then every minute, and freezes as "Failed" (`releasedAt` set, nothing published):

- a release whose `scheduledAt` is older than the grace period (`OVERDUE_GRACE_PERIOD_MS`, 5 minutes): the server was down, or the run was rolled back by a database error. `failureReason` is `missed_schedule`. It sends the `releases.publish` webhook (`isPublished: false`, an error named `MissedSchedule`) and a `release.trigger` audit failure attributed to the scheduler. A release with no entries missed nothing: it ends "Done" instead (totals all 0, `failureReason` `null`), with the success webhook and audit event its scheduled run would have sent.
- a release that failed before the upgrade: before failed runs were frozen, they left `status: failed` without `releasedAt`. It's frozen whatever its schedule, its job never armed. `failureReason` is `failed_before_upgrade`, and nothing is sent: it reported its failure then.

Every entry gets the outcome `skipped_missed` and keeps the validity last checked (nothing is checked at freeze time). The totals are 0 published, 0 unpublished, every entry skipped, so "Create release from skipped entries" carries over every entry. For `failed_before_upgrade` they don't say what went out: the old run stopped at its first error and kept the entries released before it, and nothing recorded which. Read them as unknown, not as skipped: the API returns `skipped_missed` and these totals, with only `failureReason` telling the two apart. The admin doesn't read `failureReason` yet, so it shows such a release like one that missed its schedule.

Each release is frozen in its own transaction, under a run's row lock, and checked again under it: a run in progress, or a reschedule to a later date, wins. It reads no entry, so it can't deadlock with a run. It throws inside another transaction, which would hold every lock until that one ends. A sweep that starts during another joins it; on a cluster, the lock lets one node freeze and report each release. A release that fails to freeze is left for the next sweep. On MySQL, a run still going 5 minutes after its date can make the sweep's lock wait time out (`innodb_lock_wait_timeout`): that's logged every minute until the run commits. `failureReason` is `null` on every release that ran, and on an empty one the sweep froze as done.

### Release status update triggers:

Each release has a `releaseCondition`: `all_or_nothing` (the default, also given to releases created before the field existed) or `allow_partial`.

A publish entry is publishable when its draft passes publish validation and, if its review workflow has a stage required to publish, it is at that stage. Unpublish entries are always publishable. Each release action stores whether its entry was publishable when last checked (`isEntryValid`) and, if not, why (`reason`, the shape a run records). The check reads the deep-populated draft, as a run does, so the stored reason matches what the run will decide. A draft that can't be read is stored as not publishable, with only the error's name. Only planned releases are rewritten: a release that ran keeps what its run saw.

The validity is written when an entry is added or changes type, when a manual publish is rejected by the check, and through `revalidatePlannedActions` when:

- the entry is edited or its draft discarded;
- a review workflow is created, updated or deleted;
- a content type's attributes change, at startup;
- at startup, for planned actions stored as not publishable before reasons existed (`addReasonsToInvalidActions`).

`revalidatePlannedActions` reads the planned actions (`PLANNED_ACTION_WHERE`) and their drafts before taking any lock, each draft once however many releases the entry is in. Then it changes one release at a time, each in its own transaction under the release lock, and recalculates its status. A release that ran in between is left alone; one whose writes fail is logged without stopping the others. Entry and workflow changes start it after their commit, without waiting (`runAfterCommit`), so their writes never wait on a release lock a run holds.

The releases list and the single release response return `actions.meta.notReadyCount` for planned releases: the publish entries that aren't publishable now. With `actions.meta.count` and the release condition, it gives the status the other condition would have, so no per-condition status is stored.

- **Empty**: the release has no entries.
- **Blocked**: publishing now would release nothing. With `all_or_nothing`, at least one entry is not publishable. With `allow_partial`, no entry is publishable.
- **Ready**: otherwise. An `allow_partial` release with some entries that aren't publishable is ready: they are skipped when it runs.

A release is planned (Empty, Ready, Blocked) until it runs. After it runs, it is frozen with one of these statuses, which nothing changes afterwards:

- **Done**: every entry was published or unpublished. A release with no entries ends done.
- **Partial**: some entries were released and some were not.
- **Failed**: no entry was released.

Considering that retrieving the status of all entries in a release is a heavy operation, we don't fetch it every time a user wants to access a release. Instead, we store the status in a field within the Release Content Type, and we only update it when an action that changes the status is triggered. These actions include:

#### Creating a release:

When creating a release, its status is automatically set to "Empty" as there are no entries initially.

#### Creating a release from skipped entries:

A release that ran can't change, so its skipped entries are released again through a new release: `POST /content-releases/:id/create-from-skipped-entries`.

- An entry is skipped when its outcome is neither `published` nor `unpublished`.
- Only a `partial` or `failed` release that ran is accepted. A release that hasn't run is rejected with `Release not published yet`, a `done` one with `Release has no skipped entries` (both 400). An unknown `:id` is a 404.
- The new release's fields are validated like any new release. `actionIds` restricts the entries to those actions; an id that isn't a skipped entry of the release is a 400.
- Each entry keeps its type and locale, in the order it was added. Its validity is read from the entry as it is now, and the new release's status follows from it.
- Entries deleted since the run (in their locale, for a localized content type), or whose content type was deleted or lost Draft and Publish, are left out. If nothing is left, the request is rejected with a 400: `Release has no skipped entries`, or `The requested entries can no longer be released` when `actionIds` was given.
- The release, its entries and its status are written in one transaction. The source release isn't changed.

#### Adding an entry to a release:

Upon adding an entry to a release, its status is recalculated to either "Ready" or "Blocked" from the validity of its entries and its release condition.

The recalculations below only apply to a planned release. `updateReleaseStatus` also leaves alone a `failed` release without `releasedAt`, which failed before the upgrade and is left for the overdue sweep. It reads the release under its row lock, so its counts are those of the last committed change and it can't overwrite a newer status. The stored validity has no such guarantee: two overlapping re-checks of an entry can leave the older draft's validity until the next one.

Changing a release's entries through the API writes the change and the recalculated status in one transaction, under the release lock: if the recalculation fails, the change is rolled back, and a release that ran is refused (`Release already published`). Editing or deleting the release takes the same lock, so one frozen while the request was in flight is refused. Editing, discarding or deleting the entry recalculates in the background (see "Listening to events on entries").

#### Removing an entry from a release:

After removing an entry from a release, the status is recalculated to determine if the release is now "Ready", "Blocked", or "Empty".

#### Updating a release:

Whenever a release is updated, its status is recalculated, so switching the release condition switches between "Ready" and "Blocked". The recalculation is awaited, so a read right after the update sees the new status.

#### Publishing a release:

A publish is either manual (the publish button or the API) or scheduled (the scheduler, at the release date). Under the release row lock, the run first reads every publish entry's current draft and checks whether it is publishable, before writing anything. Only a validation error makes an entry invalid. An entry whose check throws anything else (e.g. its draft can't be read) is recorded as `skipped_error` and, like an invalid one, isn't publishable. Entries are then handled one at a time: content types in relation dependency order, publishes before unpublishes, each in the order they were added. They share the lock transaction, and are written in savepoints (`strapi.db.savepoint`), so a failure rolls back exactly what it should.

- `allow_partial`: entries that aren't publishable are skipped without being written. Each other entry is published or unpublished in its own savepoint: if that throws, only that entry is rolled back and skipped, and the run moves on. The check can pass an entry that still fails when written, for example when an earlier entry of the same run takes its unique value: since a publish removes the entry's published version before it validates the new one, the savepoint is what keeps that version online.
- `all_or_nothing`: if any entry isn't publishable, no entry is written. Otherwise every entry is published or unpublished in one savepoint, and the first error rolls them all back.

The run decides from this check, not from the stored status: a release that reads "Blocked" only because a background revalidation hasn't caught up with a fixed entry yet is published. When the check finds that a run would release nothing (`all_or_nothing`: any entry not publishable; `allow_partial`: no entry publishable; never for a release with no entries):

- A manual publish is rejected (400) with the first such entry's validation error, in run order. When only checks that threw block it, the error is `An entry couldn't be checked (<error name>)`, never the thrown message. Nothing is published, the check's result is stored on the release actions (`isEntryValid`), and the status is recalculated, so the release stays planned and reads "Blocked" even if the stored values had gone out of date. No webhook or audit event is sent.
- A scheduled run fails: the release is frozen as "Failed", with the first entry's error for `all_or_nothing` and `No entries were published` for `allow_partial`.

Database caveats:

- On MySQL, a deadlock rolls back the whole transaction, not the savepoint, so the deadlock isn't recorded as `skipped_error`: under either mode it rolls the whole run back, nothing is recorded, and the request fails with a 500.
- An unexpected error that stops a manual `all_or_nothing` run is recorded as "Failed", and the request fails with that error: an `ApplicationError` keeps its own status (a validation error is a 400, and only it carries the frozen release in `error.details.release`), anything else is a 500.

How a run ends:

- Every entry released, or no entries at all: "Done", with `releasedAt` set.
- Some entries released and some not (an `allow_partial` run that skipped entries): "Partial", with `releasedAt` set.
- No entry released (an `allow_partial` run whose entries all failed, or an `all_or_nothing` run stopped by an error): "Failed", with `releasedAt` set, and the request fails. A validation error (400) then carries the frozen release in `error.details.release`, which a refused publish never has. The release leaves Pending and can't be published again: its entries go out in a new release.

A run either records its outcome or doesn't happen. Only the failures the run decides are recorded as "Failed" (a scheduled run stopped by the check, an `all_or_nothing` run stopped by an entry error, an `allow_partial` run where every entry failed). Any other error (reading the entries, writing the result, the writes of a rejected manual publish) rolls the whole transaction back, the entries it released included: the request fails, the release stays as it was, and no webhook or audit event is sent. A scheduled release whose run rolled back is frozen by the overdue sweep (see Scheduling); a manual one can be published again.

Each entry of the run records what happened to it on its release action, returned by `GET /content-releases/:releaseId/actions`:

| `outcome`              | When                                                                                                                                                                               | `reason`                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `published`            | the entry was published                                                                                                                                                            | `null`                                                                                                                             |
| `unpublished`          | the entry was unpublished, also when it had no published version                                                                                                                   | `null`                                                                                                                             |
| `skipped_invalid`      | the draft failed publish validation, whether or not it was also at the wrong stage, or publishing it raised a validation error (e.g. a unique clash with another entry of the run) | `validation.errors`: field `path` and `message`, without the error's `value`; a type-mismatch message loses the value it ends with |
| `skipped_not_approved` | the entry wasn't at the stage required to publish                                                                                                                                  | `stage`: the entry's stage and the required one                                                                                    |
| `skipped_error`        | publishing or unpublishing the entry, or checking it, threw an error other than a validation error                                                                                 | `error.name`, never its message                                                                                                    |
| `skipped_held`         | the entry was publishable, but an `all_or_nothing` run released nothing (at the check or after an error)                                                                           | `null`                                                                                                                             |
| `skipped_missed`       | the release froze without running: its scheduled run never happened, or it failed before the upgrade (frozen by the overdue sweep, see Scheduling)                                 | unchanged: the last check before the date                                                                                          |

An entry that fails both checks keeps both in its `reason`. The outcomes are written in the lock transaction with the release's status, with the validity the run found: `isEntryValid` is `false` for `skipped_invalid` and `skipped_not_approved`, and `true` for every other outcome except a `skipped_error` entry whose check threw, so it never contradicts the outcome. A release runs once: its outcomes are never rewritten afterwards, a `failed` release included. A run that records nothing leaves `outcome` empty: a manual publish rejected by the check (it didn't run), and a run the database rolls back.

The run also stores its totals on the release, with its status: `totalPublishedEntries` and `totalUnpublishedEntries` count the entries recorded as `published` and `unpublished`, and `totalSkippedEntries` every other entry of the run, whatever the reason (each entry keeps its own `outcome` and `reason`). The three always add up to the release's entries when it ran: a "Failed" release has 0 published and every entry skipped. `GET /content-releases/:id` and `GET /content-releases` return them on each release, and `POST /content-releases/:id/publish` returns them in its `meta` too, with `totalEntries` their sum. They stay `null` while the release is planned, including after a manual publish rejected by the check.

The status written, the `releases.publish` webhook and the `release.trigger` audit event always agree. The webhook's `release` is the release as the run left it, with its totals, also when it failed:

| Status  | Webhook `isPublished` | Audit `outcome` | Audit `details`                         |
| ------- | --------------------- | --------------- | --------------------------------------- |
| Done    | `true`                | `success`       | `published`, `unpublished`, `failed: 0` |
| Partial | `true`                | `partial`       | `published`, `unpublished`, `failed`    |
| Failed  | `false`               | `failure`       | `reason`: the error's name              |

The audit counts are the release's totals, `failed` being `totalSkippedEntries`: the entries the run left out, not publishable, or their publish or unpublish threw. The webhook and the audit event are sent once the outcome is committed. Entry errors are rolled back with their savepoint, so on Postgres they don't abort the transaction; any other error rolls back the whole run, as above.

#### Listening to events on entries:

When an entry is updated, its draft is discarded or it is deleted, the status of all releases containing that entry is recalculated to reflect any changes in validity. Only releases that haven't run are affected: an update or a discarded draft rewrites `isEntryValid` and `reason` (a discarded draft is replaced by the published version, for each locale it was discarded in) and a deletion removes the entry's actions only there. A release that ran keeps the actions of deleted entries, with what the run recorded; `GET /content-releases/:releaseId/actions` returns them with a `null` `entry` and `status`.

This work isn't awaited by the entry's request (`runAfterCommit`) and runs outside its transaction, so the request responds before the releases' `isEntryValid`, `reason` and status change: a client that shows them after a save re-reads them until they do. It starts once that transaction commits (right away without one). It reads the committed entry, can't undo the request's writes, and doesn't run for a change that was rolled back. Each affected release is then changed in a transaction of its own, under its lock. Failures are logged.

## Migrations

These run on every content type sync. The revalidation passes aren't awaited by startup and log their failures.

- Before the sync: `disableContentTypeLocalized` (the actions of a content type that is no longer localized lose their locale).
- After the sync:
  - `deleteActionsOnDeleteContentType` and `deleteActionsOnDisableDraftAndPublish`: the content type's actions leave every planned release. Releases that ran keep them; for a deleted content type, they're listed with a `null` `entry` and the uid as display name. They run after the sync because they recalculate statuses, which reads the current schema.
  - `enableContentTypeLocalized`: the actions of a newly localized content type get the default locale.
  - `revalidateChangedContentTypes`: the planned actions of content types whose attributes changed are revalidated.
  - `migrateIsValidAndStatusReleases`: releases from before statuses existed get one.
  - `addReasonsToInvalidActions`: see above.
  - `migrateReleaseConditionReleases`: releases from before the condition existed get `all_or_nothing`.
  - `addOutcomesToReleasedReleases`: a release that ran before outcomes existed released every entry (a failed run left it planned), so each action gets `published` or `unpublished` and the release its totals. A release a since-removed migration froze as `failed_before_upgrade`, without totals, gets every entry `skipped_missed` and all-skipped totals, as the sweep writes.

Releases that failed before the upgrade are frozen by the overdue sweep at bootstrap (see Scheduling).

`addReasonsToInvalidActions` finds again, at the next start, the actions of a release whose revalidation failed. `revalidateChangedContentTypes` doesn't: once the sync has stored the new schema, the attributes no longer differ, so a failed release keeps its stored validity until its entries change.

## Subscribing to Lifecycles Events

When entries are deleted outside the Document Service (`afterDeleteMany`, e.g. when a locale is deleted), their actions are deleted in releases that haven't run and those releases' status is recalculated, after the deletion commits, as in "Listening to events on entries".
