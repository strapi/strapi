/**
 * Pins the runtime shape of the content releases service results that `strapi.db.query` infers as
 * `any`, against the shared contracts `Release` (`shared/contracts/releases.ts`) and
 * `ReleaseAction` (`shared/contracts/release-actions.ts`). A later typing of these results in
 * `packages/core/content-releases/server/src/types/index.ts` relies on what these tests record.
 * The read shapes depend on the caller's populate: each read below is called as a CR controller
 * calls it.
 */
import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const productUID = 'api::product.product';
const componentUID = 'default.feature';
const component = {
  displayName: 'feature',
  category: 'default',
  attributes: {
    label: { type: 'string' },
  },
};
const model = {
  draftAndPublish: true,
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
    feature: { type: 'component', component: componentUID },
  },
};

const MISSING_ID = 999999;
const IN_A_WEEK = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

/** A release row without relations: `Release` minus `actions`, plus `publishedAt` and `locale` */
const releaseRow = (fields: Record<string, unknown> = {}) => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  name: expect.any(String),
  releasedAt: null,
  scheduledAt: null,
  timezone: null,
  status: expect.any(String),
  releaseCondition: 'all_or_nothing',
  totalPublishedEntries: null,
  totalUnpublishedEntries: null,
  totalSkippedEntries: null,
  failureReason: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
  locale: null,
  ...fields,
});

/** An admin user row as `populate: ['createdBy']` reads it: unsanitized, without its roles */
const adminUserRow = (fields: Record<string, unknown> = {}) => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  firstname: expect.any(String),
  lastname: expect.any(String),
  username: null,
  email: expect.any(String),
  password: expect.any(String),
  resetPasswordToken: null,
  resetPasswordTokenExpiresAt: null,
  registrationToken: null,
  isActive: true,
  blocked: false,
  preferedLanguage: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
  locale: null,
  ...fields,
});

/**
 * A release action row without relations: `ReleaseAction` minus `entry`, `release` and `status`,
 * plus `publishedAt`. `locale` is `null` for a content type that isn't localized.
 */
const actionRow = (fields: Record<string, unknown> = {}) => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  type: expect.any(String),
  contentType: productUID,
  entryDocumentId: expect.any(String),
  locale: null,
  isEntryValid: true,
  outcome: null,
  reason: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
  ...fields,
});

/** A product draft as `release-action.findPage` reads it, populated deep */
const productEntry = (fields: Record<string, unknown> = {}) => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  name: expect.any(String),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: null,
  locale: null,
  feature: null,
  createdBy: null,
  updatedBy: null,
  localizations: [],
  strapi_stage: null,
  strapi_assignee: null,
  ...fields,
});

const pagination = (fields: Record<string, unknown> = {}) => ({
  page: 1,
  pageSize: 10,
  pageCount: 1,
  total: expect.any(Number),
  ...fields,
});

