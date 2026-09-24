/**
 * Integration test: renaming a field in the Content-Type Builder generates a
 * migration that preserves the field's data across a restart (instead of
 * schema-sync dropping the old column and creating an empty new one).
 */

'use strict';

const fse = require('fs-extra');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

let strapi;
let rq;

const builder = createTestBuilder();

const CT_UID = 'api::rename-test.rename-test';

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const updateSchema = (data) =>
  rq({ method: 'POST', url: '/content-type-builder/update-schema', body: { data } });

const createContentType = () =>
  updateSchema({
    contentTypes: [
      {
        action: 'create',
        uid: CT_UID,
        displayName: 'Rename Test',
        singularName: 'rename-test',
        pluralName: 'rename-tests',
        kind: 'collectionType',
        draftAndPublish: false,
        attributes: [{ action: 'create', name: 'title', properties: { type: 'string' } }],
      },
    ],
    components: [],
  });

const renameAttribute = ({ oldName, newName, extraAttributes = [] }) =>
  updateSchema({
    contentTypes: [
      {
        action: 'update',
        uid: CT_UID,
        displayName: 'Rename Test',
        draftAndPublish: false,
        renames: [{ oldName, newName }],
        attributes: [
          { action: 'update', name: newName, properties: { type: 'string' } },
          ...extraAttributes,
        ],
      },
    ],
    components: [],
  });

const listEntries = (uid = CT_UID) =>
  rq({ method: 'GET', url: `/content-manager/collection-types/${uid}` });

const hasColumn = async (column) => {
  const { tableName } = strapi.db.metadata.get(CT_UID);
  return strapi.db.connection.schema.hasColumn(tableName, column);
};

const listRenameMigrationFiles = () => {
  const migrationsDir = strapi.db.config.settings.migrations.dir;

  if (!fse.existsSync(migrationsDir)) {
    return [];
  }

  return fse.readdirSync(migrationsDir).filter((file) => file.endsWith('.rename-fields.js'));
};

