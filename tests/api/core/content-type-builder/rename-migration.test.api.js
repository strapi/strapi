/**
 * Integration test: renaming a field in the Content-Type Builder generates a
 * migration that preserves the field's data across a restart (instead of
 * schema-sync dropping the old column and creating an empty new one).
 */

'use strict';

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
