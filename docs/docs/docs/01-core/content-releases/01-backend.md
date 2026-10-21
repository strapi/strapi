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
    // ready: publishable now, and every unpublish; notReady: publish entries that aren't,
    // including ones never validated. On a release that ran, readiness is what the run found:
    // entries held back or that threw while released count as ready, invalid or not approved
    // ones as not ready.
    // released: published or unpublished by the run; skipped: anything else in a release that ran,
    // including entries with no outcome (a release that ran before outcomes existed)
    filter?: 'ready' | 'notReady' | 'released' | 'skipped';
  }
  ```

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

A release whose scheduled run didn't happen would otherwise stay in Pending with a past date: `syncFromDatabase` only arms future dates. `freezeOverdueReleases` runs at bootstrap, before `syncFromDatabase`, and then every minute. It freezes as "Failed" (`releasedAt` set, nothing published) every release without `releasedAt` whose `scheduledAt` is older than the grace period (`OVERDUE_GRACE_PERIOD_MS`, 5 minutes): the server was down at that time, or the run was rolled back by a database error. `failureReason` is `missed_schedule`. Every entry gets the outcome `skipped_missed` and keeps the `isEntryValid` and `reason` last checked before the date (nothing is checked at freeze time), and the totals are 0 published, 0 unpublished, every entry skipped. It sends the `releases.publish` webhook (`isPublished: false`, an error named `MissedSchedule`, worded for both causes: the release "wasn't released at its scheduled time") and a `release.trigger` audit failure attributed to the scheduler.

Each release is frozen in its own transaction, under the same row lock as a run, and checked again under that lock: a run in progress, or a reschedule to a later date, wins. It locks the release row first, then writes only that release's action rows, in the same order as a run, and reads no entry, so it can't deadlock with a run or a review workflow change. It must not run inside another transaction (it throws), which would hold every lock until that transaction ends. A sweep that starts while one is still running (waiting on a long run's lock) joins it, and on a cluster each node sweeps: the lock lets one node freeze and report each release. A release that fails to freeze is left for the next sweep. On MySQL, a run still going more than 5 minutes after its date can make the sweep's lock wait time out (`innodb_lock_wait_timeout`): that's logged every minute until the run commits, and the release isn't touched. `failureReason` is `null` on every release that ran.

Releases that failed before failed runs were frozen kept `status: failed` without `releasedAt`, so they stayed planned. A one-time update after the schema sync (`freezeReleasesFailedBeforeUpgrade`, before the bootstrap arms scheduled jobs) freezes them as they are: `releasedAt` set, `failureReason` is `failed_before_upgrade`. What their run did isn't known, so the outcomes and totals stay `null`, and no webhook or audit event is sent (they sent them when they failed).

### Release status update triggers:

Each release has a `releaseCondition`: `all_or_nothing` (the default, and the value given to releases created before the field existed) or `allow_partial`. A publish entry is publishable when its draft passes publish validation and, if its content type's review workflow has a stage required to publish, the entry is at that stage. Without review workflows, only validation applies. Unpublish entries are always publishable. Each release action stores whether its entry was publishable when last checked (`isEntryValid`) and, when it isn't, why (`reason`, the same shape a run records: field paths and messages without the submitted values, and the entry's and required stages). The status is derived from the values of the publish actions. Unpublish actions are always publishable: they keep `isEntryValid: true` and no `reason`. The check reads the deep-populated draft, as a run does, so the stored reason matches what the run will decide. Only actions of releases that haven't run are rewritten: a release that ran keeps what its run saw.

The validity and reason are written when an entry is added to a release or its action changes type, when the entry is edited or its draft discarded (only if it's in a planned release), when a manual publish is rejected by the check, when a review workflow is created, updated or deleted (stages, required stage, content types), when a content type's attributes change at startup, and once, at startup, for planned actions stored as not publishable before reasons existed (`addReasonsToInvalidActions`; it finds nothing to do once they all have one). Apart from adding an entry, changing its type and the publish check, these all go through `revalidatePlannedActions` (release-action service). A review workflow change starts it once the workflow's transaction commits, without waiting for it (`runAfterCommit`, as for an entry edit): the workflow request returns before the statuses are updated, and its stage writes never wait on a release lock, which a run holds while it publishes. It reads the matching planned actions (`PLANNED_ACTION_WHERE`: no `outcome`, in a release that hasn't run and still exists) and their drafts before taking any lock, looking up each content type's deep populate and workflow once and reading each draft once, however many releases the entry is in. Then, one release at a time, each in its own transaction under the release row lock a run takes, it stores each publish action's validity, makes valid an unpublish action an earlier version stored as invalid, and recalculates the status. A release that ran or was deleted in between is left alone. A release whose writes fail is rolled back and logged without stopping the others (see "Migrations" for what startup retries). A draft that can't be read is stored as not publishable, with only the error's name as its `reason`.

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

- An entry is skipped when its outcome is neither `published` nor `unpublished`, or when it has no outcome (releases that ran before outcomes were recorded).
- Only a `partial` or `failed` release that ran is accepted. A release that hasn't run is rejected with `Release not published yet`, a `done` one with `Release has no skipped entries` (both 400). An unknown `:id` is a 404.
- The new release's fields are validated like any new release. `actionIds` restricts the entries to those actions; an id that isn't a skipped entry of the release is a 400.
- Each entry keeps its type and locale, in the order it was added. Its validity is read from the entry as it is now, and the new release's status follows from it.
- Entries deleted since the run (in their locale, for a localized content type), or whose content type was deleted or lost Draft and Publish, are left out. If nothing is left, the request is rejected with a 400: `Release has no skipped entries`, or `The requested entries can no longer be released` when `actionIds` was given.
- The release, its entries and its status are written in one transaction. The source release isn't changed.

#### Adding an entry to a release:

Upon adding an entry to a release, its status is recalculated to either "Ready" or "Blocked" from the validity of its entries and its release condition.

All the recalculations below only apply to a planned release: once `releasedAt` is set, `updateReleaseStatus` leaves the status as the run wrote it. It also leaves a `failed` release without `releasedAt` alone: that's a release that failed before the upgrade, which the startup freeze (`freezeReleasesFailedBeforeUpgrade`) must find still `failed`; every run since sets `releasedAt` on a failed release. It reads the release under its row lock, the one runs and action changes take, so its counts are those of the last committed change, and a recalculation can't overwrite a newer one or a run's status. The stored `isEntryValid` and `reason` don't have that guarantee: a re-check reads the draft before taking the lock, so two overlapping re-checks of an entry can leave the older draft's validity until the next one.

Adding entries, removing one, or changing an entry's action type through the releases API writes the change and the recalculated status in one transaction, before the response: if the recalculation fails, the request fails and the change is rolled back. The transaction takes the release row lock a run takes, so the change waits for a run in progress, and a release that ran can't gain, lose or change entries (`Release already published`). Editing or deleting the release itself takes the same lock and checks `releasedAt` under it, so a release frozen by a run or the overdue sweep while the request was in flight is refused, not rescheduled or deleted; the edit's scheduled job is armed after its commit. Editing the entry, discarding its draft or deleting it recalculates in the background, after the entry is written (see "Listening to events on entries").

#### Removing an entry from a release:

After removing an entry from a release, the status is recalculated to determine if the release is now "Ready", "Blocked", or "Empty".

#### Updating a release:

Whenever a release is updated, its status is recalculated, so switching the release condition switches between "Ready" and "Blocked". The recalculation is awaited, so a read right after the update sees the new status.

#### Publishing a release:

A publish is either manual (the publish button or the API) or scheduled (the scheduler, at the release date). Under the release row lock, the run first reads every publish entry's current draft and checks whether it is publishable, before writing anything. Entries are then handled one at a time: content types in relation dependency order, publishes before unpublishes, each in the order they were added. They share the lock transaction, and are written in savepoints (`strapi.db.savepoint`), so a failure rolls back exactly what it should.

- `allow_partial`: entries that aren't publishable are skipped without being written. Each other entry is published or unpublished in its own savepoint: if that throws, only that entry is rolled back and skipped, and the run moves on. The check can pass an entry that still fails when written, for example when an earlier entry of the same run takes its unique value: since a publish removes the entry's published version before it validates the new one, the savepoint is what keeps that version online.
- `all_or_nothing`: if any entry isn't publishable, no entry is written. Otherwise every entry is published or unpublished in one savepoint, and the first error rolls them all back.

When the check finds that a run would release nothing (`all_or_nothing`: any entry not publishable; `allow_partial`: no entry publishable; never for a release with no entries):

- A manual publish is rejected with the first such entry's validation error, in run order. Nothing is published, the check's result is stored on the release actions (`isEntryValid`), and the status is recalculated, so the release stays planned and reads "Blocked" even if the stored values had gone out of date. No webhook or audit event is sent.
- A scheduled run fails: the release is frozen as "Failed", with the first entry's error for `all_or_nothing` and `No entries were published` for `allow_partial`.

How a run ends:

- Every entry released, or no entries at all: "Done", with `releasedAt` set.
- Some entries released and some not (an `allow_partial` run that skipped entries): "Partial", with `releasedAt` set.
- No entry released (an `allow_partial` run whose entries all failed, or an `all_or_nothing` run stopped by an error): "Failed", with `releasedAt` set, and the request fails. The release leaves Pending and can't be published again: its entries go out in a new release.

A run either records its outcome or doesn't happen. Only the failures the run decides are recorded as "Failed" (a scheduled run stopped by the check, an `all_or_nothing` run stopped by an entry error, an `allow_partial` run where every entry failed). Any other error (reading the entries, writing the result, the writes of a rejected manual publish) rolls the whole transaction back, the entries it released included: the request fails, the release stays as it was, and no webhook or audit event is sent. A scheduled release whose run rolled back is frozen by the overdue sweep (see Scheduling); a manual one can be published again.

Each entry of the run records what happened to it on its release action, returned by `GET /content-releases/:releaseId/actions`:

| `outcome`              | When                                                                                                                                                                               | `reason`                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `published`            | the entry was published                                                                                                                                                            | `null`                                                                                                                             |
| `unpublished`          | the entry was unpublished, also when it had no published version                                                                                                                   | `null`                                                                                                                             |
| `skipped_invalid`      | the draft failed publish validation, whether or not it was also at the wrong stage, or publishing it raised a validation error (e.g. a unique clash with another entry of the run) | `validation.errors`: field `path` and `message`, without the error's `value`; a type-mismatch message loses the value it ends with |
| `skipped_not_approved` | the entry wasn't at the stage required to publish                                                                                                                                  | `stage`: the entry's stage and the required one                                                                                    |
| `skipped_error`        | publishing or unpublishing the entry threw an error other than a validation error                                                                                                  | `error.name`, never its message                                                                                                    |
| `skipped_held`         | the entry was publishable, but an `all_or_nothing` run released nothing (at the check or after an error)                                                                           | `null`                                                                                                                             |
| `skipped_missed`       | the release's scheduled run never happened (frozen by the overdue sweep, see Scheduling): nothing was checked or released                                                          | unchanged: the last check before the date                                                                                          |

An entry that fails both checks keeps both in its `reason`. The outcomes are written in the lock transaction with the release's status, with the validity the run found: `isEntryValid` is `false` for `skipped_invalid` and `skipped_not_approved`, and `true` for every other outcome (a `skipped_error` entry had passed the check), so it never contradicts the outcome. A release runs once: its outcomes are never rewritten afterwards, a `failed` release included. A run that records nothing leaves `outcome` empty: a manual publish rejected by the check (it didn't run), and a run the database rolls back.

The run also stores its totals on the release, with its status: `totalPublishedEntries` and `totalUnpublishedEntries` count the entries recorded as `published` and `unpublished`, and `totalSkippedEntries` every other entry of the run, whatever the reason (each entry keeps its own `outcome` and `reason`). The three always add up to the release's entries when it ran: a "Failed" release has 0 published and every entry skipped. `GET /content-releases/:id` and `GET /content-releases` return them on each release, and `POST /content-releases/:id/publish` returns them in its `meta` too, with `totalEntries` their sum. They stay `null` until the release runs: a release that is still planned, including after a manual publish rejected by the check, and a release that ran before the totals existed.

The status written, the `releases.publish` webhook and the `release.trigger` audit event always agree. The webhook's `release` is the release as the run left it, with its totals, also when it failed:

| Status  | Webhook `isPublished` | Audit `outcome` | Audit `details`                         |
| ------- | --------------------- | --------------- | --------------------------------------- |
| Done    | `true`                | `success`       | `published`, `unpublished`, `failed: 0` |
| Partial | `true`                | `partial`       | `published`, `unpublished`, `failed`    |
| Failed  | `false`               | `failure`       | `reason`: the error's name              |

The audit counts are the release's totals, `failed` being `totalSkippedEntries`: the entries the run left out, not publishable, or their publish or unpublish threw. The webhook and the audit event are sent once the outcome is committed. Entry errors are rolled back with their savepoint, so on Postgres they don't abort the transaction; any other error rolls back the whole run, as above.

#### Listening to events on entries:

When an entry is updated, its draft is discarded or it is deleted, the status of all releases containing that entry is recalculated to reflect any changes in validity. Only releases that haven't run are affected: an update or a discarded draft rewrites `isEntryValid` and `reason` (a discarded draft is replaced by the published version, for each locale it was discarded in) and a deletion removes the entry's actions only there. A release that ran keeps the actions of deleted entries, with what the run recorded; `GET /content-releases/:releaseId/actions` returns them with an empty `entry` and a `null` `status`.

This work isn't awaited by the entry's request (`runAfterCommit`) and runs outside its transaction: it starts once that transaction commits (right away without one). It reads the committed entry, can't undo the request's writes, and doesn't run for a change that was rolled back. Each affected release is then changed in a transaction of its own, under its lock. Failures are logged.

## Migrations

These run on every content type sync. The revalidation passes aren't awaited by startup and log their failures.

- Before the sync: `disableContentTypeLocalized` (the actions of a content type that is no longer localized lose their locale).
- After the sync: `deleteActionsOnDeleteContentType` (the actions of a deleted content type are removed), `deleteActionsOnDisableDraftAndPublish` (the actions of a content type that no longer has Draft and Publish are removed), `enableContentTypeLocalized` (the actions of a newly localized content type get the default locale), `revalidateChangedContentTypes` (the planned actions of content types whose attributes changed are revalidated), `migrateIsValidAndStatusReleases` (releases from before statuses existed get one), `addReasonsToInvalidActions` (see above) and `migrateReleaseConditionReleases` (releases from before the condition existed get `all_or_nothing`).

The two removals (`deleteContentTypeActions`) also remove the actions of releases that ran, whose status and totals stay as the run wrote them: their entries can no longer be read. They run after the sync because they recalculate the status of each planned release that lost actions, which reads the current schema.

`addReasonsToInvalidActions` finds again, at the next start, the actions of a release whose revalidation failed. `revalidateChangedContentTypes` doesn't: once the sync has stored the new schema, the attributes no longer differ, so a failed release keeps its stored validity until its entries change.

## Subscribing to Lifecycles Events

When entries are deleted outside the Document Service (`afterDeleteMany`, e.g. when a locale is deleted), their actions are deleted in releases that haven't run and those releases' status is recalculated, after the deletion commits, as in "Listening to events on entries".