describe('Content Type Builder - rename migration preserves data', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await createContentType();
    await restart();

    // Seed one entry under the original field name.
    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${CT_UID}`,
      body: { title: 'Hello World' },
    });
    expect(created.statusCode).toBe(201);
  });

  afterAll(async () => {
    await updateSchema({ contentTypes: [{ action: 'delete', uid: CT_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renaming a field preserves its data after restart', async () => {
    const res = await renameAttribute({ oldName: 'title', newName: 'heading' });
    expect(res.statusCode).toBe(200);

    await restart();

    // Column was renamed, not dropped/recreated.
    expect(await hasColumn('heading')).toBe(true);
    expect(await hasColumn('title')).toBe(false);

    // Data is preserved and served under the new field name.
    const { statusCode, body } = await listEntries();
    expect(statusCode).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].heading).toBe('Hello World');
  });

  test('rename + re-add: old name re-added as a new (empty) field keeps the renamed data', async () => {
    // heading -> title, and a brand-new "heading" field added in the same save.
    const res = await renameAttribute({
      oldName: 'heading',
      newName: 'title',
      extraAttributes: [{ action: 'create', name: 'heading', properties: { type: 'string' } }],
    });
    expect(res.statusCode).toBe(200);

    await restart();

    expect(await hasColumn('title')).toBe(true);
    expect(await hasColumn('heading')).toBe(true);

    const { body } = await listEntries();
    expect(body.results).toHaveLength(1);
    // Data followed the rename back to "title"; the new "heading" is empty.
    expect(body.results[0].title).toBe('Hello World');
    expect(body.results[0].heading ?? null).toBeNull();
  });
});

describe('Content Type Builder - localized draft rename preserves data', () => {
  const LOCALIZED_UID = 'api::localized-rename.localized-rename';
  let documentId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdType = await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: LOCALIZED_UID,
          displayName: 'Localized Rename',
          singularName: 'localized-rename',
          pluralName: 'localized-renames',
          kind: 'collectionType',
          draftAndPublish: true,
          pluginOptions: { i18n: { localized: true } },
          attributes: [
            {
              action: 'create',
              name: 'title',
              properties: {
                type: 'string',
                pluginOptions: { i18n: { localized: true } },
              },
            },
          ],
        },
      ],
      components: [],
    });
    expect(createdType.statusCode).toBe(200);
    await restart();

    const createdDocument = await strapi.documents(LOCALIZED_UID).create({
      locale: 'en',
      data: { title: 'Localized draft' },
    });
    documentId = createdDocument.documentId;
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [{ action: 'delete', uid: LOCALIZED_UID }],
      components: [],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renaming a localized field preserves draft data after restart', async () => {
    const renamed = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: LOCALIZED_UID,
          displayName: 'Localized Rename',
          draftAndPublish: true,
          pluginOptions: { i18n: { localized: true } },
          renames: [{ oldName: 'title', newName: 'heading' }],
          attributes: [
            {
              action: 'update',
              name: 'heading',
              properties: {
                type: 'string',
                pluginOptions: { i18n: { localized: true } },
              },
            },
          ],
        },
      ],
      components: [],
    });
    expect(renamed.statusCode).toBe(200);

    await restart();

    const document = await strapi.documents(LOCALIZED_UID).findOne({
      documentId,
      locale: 'en',
      status: 'draft',
    });
    expect(document.heading).toBe('Localized draft');
  });
});

describe('Content Type Builder - swap migration preserves data', () => {
  const SWAP_CT_UID = 'api::swap-test.swap-test';

  const restartSwap = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: SWAP_CT_UID,
          displayName: 'Swap Test',
          singularName: 'swap-test',
          pluralName: 'swap-tests',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'fieldA', properties: { type: 'string' } },
            { action: 'create', name: 'fieldB', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    await restartSwap();

    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${SWAP_CT_UID}`,
      body: { fieldA: 'Value A', fieldB: 'Value B' },
    });
    expect(created.statusCode).toBe(201);
  });

  afterAll(async () => {
    await updateSchema({ contentTypes: [{ action: 'delete', uid: SWAP_CT_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('swapping two field names in one save preserves both values', async () => {
    // A swap is performed in the CTB by routing through an intermediate name (the
    // CTB forbids two fields sharing a name). The admin records that exact path
    // and the migration replays it verbatim — no synthetic temp column.
    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: SWAP_CT_UID,
          displayName: 'Swap Test',
          draftAndPublish: false,
          renames: [
            { oldName: 'fieldA', newName: 'tmpField' },
            { oldName: 'fieldB', newName: 'fieldA' },
            { oldName: 'tmpField', newName: 'fieldB' },
          ],
          attributes: [
            { action: 'update', name: 'fieldB', properties: { type: 'string' } },
            { action: 'update', name: 'fieldA', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restartSwap();

    const { tableName } = strapi.db.metadata.get(SWAP_CT_UID);
    expect(await strapi.db.connection.schema.hasColumn(tableName, 'field_a')).toBe(true);
    expect(await strapi.db.connection.schema.hasColumn(tableName, 'field_b')).toBe(true);

    const { statusCode, body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${SWAP_CT_UID}`,
    });
    expect(statusCode).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].fieldA).toBe('Value B');
    expect(body.results[0].fieldB).toBe('Value A');
  });
});

describe('Content Type Builder - ordered name reuse preserves data', () => {
  const REUSE_UID = 'api::ordered-reuse.ordered-reuse';

  const restartReuse = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: REUSE_UID,
          displayName: 'Ordered Reuse',
          singularName: 'ordered-reuse',
          pluralName: 'ordered-reuses',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'fieldA', properties: { type: 'string' } },
            { action: 'create', name: 'fieldB', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    await restartReuse();

    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${REUSE_UID}`,
      body: { fieldA: 'Value A', fieldB: 'Value B' },
    });
    expect(created.statusCode).toBe(201);
  });

  afterAll(async () => {
    await updateSchema({ contentTypes: [{ action: 'delete', uid: REUSE_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('replays A -> C, B -> A, A -> B in order and preserves both values', async () => {
    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: REUSE_UID,
          displayName: 'Ordered Reuse',
          draftAndPublish: false,
          renames: [
            { oldName: 'fieldA', newName: 'fieldC' },
            { oldName: 'fieldB', newName: 'fieldA' },
            { oldName: 'fieldA', newName: 'fieldB' },
          ],
          attributes: [
            { action: 'update', name: 'fieldB', properties: { type: 'string' } },
            { action: 'update', name: 'fieldC', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restartReuse();

    const { statusCode, body } = await listEntries(REUSE_UID);
    expect(statusCode).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].fieldB).toBe('Value B');
    expect(body.results[0].fieldC).toBe('Value A');
    expect(body.results[0].fieldA).toBeUndefined();
  });
});

describe('Content Type Builder - relation rename preserves data', () => {
  const TAG_UID = 'api::reltag.reltag';
  const OWNER_UID = 'api::relowner.relowner';

  const restartRel = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  let tagDocId;
  let ownerDocId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: TAG_UID,
          displayName: 'Rel Tag',
          singularName: 'reltag',
          pluralName: 'reltags',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [{ action: 'create', name: 'name', properties: { type: 'string' } }],
        },
        {
          action: 'create',
          uid: OWNER_UID,
          displayName: 'Rel Owner',
          singularName: 'relowner',
          pluralName: 'relowners',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'name', properties: { type: 'string' } },
            {
              action: 'create',
              name: 'tags',
              properties: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
            },
          ],
        },
      ],
      components: [],
    });
    await restartRel();

    const tag = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}`,
      body: { name: 'Tech' },
    });
    expect(tag.statusCode).toBe(201);
    tagDocId = tag.body.data.documentId;

    const owner = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${OWNER_UID}`,
      body: { name: 'Article', tags: [tagDocId] },
    });
    expect(owner.statusCode).toBe(201);
    ownerDocId = owner.body.data.documentId;
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [
        { action: 'delete', uid: OWNER_UID },
        { action: 'delete', uid: TAG_UID },
      ],
      components: [],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renaming a many-to-many relation field preserves the linked records', async () => {
    const oldJoinTable = strapi.db.metadata.get(OWNER_UID).attributes.tags.joinTable.name;
    expect(await strapi.db.connection.schema.hasTable(oldJoinTable)).toBe(true);
    expect(await strapi.db.connection(oldJoinTable).count()).toBeDefined();

    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: OWNER_UID,
          displayName: 'Rel Owner',
          draftAndPublish: false,
          renames: [{ oldName: 'tags', newName: 'labels' }],
          attributes: [
            { action: 'update', name: 'name', properties: { type: 'string' } },
            {
              action: 'update',
              name: 'labels',
              properties: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
            },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restartRel();

    const newJoinTable = strapi.db.metadata.get(OWNER_UID).attributes.labels.joinTable.name;
    expect(newJoinTable).not.toBe(oldJoinTable);
    // The join table was renamed (data carried over), not dropped + recreated empty.
    expect(await strapi.db.connection.schema.hasTable(newJoinTable)).toBe(true);
    expect(await strapi.db.connection.schema.hasTable(oldJoinTable)).toBe(false);

    const rows = await strapi.db.connection(newJoinTable).select('*');
    expect(rows).toHaveLength(1);

    // And the relation still resolves under the new field name (the content
    // manager returns relations as a `{ count }` summary in the detail view).
    const { statusCode, body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${OWNER_UID}/${ownerDocId}`,
    });
    expect(statusCode).toBe(200);
    expect(body.data.labels.count).toBe(1);
  });
});

describe('Content Type Builder - component rename preserves data', () => {
  const COMP_UID = 'default.rename-box';
  const HOST_UID = 'api::cmphost.cmphost';

  const restartCmp = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  let hostDocId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      components: [
        {
          action: 'create',
          uid: COMP_UID,
          category: 'default',
          displayName: 'Rename Box',
          icon: 'apps',
          attributes: [{ action: 'create', name: 'label', properties: { type: 'string' } }],
        },
      ],
      contentTypes: [
        {
          action: 'create',
          uid: HOST_UID,
          displayName: 'Cmp Host',
          singularName: 'cmphost',
          pluralName: 'cmphosts',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            {
              action: 'create',
              name: 'box',
              properties: { type: 'component', component: COMP_UID, repeatable: false },
            },
          ],
        },
      ],
    });
    await restartCmp();

    const host = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${HOST_UID}`,
      body: { box: { label: 'Hello' } },
    });
    expect(host.statusCode).toBe(201);
    hostDocId = host.body.data.documentId;
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [{ action: 'delete', uid: HOST_UID }],
      components: [{ action: 'delete', uid: COMP_UID }],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renaming a component field preserves the embedded component data', async () => {
    const linkTable = strapi.db.metadata.get(HOST_UID).attributes.box.joinTable.name;
    expect(await strapi.db.connection(linkTable).where('field', 'box').count()).toBeDefined();

    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: HOST_UID,
          displayName: 'Cmp Host',
          draftAndPublish: false,
          renames: [{ oldName: 'box', newName: 'panel' }],
          attributes: [
            {
              action: 'update',
              name: 'panel',
              properties: { type: 'component', component: COMP_UID, repeatable: false },
            },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restartCmp();

    // The link row's `field` value was updated from `box` to `panel`.
    const newLinkTable = strapi.db.metadata.get(HOST_UID).attributes.panel.joinTable.name;
    const panelRows = await strapi.db.connection(newLinkTable).where('field', 'panel').select('*');
    expect(panelRows).toHaveLength(1);
    const boxRows = await strapi.db.connection(newLinkTable).where('field', 'box').select('*');
    expect(boxRows).toHaveLength(0);

    // And the embedded component data is still served under the new field name.
    const { statusCode, body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${HOST_UID}/${hostDocId}`,
      qs: { populate: ['panel'] },
    });
    expect(statusCode).toBe(200);
    expect(body.data.panel.label).toBe('Hello');
  });

  test('renaming a field inside the component preserves the embedded value', async () => {
    // Rename `label -> title` on the component itself (a scalar column on the
    // component's own table, shared across every type that embeds it).
    const res = await updateSchema({
      contentTypes: [],
      components: [
        {
          action: 'update',
          uid: COMP_UID,
          category: 'default',
          displayName: 'Rename Box',
          icon: 'apps',
          renames: [{ oldName: 'label', newName: 'title' }],
          attributes: [{ action: 'update', name: 'title', properties: { type: 'string' } }],
        },
      ],
    });
    expect(res.statusCode).toBe(200);

    await restartCmp();

    const { statusCode, body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${HOST_UID}/${hostDocId}`,
    });
    expect(statusCode).toBe(200);
    // The value followed the column rename inside the component.
    expect(body.data.panel.title).toBe('Hello');
    expect(body.data.panel.label ?? null).toBeNull();
  });
});

