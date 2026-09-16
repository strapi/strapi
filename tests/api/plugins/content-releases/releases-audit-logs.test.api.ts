import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

/**
 * Every action on a release should appear in Audit Logs following the payload
 * standard: {actor, origin, resource, details, outcome}, where the resource is the
 * release and the acting admin is recorded both as the user relation and as an actor
 * snapshot in the payload.
 *
 * A bulk request produces one entry per entry it added: skipped duplicates produce
 * nothing.
 *
 * Requests are issued by a dedicated admin rather than the default super admin, so that
 * asserting the recorded actor is discriminating: with a single admin in the database,
 * "some admin was recorded" holds for any implementation.
 *
 * Audit logs require the EE license, so the suite is skipped in CE.
 */

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const PRODUCT_UID = 'api::product.product';

const productModel = {
  kind: 'collectionType',
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
  },
};

describeOnCondition(edition === 'EE')('Releases in audit logs (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;

  const actingAdmin = {
    email: 'releases-audit-actor@test.com',
    firstname: 'Releases',
    lastname: 'Actor',
    password: 'Password123',
  };

  // What the stored actor snapshot of the acting admin has to look like
  const actingActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Releases Actor' },
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  // Audit rows are written from an event handler, so poll rather than assume the row
  // is already there when the request returns.
  const waitForLog = async (action: string, timeout = 2000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const [log] = await findLogs(action);
      if (log) return log;
      await sleep(50);
    }
    throw new Error(`Expected a ${action} audit log within ${timeout}ms`);
  };

  // Also catches a duplicate arriving late, which is what a per-entity emit would do.
  const expectExactlyOneLog = async (action: string) => {
    await waitForLog(action);
    await sleep(200);
    const logs = await findLogs(action);
    expect(logs).toHaveLength(1);
    return logs[0];
  };

  const expectNoLog = async (action: string) => {
    await sleep(300);
    expect(await findLogs(action)).toHaveLength(0);
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
    // Drain a deferred write still in flight so it can't leak into the next test.
    await sleep(100);
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const createRelease = async (body: Record<string, unknown>) => {
    const res = await rq({ url: '/content-releases/', method: 'POST', body });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const createEntry = async (name: string) => {
    const res = await rq({
      url: `/content-manager/collection-types/${PRODUCT_UID}`,
      method: 'POST',
      body: { name },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const releaseAction = (documentId: string, type = 'publish') => ({
    type,
    contentType: PRODUCT_UID,
    entryDocumentId: documentId,
    locale: 'en',
  });

  const inFuture = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

  /**
   * Runs a release's scheduled job now. The job is registered when the release is
   * scheduled; firing it directly keeps these tests off the clock.
   */
  const runScheduledJob = async (releaseId: number) => {
    const spec = strapi.cron.jobs.find(
      (jobSpec: { name: string | null }) => jobSpec.name === `publishRelease_${releaseId}`
    );
    expect(spec).toBeDefined();
    await spec.job.invoke();
  };

  beforeAll(async () => {
    await builder.addContentType(productModel).build();
    strapi = await createStrapiInstance();

    // A second admin performs the requests, so the actor assertions fail if the recorded
    // user is anyone else — including the default super admin.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::content-releases.release').deleteMany();
    await strapi.db.query(PRODUCT_UID).deleteMany();
    await clearAuditLogs();
    // Remove the acting admin so reruns don't accumulate duplicates
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    // Releases are capped per license (3 pending by default), so each test starts
    // from an empty slate rather than accumulating them
    await strapi.db.query('plugin::content-releases.release-action').deleteMany();
    await strapi.db.query('plugin::content-releases.release').deleteMany();
    await clearAuditLogs();
  });

  describe('release', () => {
    it('records the creation with the actor snapshot and the release as resource', async () => {
      const release = await createRelease({ name: 'Audited create', timezone: 'Europe/Paris' });

      const log = await expectExactlyOneLog('release.create');
      expect(log.payload).toEqual({
        action: 'release.create',
        date: expect.any(String),
        actor: actingActor(),
        origin: 'admin-panel',
        resource: { type: 'release', id: release.id, name: 'Audited create' },
        details: { isScheduled: false },
      });
      // The admin who made the request, not merely some admin
      expect(log.user.id).toBe(actingAdminId);
    });

    it('records a name change with its previous value', async () => {
      const release = await createRelease({ name: 'Before rename', timezone: 'Europe/Paris' });
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'After rename', timezone: 'Europe/Paris' },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('release.update');
      expect(log.payload.resource).toEqual({
        type: 'release',
        id: release.id,
        name: 'After rename',
      });
      expect(log.payload.details.changes).toEqual({
        name: { before: 'Before rename', after: 'After rename' },
      });
    });

    it('reports which fields an edit changed', async () => {
      const release = await createRelease({ name: 'Which fields', timezone: 'Europe/Paris' });
      const scheduledAt = inFuture(60);

      // Scheduling it, then resending the same values, then moving the date
      await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'Which fields', timezone: 'Europe/Paris', scheduledAt },
      });
      await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'Which fields', timezone: 'Europe/Paris', scheduledAt },
      });
      await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'Renamed too', timezone: 'America/New_York', scheduledAt },
      });

      await sleep(400);
      const logs = await findLogs('release.update');

      expect(
        logs.map((log: { payload: { details: { changes: object } } }) =>
          Object.keys(log.payload.details.changes)
        )
      ).toEqual([
        ['scheduledAt', 'isScheduled'],
        // Resending the same values produces no entry
        ['name', 'timezone'],
      ]);
    });

    it('records scheduling as an edit carrying the date change', async () => {
      const release = await createRelease({ name: 'To schedule', timezone: 'Europe/Paris' });
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'To schedule', timezone: 'Europe/Paris', scheduledAt: inFuture(60) },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('release.update');
      expect(log.payload.details.changes.scheduledAt.before).toBeNull();
      expect(log.payload.details.changes.scheduledAt.after).toBeTruthy();
      expect(log.payload.details.changes.isScheduled).toEqual({ before: false, after: true });
    });

    it('records unscheduling as an edit clearing the date', async () => {
      const release = await createRelease({
        name: 'To unschedule',
        timezone: 'Europe/Paris',
        scheduledAt: inFuture(60),
      });
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'To unschedule', timezone: 'Europe/Paris', scheduledAt: null },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('release.update');
      expect(log.payload.details.changes.scheduledAt.before).toBeTruthy();
      expect(log.payload.details.changes.scheduledAt.after).toBeNull();
      expect(log.payload.details.changes.isScheduled).toEqual({ before: true, after: false });
    });

    it('records a deletion as one entry, whatever it holds', async () => {
      const release = await createRelease({ name: 'To delete', timezone: 'Europe/Paris' });
      const first = await createEntry('delete-me-1');
      const second = await createEntry('delete-me-2');

      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(first.documentId),
      });
      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(second.documentId),
      });
      await clearAuditLogs();

      const res = await rq({ url: `/content-releases/${release.id}`, method: 'DELETE' });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('release.delete');
      expect(log.payload.resource).toEqual({ type: 'release', id: release.id, name: 'To delete' });
      // The two actions were removed along with the release, without their own entries
      await expectNoLog('release.entry.remove');
    });

    it('records the trigger as a success with the entry counts', async () => {
      const release = await createRelease({ name: 'To publish', timezone: 'Europe/Paris' });
      const entry = await createEntry('publish-me');

      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });
      await clearAuditLogs();

      const res = await rq({ url: `/content-releases/${release.id}/publish`, method: 'POST' });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('release.trigger');
      expect(log.payload).toMatchObject({
        outcome: 'success',
        origin: 'admin-panel',
        resource: { type: 'release', id: release.id, name: 'To publish' },
      });
      // Counts alone: the per-entry detail lives on the entry.publish entries the
      // release produced
      expect(log.payload.details).toEqual({ published: 1, unpublished: 0, failed: 0 });
    });

    it('records a failed trigger with only the error name', async () => {
      const release = await createRelease({ name: 'Fails to publish', timezone: 'Europe/Paris' });
      await clearAuditLogs();

      // Publishing a release with no entries fails inside the publish service
      const res = await rq({ url: `/content-releases/${release.id}/publish`, method: 'POST' });
      expect(res.statusCode).toBe(400);

      const log = await expectExactlyOneLog('release.trigger');
      expect(log.payload).toMatchObject({
        outcome: 'failure',
        origin: 'admin-panel',
        actor: actingActor(),
        resource: { type: 'release', id: release.id, name: 'Fails to publish' },
      });
      // The error's name and nothing else from it: no message, no driver properties,
      // and no entry counts, since a failed run is not atomic
      expect(log.payload.details).toEqual({ reason: 'ValidationError' });
      expect(log.user.id).toBe(actingAdminId);
    });

    it('records nothing for a publish attempt on an already published release', async () => {
      const release = await createRelease({ name: 'Published twice', timezone: 'Europe/Paris' });
      const entry = await createEntry('publish-twice');
      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });
      const first = await rq({ url: `/content-releases/${release.id}/publish`, method: 'POST' });
      expect(first.statusCode).toBe(200);
      await waitForLog('release.trigger');
      await clearAuditLogs();

      // The attempt never starts a run: not a failed publish
      const second = await rq({ url: `/content-releases/${release.id}/publish`, method: 'POST' });
      expect(second.statusCode).toBe(400);
      await expectNoLog('release.trigger');
    });

    it('records nothing for a publish of a release that never existed', async () => {
      // Any admin can request arbitrary ids; recording those attempts would let them
      // fill the log with junk rows
      const res = await rq({ url: '/content-releases/999999/publish', method: 'POST' });
      expect(res.statusCode).toBe(404);

      await expectNoLog('release.trigger');
    });

    it('registers a job when a release is scheduled', async () => {
      // The tests below fire that job directly, so this is what proves scheduling
      // wires it up at all
      const release = await createRelease({
        name: 'Scheduled job',
        timezone: 'Europe/Paris',
        scheduledAt: inFuture(60),
      });

      expect(
        strapi.cron.jobs.some(
          (jobSpec: { name: string | null }) => jobSpec.name === `publishRelease_${release.id}`
        )
      ).toBe(true);
    });

    it('records a publish run by the scheduler, with a system actor and no user', async () => {
      const release = await createRelease({ name: 'Scheduled', timezone: 'Europe/Paris' });
      const entry = await createEntry('scheduled-entry');

      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });

      const res = await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'Scheduled', timezone: 'Europe/Paris', scheduledAt: inFuture(60) },
      });
      expect(res.statusCode).toBe(200);

      // Who scheduled it is recorded here, which is what makes the userless publish
      // entry below traceable back to a person.
      const scheduleLog = await waitForLog('release.update');
      expect(scheduleLog.user.id).toBe(actingAdminId);
      expect(scheduleLog.payload.details.changes.scheduledAt.after).toBeTruthy();

      await runScheduledJob(release.id);

      const publishedRelease = await strapi.db
        .query('plugin::content-releases.release')
        .findOne({ where: { id: release.id } });
      expect(publishedRelease.releasedAt).toBeTruthy();

      const log = await waitForLog('release.trigger');
      expect(log.user).toBeNull();
      expect(log.payload).toMatchObject({
        actor: { type: 'system' },
        origin: 'scheduler',
        outcome: 'success',
        resource: { type: 'release', id: release.id, name: 'Scheduled' },
        details: { published: 1, unpublished: 0, failed: 0 },
      });

      // The publish ran in a system execution context, so the per-entry legacy
      // events it fired are recorded too, with no user
      const entryLog = (await findLogs('entry.publish')).find(
        (entry: { payload: { origin: string } }) => entry.payload.origin === 'scheduler'
      );
      expect(entryLog).toBeDefined();
      expect(entryLog.user).toBeNull();
    });

    it('records a failed scheduled publish with a system actor', async () => {
      // An empty release can be scheduled; publishing it fails inside the service
      const release = await createRelease({
        name: 'Scheduled to fail',
        timezone: 'Europe/Paris',
        scheduledAt: inFuture(60),
      });
      await clearAuditLogs();

      await expect(runScheduledJob(release.id)).rejects.toThrow();

      const log = await waitForLog('release.trigger');
      expect(log.user).toBeNull();
      expect(log.payload).toMatchObject({
        actor: { type: 'system' },
        origin: 'scheduler',
        outcome: 'failure',
        resource: { type: 'release', id: release.id, name: 'Scheduled to fail' },
      });
      expect(log.payload.details).toEqual({ reason: 'ValidationError' });
    });

    it('reports the resource id as a number in every event', async () => {
      // Ids read off ctx.params are strings, which would make the field impossible to
      // filter on consistently.
      const release = await createRelease({ name: 'Consistent ids', timezone: 'Europe/Paris' });
      const entry = await createEntry('consistent-ids');

      const created = await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });
      const actionId = created.body.data.id;

      await rq({
        url: `/content-releases/${release.id}/actions/${actionId}`,
        method: 'PUT',
        body: { type: 'unpublish' },
      });
      await rq({ url: `/content-releases/${release.id}/publish`, method: 'POST' });

      await sleep(400);
      const logs = await strapi.db.query('admin::audit-log').findMany({});
      const releaseLogs = logs.filter((log: { action: string }) =>
        log.action.startsWith('release')
      );

      expect(releaseLogs.length).toBeGreaterThan(0);
      for (const log of releaseLogs) {
        expect(typeof log.payload.resource.id).toBe('number');
      }
    });
  });

  describe('entries on a release', () => {
    it('records an entry being added, with the release as resource', async () => {
      const release = await createRelease({ name: 'Add entry', timezone: 'Europe/Paris' });
      const entry = await createEntry('added-entry');
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });
      expect(res.statusCode).toBe(201);
      // The audit data never reaches the response: release stays { id }, as always
      expect(res.body.data.release).toEqual({ id: release.id });

      const log = await expectExactlyOneLog('release.entry.add');
      expect(log.payload).toMatchObject({
        resource: { type: 'release', id: release.id, name: 'Add entry' },
        details: {
          actionType: 'publish',
          entry: { contentType: PRODUCT_UID, documentId: entry.documentId, locale: 'en' },
        },
      });
    });

    it('records one entry per entry added in bulk', async () => {
      const release = await createRelease({ name: 'Bulk add', timezone: 'Europe/Paris' });
      const entries = await Promise.all([
        createEntry('bulk-1'),
        createEntry('bulk-2'),
        createEntry('bulk-3'),
      ]);
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}/actions/bulk`,
        method: 'POST',
        body: entries.map((entry) => releaseAction(entry.documentId)),
      });
      expect(res.statusCode).toBe(201);

      await waitForLog('release.entry.add');
      await sleep(300);
      const logs = await findLogs('release.entry.add');

      expect(logs).toHaveLength(3);
      expect(logs.map((log: any) => log.payload.details.entry.documentId).sort()).toEqual(
        entries.map((entry) => entry.documentId).sort()
      );
    });

    it('records only the entries that were really added', async () => {
      const release = await createRelease({ name: 'Bulk partial', timezone: 'Europe/Paris' });
      const [already, fresh] = await Promise.all([
        createEntry('partial-already'),
        createEntry('partial-fresh'),
      ]);

      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(already.documentId),
      });
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}/actions/bulk`,
        method: 'POST',
        body: [releaseAction(already.documentId), releaseAction(fresh.documentId)],
      });
      expect(res.statusCode).toBe(201);

      const log = await expectExactlyOneLog('release.entry.add');
      expect(log.payload.details.entry.documentId).toBe(fresh.documentId);
    });

    it('records nothing when every entry was already on the release', async () => {
      const release = await createRelease({ name: 'Bulk nothing new', timezone: 'Europe/Paris' });
      const entry = await createEntry('nothing-new');

      await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}/actions/bulk`,
        method: 'POST',
        body: [releaseAction(entry.documentId)],
      });
      expect(res.statusCode).toBe(201);

      await expectNoLog('release.entry.add');
    });

    it('records nothing when an edit changes nothing', async () => {
      const release = await createRelease({ name: 'No-op edit', timezone: 'Europe/Paris' });
      const entry = await createEntry('noop-entry');

      const created = await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId, 'publish'),
      });
      const actionId = created.body.data.id;
      await clearAuditLogs();

      // Resending the current state: same release values, same action type
      await rq({
        url: `/content-releases/${release.id}`,
        method: 'PUT',
        body: { name: 'No-op edit', timezone: 'Europe/Paris' },
      });
      await rq({
        url: `/content-releases/${release.id}/actions/${actionId}`,
        method: 'PUT',
        body: { type: 'publish' },
      });

      await expectNoLog('release.update');
      expect(await findLogs('release.entry.update')).toHaveLength(0);
    });

    it('records an entry switched between publish and unpublish', async () => {
      const release = await createRelease({ name: 'Switch entry', timezone: 'Europe/Paris' });
      const entry = await createEntry('switch-me');

      const created = await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId, 'publish'),
      });
      const actionId = created.body.data.id;
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}/actions/${actionId}`,
        method: 'PUT',
        body: { type: 'unpublish' },
      });
      expect(res.statusCode).toBe(200);
      // The audit data never reaches the response: no release relation, as always
      expect(res.body.data.release).toBeUndefined();

      const log = await expectExactlyOneLog('release.entry.update');
      expect(log.payload.details).toMatchObject({
        actionType: { before: 'publish', after: 'unpublish' },
        entry: { documentId: entry.documentId },
      });
    });

    it('ignores fields the action update contract does not allow', async () => {
      const release = await createRelease({ name: 'Contract entry', timezone: 'Europe/Paris' });
      const [original, smuggled] = await Promise.all([
        createEntry('contract-original'),
        createEntry('contract-smuggled'),
      ]);
      const created = await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(original.documentId),
      });
      const actionId = created.body.data.id;
      await clearAuditLogs();

      // The PUT edits only the type; a smuggled entry id must not retarget the action
      const res = await rq({
        url: `/content-releases/${release.id}/actions/${actionId}`,
        method: 'PUT',
        body: { type: 'unpublish', entryDocumentId: smuggled.documentId },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.entryDocumentId).toBe(original.documentId);

      const log = await expectExactlyOneLog('release.entry.update');
      expect(log.payload.details.entry.documentId).toBe(original.documentId);
    });

    it('records an entry being removed', async () => {
      const release = await createRelease({ name: 'Remove entry', timezone: 'Europe/Paris' });
      const entry = await createEntry('remove-me');

      const created = await rq({
        url: `/content-releases/${release.id}/actions`,
        method: 'POST',
        body: releaseAction(entry.documentId),
      });
      const actionId = created.body.data.id;
      await clearAuditLogs();

      const res = await rq({
        url: `/content-releases/${release.id}/actions/${actionId}`,
        method: 'DELETE',
      });
      expect(res.statusCode).toBe(200);
      // The audit data never reaches the response: no release relation, as always
      expect(res.body.data.release).toBeUndefined();

      const log = await expectExactlyOneLog('release.entry.remove');
      expect(log.payload).toMatchObject({
        resource: { type: 'release', id: release.id, name: 'Remove entry' },
      });
      // The entry alone identifies what was removed
      expect(log.payload.details).toEqual({
        entry: { contentType: PRODUCT_UID, documentId: entry.documentId, locale: 'en' },
      });
    });
  });

  describe('release settings', () => {
    it('records a settings change with its previous value', async () => {
      const res = await rq({
        url: '/content-releases/settings',
        method: 'PUT',
        body: { defaultTimezone: 'Europe/Paris' },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('release.settings.update');
      expect(log.payload).toEqual({
        action: 'release.settings.update',
        date: expect.any(String),
        actor: actingActor(),
        origin: 'admin-panel',
        resource: { type: 'release' },
        details: { changes: { defaultTimezone: { before: null, after: 'Europe/Paris' } } },
      });
      expect(log.user.id).toBe(actingAdminId);
    });

    it('records nothing when the settings do not change', async () => {
      await rq({
        url: '/content-releases/settings',
        method: 'PUT',
        body: { defaultTimezone: 'Europe/Madrid' },
      });
      await clearAuditLogs();

      const res = await rq({
        url: '/content-releases/settings',
        method: 'PUT',
        body: { defaultTimezone: 'Europe/Madrid' },
      });
      expect(res.statusCode).toBe(200);

      await expectNoLog('release.settings.update');
    });
  });
});