describeOnCondition(edition === 'EE')('Content releases service results (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  let user: any;
  const releaseIds: number[] = [];

  const service = (name: 'release' | 'release-action') =>
    strapi.plugin('content-releases').service(name);

  const createProduct = (name: string) => strapi.documents(productUID).create({ data: { name } });

  const createRelease = async (
    name: string,
    schedule?: { scheduledAt: Date; timezone: string }
  ) => {
    const release = await service('release').create(
      { name, scheduledAt: schedule?.scheduledAt ?? null, timezone: schedule?.timezone ?? null },
      { user }
    );
    releaseIds.push(release.id);
    return release;
  };

  /**
   * Deletes the releases created from the `start`-th on. Each block deletes its releases when it is
   * done, so the suite never holds more than 2 pending releases at once, whatever the license limit.
   */
  const deleteReleasesFrom = async (start: number) => {
    for (const id of releaseIds.splice(start)) {
      // Some tests delete their release already
      if (await service('release').findOne(id)) {
        await service('release').delete(id);
      }
    }
  };

  const publishAction = (documentId: string) => ({
    type: 'publish',
    contentType: productUID,
    entryDocumentId: documentId,
  });

  beforeAll(async () => {
    await builder.addComponent(component).addContentTypes([model]).build();
    strapi = await createStrapiInstance();

    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    user = await utils.createUser({
      email: 'release-service-results@test.com',
      firstname: 'Release',
      lastname: 'Results',
      password: 'Password123',
      roles: [superAdminRole.id],
    });
  });

  afterAll(async () => {
    await deleteReleasesFrom(0);
    await strapi.db.query(productUID).deleteMany({});
    await utils.deleteUserById(user.id);
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('release reads', () => {
    let planned: any;
    let scheduled: any;
    let attached: any;

    // `planned` holds 2 publish actions and 1 unpublish action, `scheduled` holds none
    beforeAll(async () => {
      const [a, b, c] = await Promise.all([
        createProduct('A'),
        createProduct('B'),
        createProduct('C'),
      ]);
      attached = a;

      planned = await createRelease('Planned');
      scheduled = await createRelease('Scheduled', {
        scheduledAt: IN_A_WEEK,
        timezone: 'Europe/Paris',
      });
      // One at a time, so the action IDs follow this order
      await service('release-action').create(planned.id, publishAction(a.documentId));
      await service('release-action').create(planned.id, publishAction(b.documentId));
      await service('release-action').create(planned.id, {
        type: 'unpublish',
        contentType: productUID,
        entryDocumentId: c.documentId,
      });
    });

    afterAll(async () => {
      await deleteReleasesFrom(0);
    });

    const plannedRow = () => releaseRow({ id: planned.id, name: 'Planned', status: 'ready' });
    const scheduledRow = () =>
      releaseRow({
        id: scheduled.id,
        name: 'Scheduled',
        status: 'empty',
        scheduledAt: IN_A_WEEK.toISOString(),
        timezone: 'Europe/Paris',
      });

    test('findOne without populate resolves the row without relations', async () => {
      expect(await service('release').findOne(planned.id)).toStrictEqual(plannedRow());
    });

    test('findOne resolves null for a missing release', async () => {
      expect(await service('release').findOne(MISSING_ID)).toBeNull();
    });

    // controllers/release.ts findOne
    test('findOne with populate ["createdBy"] adds the unsanitized admin user row', async () => {
      expect(
        await service('release').findOne(planned.id, { populate: ['createdBy'] })
      ).toStrictEqual({
        ...plannedRow(),
        createdBy: adminUserRow({
          id: user.id,
          firstname: 'Release',
          lastname: 'Results',
          email: 'release-service-results@test.com',
        }),
      });
    });

    // Both branches add `actions: { count }`, whatever the query
    test('findPage without query resolves the rows with their actions count', async () => {
      expect(await service('release').findPage()).toStrictEqual({
        results: [
          { ...plannedRow(), actions: { count: 3 } },
          { ...scheduledRow(), actions: { count: 0 } },
        ],
        pagination: pagination({ total: 2 }),
      });
    });

    // controllers/release.ts findPage, with the admin releases page query
    test('findPage with the admin query resolves the rows with their actions count', async () => {
      expect(
        await service('release').findPage({
          page: 1,
          pageSize: 16,
          sort: 'name:asc',
          filters: { releasedAt: { $notNull: false } },
        })
      ).toStrictEqual({
        results: [
          { ...plannedRow(), actions: { count: 3 } },
          { ...scheduledRow(), actions: { count: 0 } },
        ],
        pagination: pagination({ pageSize: 16, total: 2 }),
      });
    });

    // The `findPageByScheduledAt` branch: unscheduled releases first
    test('findPage sorted by scheduledAt resolves the same row shape', async () => {
      expect(
        await service('release').findPage({ page: 1, pageSize: 16, sort: 'scheduledAt:asc' })
      ).toStrictEqual({
        results: [
          { ...plannedRow(), actions: { count: 3 } },
          { ...scheduledRow(), actions: { count: 0 } },
        ],
        pagination: pagination({ pageSize: 16, total: 2 }),
      });
    });

    // controllers/release.ts findByDocumentAttached, hasEntryAttached=true
    test('findMany with populated action fields adds only those fields and the ids', async () => {
      const filters = {
        contentType: productUID,
        entryDocumentId: attached.documentId,
        locale: null,
      };

      expect(
        await service('release').findMany({
          where: { releasedAt: null, actions: filters },
          populate: { actions: { fields: ['type', 'isEntryValid', 'reason'], filters } },
        })
      ).toStrictEqual([
        {
          ...plannedRow(),
          actions: [
            {
              id: expect.any(Number),
              documentId: expect.any(String),
              type: 'publish',
              isEntryValid: true,
              reason: null,
            },
          ],
        },
      ]);
    });

    // controllers/release.ts findByDocumentAttached, hasEntryAttached=false (both reads)
    test('findMany without populate resolves the rows without relations', async () => {
      const relatedReleases = await service('release').findMany({
        where: {
          releasedAt: null,
          actions: { contentType: productUID, entryDocumentId: attached.documentId, locale: null },
        },
      });
      expect(relatedReleases).toStrictEqual([plannedRow()]);

      expect(
        await service('release').findMany({
          where: {
            $or: [
              { id: { $notIn: relatedReleases.map((release: { id: number }) => release.id) } },
              { actions: null },
            ],
            releasedAt: null,
          },
        })
      ).toStrictEqual([scheduledRow()]);
    });

    // controllers/release.ts mapEntriesToReleases, without its `locale` key: the content type isn't
    // localized
    test('findMany with populate { actions: true } adds every action row', async () => {
      expect(
        await service('release').findMany({
          where: {
            releasedAt: null,
            actions: {
              contentType: productUID,
              entryDocumentId: { $in: [attached.documentId] },
            },
          },
          populate: { actions: true },
        })
      ).toStrictEqual([
        {
          ...plannedRow(),
          actions: [
            actionRow({ type: 'publish' }),
            actionRow({ type: 'publish' }),
            actionRow({ type: 'unpublish' }),
          ],
        },
      ]);
    });

    test('getAllComponents resolves the component schemas by UID', async () => {
      const components = await service('release').getAllComponents();

      expect(Object.keys(components)).toStrictEqual([componentUID]);
      expect(components[componentUID]).toMatchObject({
        uid: componentUID,
        category: 'default',
        modelType: 'component',
        attributes: { label: { type: 'string' } },
      });
    });
  });

  describe('release writes', () => {
    afterEach(async () => {
      await deleteReleasesFrom(0);
    });

    test('update resolves the row without relations', async () => {
      const release = await createRelease('To update');

      expect(
        await service('release').update(
          release.id,
          { name: 'Updated', scheduledAt: null, timezone: null },
          { user }
        )
      ).toStrictEqual(releaseRow({ id: release.id, name: 'Updated', status: 'empty' }));
    });
  });

  describe('release action writes and reads', () => {
    let release: any;

    beforeAll(async () => {
      release = await createRelease('Actions');
    });

    // Keeps `release`, deletes the release a test creates
    afterEach(async () => {
      await deleteReleasesFrom(1);
    });

    test('create resolves the row with release: { id }', async () => {
      const entry = await createProduct('Created');

      expect(
        await service('release-action').create(release.id, publishAction(entry.documentId))
      ).toStrictEqual({
        ...actionRow({ type: 'publish', entryDocumentId: entry.documentId }),
        release: { id: release.id },
      });
    });

    test('createMany resolves the created rows with release: { id } and the skipped count', async () => {
      const [first, second] = await Promise.all([createProduct('First'), createProduct('Second')]);
      const target = await createRelease('Create many');
      await service('release-action').create(target.id, publishAction(first.documentId));

      expect(
        await service('release-action').createMany(target.id, [
          publishAction(first.documentId),
          publishAction(second.documentId),
          publishAction(second.documentId),
        ])
      ).toStrictEqual({
        created: [
          {
            ...actionRow({ type: 'publish', entryDocumentId: second.documentId }),
            release: { id: target.id },
          },
        ],
        alreadyInRelease: 2,
      });
    });

    // controllers/release-action.ts findPage, with the sort the controller sets
    test('findPage resolves the rows with their entry and status', async () => {
      const entry = await createProduct('Paged');
      const target = await createRelease('Paged');
      await service('release-action').create(target.id, publishAction(entry.documentId));

      expect(
        await service('release-action').findPage(target.id, {
          page: 1,
          pageSize: 10,
          sort: 'contentType',
        })
      ).toStrictEqual({
        results: [
          {
            ...actionRow({ type: 'publish', entryDocumentId: entry.documentId }),
            entry: productEntry({ id: entry.id, documentId: entry.documentId, name: 'Paged' }),
            status: 'draft',
          },
        ],
        pagination: pagination({ total: 1 }),
      });
    });

    test('update resolves the row without relations', async () => {
      const entry = await createProduct('Updated action');
      const action = await service('release-action').create(
        release.id,
        publishAction(entry.documentId)
      );

      expect(
        await service('release-action').update(action.id, release.id, { type: 'unpublish' })
      ).toStrictEqual(
        actionRow({ id: action.id, type: 'unpublish', entryDocumentId: entry.documentId })
      );
    });

    test('delete resolves the deleted row without release', async () => {
      const entry = await createProduct('Deleted action');
      const action = await service('release-action').create(
        release.id,
        publishAction(entry.documentId)
      );

      expect(await service('release-action').delete(action.id, release.id)).toStrictEqual(
        actionRow({ id: action.id, type: 'publish', entryDocumentId: entry.documentId })
      );
    });
  });
});