describe('Content Type Builder - media rename preserves data', () => {
  const MEDIA_HOST_UID = 'api::media-host.media-host';

  const restartMedia = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  let hostDocId;
  let fileId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: MEDIA_HOST_UID,
          displayName: 'Media Host',
          singularName: 'media-host',
          pluralName: 'media-hosts',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'cover', properties: { type: 'media', multiple: false } },
          ],
        },
      ],
      components: [],
    });
    await restartMedia();

    // Seed a file row directly (no real upload needed) and link it via the media field.
    const file = await strapi.db.query('plugin::upload.file').create({
      data: {
        name: 'pic.png',
        hash: 'pic_hash',
        ext: '.png',
        mime: 'image/png',
        size: 1,
        url: '/uploads/pic.png',
        provider: 'local',
        folderPath: '/',
      },
    });
    fileId = file.id;

    const host = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${MEDIA_HOST_UID}`,
      body: { cover: fileId },
    });
    expect(host.statusCode).toBe(201);
    hostDocId = host.body.data.documentId;
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [{ action: 'delete', uid: MEDIA_HOST_UID }],
      components: [],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renaming a media field preserves the linked file (scoped by related_type)', async () => {
    const morphTable =
      strapi.db.metadata.get('plugin::upload.file').attributes.related.joinTable.name;
    const before = await strapi.db.connection(morphTable).where('field', 'cover').select('*');
    expect(before.length).toBeGreaterThanOrEqual(1);

    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: MEDIA_HOST_UID,
          displayName: 'Media Host',
          draftAndPublish: false,
          renames: [{ oldName: 'cover', newName: 'photo' }],
          attributes: [
            { action: 'update', name: 'photo', properties: { type: 'media', multiple: false } },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    await restartMedia();

    // The morph row's `field` value was migrated from `cover` to `photo`.
    const photoRows = await strapi.db.connection(morphTable).where('field', 'photo').select('*');
    expect(photoRows).toHaveLength(1);
    const coverRows = await strapi.db.connection(morphTable).where('field', 'cover').select('*');
    expect(coverRows).toHaveLength(0);

    // And the file still resolves under the new field name.
    const { statusCode, body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${MEDIA_HOST_UID}/${hostDocId}`,
    });
    expect(statusCode).toBe(200);
    expect(body.data.photo).toBeTruthy();
    expect(body.data.photo.id).toBe(fileId);
  });
});

describe('Content Type Builder - delete-then-reuse-name guard', () => {
  const EDGE_UID = 'api::edge-test.edge-test';

  const restartEdge = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: EDGE_UID,
          displayName: 'Edge Test',
          singularName: 'edge-test',
          pluralName: 'edge-tests',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'alpha', properties: { type: 'string' } },
            { action: 'create', name: 'beta', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    await restartEdge();

    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${EDGE_UID}`,
      body: { alpha: 'A', beta: 'B' },
    });
    expect(created.statusCode).toBe(201);
  });

  afterAll(async () => {
    await updateSchema({ contentTypes: [{ action: 'delete', uid: EDGE_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('rejects deleting a field and reusing its name for a rename in the same save', async () => {
    // Delete `beta` while renaming `alpha -> beta` in one save. The old `beta`
    // column still physically exists at migration time (the drop is deferred to
    // schema-sync), so renaming `alpha -> beta` would collide. Strapi's
    // unique-attribute-name validation rejects this up front, so no migration
    // ever runs and there is no data-loss path. (The supported flow is two
    // saves: delete `beta`, then rename `alpha -> beta`.)
    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: EDGE_UID,
          displayName: 'Edge Test',
          draftAndPublish: false,
          renames: [{ oldName: 'alpha', newName: 'beta' }],
          attributes: [
            { action: 'delete', name: 'beta' },
            { action: 'update', name: 'beta', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(400);

    // Data is untouched: both original fields still resolve after a restart.
    await restartEdge();
    const { body } = await listEntries(EDGE_UID);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].alpha).toBe('A');
    expect(body.results[0].beta).toBe('B');
  });
});

describe('Content Type Builder - target-occupied guard', () => {
  const OCCUPIED_UID = 'api::occupied-test.occupied-test';

  const restartOccupied = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: OCCUPIED_UID,
          displayName: 'Occupied Test',
          singularName: 'occupied-test',
          pluralName: 'occupied-tests',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'title', properties: { type: 'string' } },
            { action: 'create', name: 'body', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    await restartOccupied();

    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${OCCUPIED_UID}`,
      body: { title: 'T', body: 'B' },
    });
    expect(created.statusCode).toBe(201);
  });

  afterAll(async () => {
    await updateSchema({ contentTypes: [{ action: 'delete', uid: OCCUPIED_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('refuses a hop whose target field still exists instead of writing a migration', async () => {
    // A truncated chain: only `tmp -> title` of a swap reaches the server while
    // `title` is still live. Replaying it would collide with the existing
    // column (schema-sync drops it only after migrations), so the builder
    // refuses the hop and logs a warning; no `rename-fields` file is written.
    const warn = jest.spyOn(strapi.log, 'warn');
    const migrationFilesBefore = listRenameMigrationFiles();

    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: OCCUPIED_UID,
          displayName: 'Occupied Test',
          draftAndPublish: false,
          renames: [{ oldName: 'tmp', newName: 'title' }],
          attributes: [
            { action: 'update', name: 'title', properties: { type: 'string' } },
            { action: 'update', name: 'body', properties: { type: 'string' } },
          ],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('the target field still exists in the current schema')
    );
    expect(listRenameMigrationFiles()).toEqual(migrationFilesBefore);
    warn.mockRestore();

    // `title` keeps its data after the reload.
    await restartOccupied();
    const { body } = await listEntries(OCCUPIED_UID);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].title).toBe('T');
    expect(body.results[0].body).toBe('B');
  });
});

describe('Content Type Builder - rename migrations disabled', () => {
  const NEVER_UID = 'api::never-rename.never-rename';

  const restartNever = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: NEVER_UID,
          displayName: 'Never Rename',
          singularName: 'never-rename',
          pluralName: 'never-renames',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [{ action: 'create', name: 'title', properties: { type: 'string' } }],
        },
      ],
      components: [],
    });
    await restartNever();

    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${NEVER_UID}`,
      body: { title: 'Legacy data' },
    });
    expect(created.statusCode).toBe(201);
  });

  afterAll(async () => {
    await updateSchema({ contentTypes: [{ action: 'delete', uid: NEVER_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test("keeps legacy drop-and-recreate behavior when renameMigrations is 'never'", async () => {
    // The CTB schema service reads the plugin config at save time, so setting the
    // loaded test app's config here exercises the real `never` branch.
    strapi.config.set(['plugin::content-type-builder', 'renameMigrations', 'attributes'], 'never');
    expect(strapi.plugin('content-type-builder').config('renameMigrations.attributes')).toBe(
      'never'
    );
    const migrationFilesBefore = listRenameMigrationFiles();

    const res = await updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: NEVER_UID,
          displayName: 'Never Rename',
          draftAndPublish: false,
          renames: [{ oldName: 'title', newName: 'heading' }],
          attributes: [{ action: 'update', name: 'heading', properties: { type: 'string' } }],
        },
      ],
      components: [],
    });
    expect(res.statusCode).toBe(200);
    expect(listRenameMigrationFiles()).toEqual(migrationFilesBefore);

    await restartNever();

    const { tableName } = strapi.db.metadata.get(NEVER_UID);
    expect(await strapi.db.connection.schema.hasColumn(tableName, 'heading')).toBe(true);
    expect(await strapi.db.connection.schema.hasColumn(tableName, 'title')).toBe(false);

    const { statusCode, body } = await listEntries(NEVER_UID);
    expect(statusCode).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].heading ?? null).toBeNull();
  });
});

describe('Content Type Builder - bidirectional relation renames keep their links', () => {
  // Renaming either side of a bidirectional relation must keep the owning side
  // (and therefore the join table) where it is. Renaming the inverse side used
  // to make it the owner, so sync created a new, empty join table.
  const CAT_UID = 'api::bicat.bicat';
  const ART_UID = 'api::biart.biart';

  const relation = (relationType, target, targetAttribute) => ({
    type: 'relation',
    relation: relationType,
    target,
    targetAttribute,
  });

  // Current attribute names, updated as the tests rename them.
  const names = {
    cats: 'cats',
    arts: 'arts',
    related: 'related',
    relatedBy: 'relatedBy',
    lead: 'lead',
    leadArts: 'leadArts',
    feature: 'feature',
    featuredIn: 'featuredIn',
  };

  const artAttributes = (action = 'update') => [
    { action, name: 'name', properties: { type: 'string' } },
    { action, name: names.cats, properties: relation('manyToMany', CAT_UID, names.arts) },
    { action, name: names.lead, properties: relation('manyToOne', CAT_UID, names.leadArts) },
    { action, name: names.feature, properties: relation('oneToOne', CAT_UID, names.featuredIn) },
    { action, name: names.related, properties: relation('manyToMany', ART_UID, names.relatedBy) },
    { action, name: names.relatedBy, properties: relation('manyToMany', ART_UID, names.related) },
  ];

  const catAttributes = () => [
    { action: 'update', name: 'name', properties: { type: 'string' } },
    { action: 'update', name: names.arts, properties: relation('manyToMany', ART_UID, names.cats) },
    {
      action: 'update',
      name: names.leadArts,
      properties: relation('oneToMany', ART_UID, names.lead),
    },
    {
      action: 'update',
      name: names.featuredIn,
      properties: relation('oneToOne', ART_UID, names.feature),
    },
  ];

  const updateArt = (renames) =>
    updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: ART_UID,
          displayName: 'Bi Art',
          draftAndPublish: false,
          renames,
          attributes: artAttributes(),
        },
      ],
      components: [],
    });

  const updateCat = (renames) =>
    updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: CAT_UID,
          displayName: 'Bi Cat',
          draftAndPublish: false,
          renames,
          attributes: catAttributes(),
        },
      ],
      components: [],
    });

  const findOne = (uid, documentId, populate) =>
    strapi.documents(uid).findOne({ documentId, populate });

  const joinTableOf = (uid, attribute) =>
    strapi.db.metadata.get(uid).attributes[attribute].joinTable.name;

  let catDocId;
  let firstArtDocId;
  let secondArtDocId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: CAT_UID,
          displayName: 'Bi Cat',
          singularName: 'bicat',
          pluralName: 'bicats',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [{ action: 'create', name: 'name', properties: { type: 'string' } }],
        },
        {
          action: 'create',
          uid: ART_UID,
          displayName: 'Bi Art',
          singularName: 'biart',
          pluralName: 'biarts',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: artAttributes('create'),
        },
      ],
      components: [],
    });
    await restart();

    const cat = await strapi.documents(CAT_UID).create({ data: { name: 'Cat' } });
    catDocId = cat.documentId;

    const first = await strapi.documents(ART_UID).create({
      data: { name: 'First', cats: [catDocId], lead: catDocId, feature: catDocId },
    });
    firstArtDocId = first.documentId;

    const second = await strapi.documents(ART_UID).create({
      data: { name: 'Second', related: [firstArtDocId] },
    });
    secondArtDocId = second.documentId;
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [
        { action: 'delete', uid: ART_UID },
        { action: 'delete', uid: CAT_UID },
      ],
      components: [],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renaming the owning side of a many-to-many keeps the links', async () => {
    names.cats = 'categories';
    const res = await updateArt([{ oldName: 'cats', newName: 'categories' }]);
    expect(res.statusCode).toBe(200);

    await restart();

    expect(strapi.contentTypes[ART_UID].attributes.categories).toMatchObject({
      inversedBy: 'arts',
    });
    const art = await findOne(ART_UID, firstArtDocId, ['categories']);
    expect(art.categories.map((c) => c.documentId)).toEqual([catDocId]);
    const cat = await findOne(CAT_UID, catDocId, ['arts']);
    expect(cat.arts.map((a) => a.documentId)).toEqual([firstArtDocId]);
  });

  test('renaming the inverse side of a many-to-many keeps it inverse and keeps the links', async () => {
    const joinTable = joinTableOf(ART_UID, 'categories');

    names.arts = 'articles';
    const res = await updateCat([{ oldName: 'arts', newName: 'articles' }]);
    expect(res.statusCode).toBe(200);

    await restart();

    expect(strapi.contentTypes[CAT_UID].attributes.articles).toMatchObject({
      mappedBy: 'categories',
    });
    expect(strapi.contentTypes[CAT_UID].attributes.articles).not.toHaveProperty('inversedBy');
    expect(strapi.contentTypes[ART_UID].attributes.categories).toMatchObject({
      inversedBy: 'articles',
    });
    // Still owned by the article side: same join table.
    expect(joinTableOf(ART_UID, 'categories')).toBe(joinTable);

    const cat = await findOne(CAT_UID, catDocId, ['articles']);
    expect(cat.articles.map((a) => a.documentId)).toEqual([firstArtDocId]);
    const art = await findOne(ART_UID, firstArtDocId, ['categories']);
    expect(art.categories.map((c) => c.documentId)).toEqual([catDocId]);
  });

  test('renaming a side of a self-referencing many-to-many keeps the links', async () => {
    names.related = 'linked';
    const res = await updateArt([{ oldName: 'related', newName: 'linked' }]);
    expect(res.statusCode).toBe(200);

    await restart();

    const second = await findOne(ART_UID, secondArtDocId, ['linked']);
    expect(second.linked.map((a) => a.documentId)).toEqual([firstArtDocId]);
    const first = await findOne(ART_UID, firstArtDocId, ['relatedBy']);
    expect(first.relatedBy.map((a) => a.documentId)).toEqual([secondArtDocId]);
  });

  test('renaming many-to-one and one-to-one owners keeps the links', async () => {
    names.lead = 'mainCat';
    names.feature = 'highlight';
    const res = await updateArt([
      { oldName: 'lead', newName: 'mainCat' },
      { oldName: 'feature', newName: 'highlight' },
    ]);
    expect(res.statusCode).toBe(200);

    await restart();

    const art = await findOne(ART_UID, firstArtDocId, ['mainCat', 'highlight']);
    expect(art.mainCat.documentId).toBe(catDocId);
    expect(art.highlight.documentId).toBe(catDocId);

    const cat = await findOne(CAT_UID, catDocId, ['leadArts', 'featuredIn']);
    expect(cat.leadArts.map((a) => a.documentId)).toEqual([firstArtDocId]);
    expect(cat.featuredIn.documentId).toBe(firstArtDocId);
  });
});

describe('Content Type Builder - relation renames that reuse a join table name', () => {
  // A renamed join table used to keep indexes named after its old name on
  // SQLite/MySQL (and the FK index on Postgres). Creating a table with the old
  // name again then failed on every boot with "index … already exists".
  const TAG_UID = 'api::reusetag.reusetag';
  const OWNER_UID = 'api::reuseowner.reuseowner';

  const m2m = { type: 'relation', relation: 'manyToMany', target: TAG_UID };

  const updateOwner = ({ renames, attributes }) =>
    updateSchema({
      contentTypes: [
        {
          action: 'update',
          uid: OWNER_UID,
          displayName: 'Reuse Owner',
          draftAndPublish: false,
          renames,
          attributes: [
            { action: 'update', name: 'name', properties: { type: 'string' } },
            ...attributes,
          ],
        },
      ],
      components: [],
    });

  const linkedTags = async (documentId, attribute) => {
    const owner = await strapi.documents(OWNER_UID).findOne({ documentId, populate: [attribute] });
    return owner[attribute].map((tag) => tag.name).sort();
  };

  let ownerDocId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: TAG_UID,
          displayName: 'Reuse Tag',
          singularName: 'reusetag',
          pluralName: 'reusetags',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [{ action: 'create', name: 'name', properties: { type: 'string' } }],
        },
        {
          action: 'create',
          uid: OWNER_UID,
          displayName: 'Reuse Owner',
          singularName: 'reuseowner',
          pluralName: 'reuseowners',
          kind: 'collectionType',
          draftAndPublish: false,
          attributes: [
            { action: 'create', name: 'name', properties: { type: 'string' } },
            { action: 'create', name: 'first', properties: m2m },
            { action: 'create', name: 'second', properties: m2m },
          ],
        },
      ],
      components: [],
    });
    await restart();

    const red = await strapi.documents(TAG_UID).create({ data: { name: 'red' } });
    const blue = await strapi.documents(TAG_UID).create({ data: { name: 'blue' } });
    const owner = await strapi.documents(OWNER_UID).create({
      data: { name: 'Owner', first: [red.documentId], second: [blue.documentId] },
    });
    ownerDocId = owner.documentId;
  });

  afterAll(async () => {
    await updateSchema({
      contentTypes: [
        { action: 'delete', uid: OWNER_UID },
        { action: 'delete', uid: TAG_UID },
      ],
      components: [],
    });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('swapping two relations in one save survives two restarts', async () => {
    const res = await updateOwner({
      renames: [
        { oldName: 'first', newName: 'tmp' },
        { oldName: 'second', newName: 'first' },
        { oldName: 'tmp', newName: 'second' },
      ],
      attributes: [
        { action: 'update', name: 'first', properties: m2m },
        { action: 'update', name: 'second', properties: m2m },
      ],
    });
    expect(res.statusCode).toBe(200);

    await restart();
    // The second boot is where stale index names used to crash.
    await restart();

    expect(await linkedTags(ownerDocId, 'first')).toEqual(['blue']);
    expect(await linkedTags(ownerDocId, 'second')).toEqual(['red']);
  });

  test('renaming a relation, then re-adding its old name in a second save, survives two restarts', async () => {
    const renamed = await updateOwner({
      renames: [{ oldName: 'first', newName: 'third' }],
      attributes: [
        { action: 'update', name: 'third', properties: m2m },
        { action: 'update', name: 'second', properties: m2m },
      ],
    });
    expect(renamed.statusCode).toBe(200);
    await restart();

    const readded = await updateOwner({
      renames: [],
      attributes: [
        { action: 'update', name: 'third', properties: m2m },
        { action: 'update', name: 'second', properties: m2m },
        { action: 'create', name: 'first', properties: m2m },
      ],
    });
    expect(readded.statusCode).toBe(200);

    await restart();
    await restart();

    expect(await linkedTags(ownerDocId, 'third')).toEqual(['blue']);
    expect(await linkedTags(ownerDocId, 'first')).toEqual([]);
  });
});

describe('Content Type Builder - rename:field service', () => {
  // `strapi rename:field` calls this service; it rebuilds the update payload from
  // the formatted schema, so the payload must pass the admin's validation.
  const CLI_UID = 'api::cli-rename.cli-rename';

  const renameField = (oldName, newName) =>
    strapi
      .plugin('content-type-builder')
      .service('schema')
      .renameAttribute(CLI_UID, oldName, newName);

  let docId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await updateSchema({
      contentTypes: [
        {
          action: 'create',
          uid: CLI_UID,
          displayName: 'Cli Rename',
          singularName: 'cli-rename',
          pluralName: 'cli-renames',
          kind: 'collectionType',
          draftAndPublish: true,
          attributes: [
            { action: 'create', name: 'title', properties: { type: 'string', required: true } },
            {
              action: 'create',
              name: 'kind',
              properties: { type: 'enumeration', enum: ['a', 'b'], default: 'a' },
            },
            {
              action: 'create',
              name: 'parent',
              properties: {
                type: 'relation',
                relation: 'manyToOne',
                target: CLI_UID,
                targetAttribute: 'children',
              },
            },
          ],
        },
      ],
      components: [],
    });
    await restart();

    const entry = await strapi.documents(CLI_UID).create({ data: { title: 'Hello' } });
    docId = entry.documentId;
  });

  afterAll(async () => {
    strapi.config.set(
      ['plugin::content-type-builder', 'renameMigrations', 'attributes'],
      'prompt-before-save'
    );
    await updateSchema({ contentTypes: [{ action: 'delete', uid: CLI_UID }], components: [] });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('renames a field and writes the migration', async () => {
    await renameField('title', 'heading');

    await restart();

    const entry = await strapi.documents(CLI_UID).findOne({ documentId: docId });
    expect(entry.heading).toBe('Hello');
    expect(strapi.contentTypes[CLI_UID].attributes.parent).toMatchObject({
      inversedBy: 'children',
    });
  });

  test('refuses system attributes and disabled rename migrations before touching the schema', async () => {
    const files = listRenameMigrationFiles();

    await expect(renameField('publishedAt', 'releasedAt')).rejects.toThrow();

    strapi.config.set(['plugin::content-type-builder', 'renameMigrations', 'attributes'], 'never');
    await expect(renameField('heading', 'headline')).rejects.toThrow(/never/);

    expect(listRenameMigrationFiles()).toEqual(files);
    expect(strapi.contentTypes[CLI_UID].attributes).toHaveProperty('heading');
  });
});
