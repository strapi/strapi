/**
 * Publishing (or discarding) an entry re-points the unidirectional relations that target it.
 * For relations held by components, the document service first resolves which entry owns each
 * component instance, and only propagates the relation when that owner has no draft & publish.
 *
 * A component reused across many content types (e.g. a "link" block in dynamic zones) makes that
 * ownership lookup the dominant cost of a publish. This suite checks the outcome for every kind of
 * owner, and that the number of lookup queries depends on the schema, not on the amount of content.
 */
import type { Core } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const TARGET_UID = 'api::target.target';
const LINK_UID = 'default.link';
const CARD_UID = 'default.card';

const HOSTS = [
  { name: 'dp-host-a', draftAndPublish: true },
  { name: 'dp-host-b', draftAndPublish: true },
  { name: 'plain-host-a', draftAndPublish: false },
  { name: 'plain-host-b', draftAndPublish: false },
];

const hostUid = (name: string) => `api::${name}.${name}` as any;

const targetModel = {
  kind: 'collectionType',
  singularName: 'target',
  pluralName: 'targets',
  displayName: 'Target',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
  },
};

const linkComponent = {
  displayName: 'link',
  attributes: {
    label: { type: 'string' },
    target: { type: 'relation', relation: 'oneToOne', target: TARGET_UID },
  },
};

const cardComponent = {
  displayName: 'card',
  attributes: {
    title: { type: 'string' },
    link: { type: 'component', component: LINK_UID },
  },
};

const hostModels = HOSTS.map(({ name, draftAndPublish }) => ({
  kind: 'collectionType',
  singularName: name,
  pluralName: `${name}s`,
  displayName: name,
  draftAndPublish,
  attributes: {
    name: { type: 'string' },
    blocks: { type: 'dynamiczone', components: [LINK_UID, CARD_UID] },
  },
}));

const populateBlocks = {
  blocks: {
    on: {
      [LINK_UID]: { fields: ['label'] },
      [CARD_UID]: { populate: { link: { fields: ['label'] } } },
    },
  },
};

/**
 * Link instances created so far, keyed by whether their owning entry has draft & publish.
 * Only the draft versions matter: those are the ones linked to the draft target.
 */
const linkIds = { draftAndPublishOwner: [] as number[], plainOwner: [] as number[], orphan: 0 };

const createHostEntries = async (count: number, targetDocumentId: string) => {
  for (const { name, draftAndPublish } of HOSTS) {
    for (let i = 0; i < count; i += 1) {
      const entry: any = await strapi.documents(hostUid(name)).create({
        data: {
          name: `${name}-${i}`,
          blocks: [
            {
              __component: LINK_UID,
              label: 'direct',
              target: { documentId: targetDocumentId },
            },
            {
              __component: CARD_UID,
              title: 'card',
              link: { label: 'nested', target: { documentId: targetDocumentId } },
            },
          ],
        } as any,
        populate: populateBlocks as any,
      });

      const [direct, card] = entry.blocks;
      const bucket = draftAndPublish ? linkIds.draftAndPublishOwner : linkIds.plainOwner;
      bucket.push(direct.id, card.link.id);
    }
  }
};

const getLinkJoinTable = () => {
  const { joinTable } = strapi.db.metadata.get(LINK_UID).attributes.target as any;
  return {
    name: joinTable.name as string,
    linkColumn: joinTable.joinColumn.name as string,
    targetColumn: joinTable.inverseJoinColumn.name as string,
  };
};

const getLinksTargeting = async (targetId: number) => {
  const { name, linkColumn, targetColumn } = getLinkJoinTable();
  const rows = await strapi.db.connection(name).select(linkColumn).where(targetColumn, targetId);
  return rows.map((row) => row[linkColumn]).sort((a, b) => a - b);
};

/**
 * Leave a single relation row for this link, pointing at one target version.
 * Creating against a published document also stores a draft row; discard must see
 * a published-only row.
 */
const pointLinkOnlyAt = async (linkId: number, targetId: number) => {
  const { name, linkColumn, targetColumn } = getLinkJoinTable();
  const rows = await strapi.db.connection(name).select('*').where(linkColumn, linkId);

  if (rows.length === 0) {
    throw new Error(`no link rows for ${linkId}`);
  }

  await strapi.db.connection(name).where(linkColumn, linkId).whereNot(targetColumn, targetId).del();

  const remaining = await strapi.db.connection(name).select('*').where(linkColumn, linkId);

  if (remaining.length === 1 && remaining[0][targetColumn] === targetId) {
    return;
  }

  if (remaining.length !== 0) {
    throw new Error(`expected one remaining link row for ${linkId}, found ${remaining.length}`);
  }

  const template = { ...rows[0] };
  delete template.id;
  await strapi.db.connection(name).insert({ ...template, [targetColumn]: targetId });
};

const getTargetVersions = async () => {
  const versions = await strapi.db.query(TARGET_UID).findMany({ where: { name: 'Target' } });
  return {
    draft: versions.find((version) => version.publishedAt === null),
    published: versions.find((version) => version.publishedAt !== null),
  };
};

/**
 * Runs `fn` and returns the SQL of every query it issued.
 */
const captureQueries = async (fn: () => Promise<unknown>) => {
  const queries: string[] = [];
  const onQuery = (query: { sql: string }) => queries.push(query.sql);

  strapi.db.connection.on('query', onQuery);
  try {
    await fn();
  } finally {
    strapi.db.connection.removeListener('query', onQuery);
  }

  return queries;
};

const isSchemaQuery = (sql: string) => /sqlite_master|information_schema|pg_catalog/i.test(sql);

// Ownership lookups read the owning entry id out of a `_cmps` table, which Postgres qualifies with
// its schema. Match them by shape: entry events populate their entry after commit without being
// awaited, so their `_cmps` reads can overlap the next publish.
const isOwnershipLookup = (sql: string) =>
  /^select [`"]entity_id[`"].* from ([`"]\w+[`"]\.)?[`"]\w+_cmps[`"]/.test(sql);

const sortIds = (ids: number[]) => [...ids].sort((a, b) => a - b);

describe('Document Service relations held by a component shared across content types', () => {
  let targetDocumentId: string;

  beforeAll(async () => {
    await builder
      .addContentType(targetModel)
      .addComponent(linkComponent)
      .addComponent(cardComponent)
      .addContentTypes(hostModels)
      .build();

    strapi = await createStrapiInstance();

    const target = await strapi.documents(TARGET_UID).create({ data: { name: 'Target' } });
    targetDocumentId = target.documentId;

    await createHostEntries(2, targetDocumentId);

    // A link instance that no entry owns
    const orphan = await strapi.db
      .query(LINK_UID)
      .create({ data: { label: 'orphan', target: target.id } });
    linkIds.orphan = orphan.id;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('propagates relations to the published target only for links without a draft & publish owner', async () => {
    const queries = await captureQueries(() =>
      strapi.documents(TARGET_UID).publish({ documentId: targetDocumentId })
    );

    const { draft, published } = await getTargetVersions();

    expect(await getLinksTargeting(published.id)).toEqual(
      sortIds([...linkIds.plainOwner, linkIds.orphan])
    );
    expect(await getLinksTargeting(draft.id)).toEqual(
      sortIds([...linkIds.draftAndPublishOwner, ...linkIds.plainOwner, linkIds.orphan])
    );

    expect(queries.filter(isSchemaQuery)).toEqual([]);
  });

  it('runs the same number of ownership lookups regardless of how many instances there are', async () => {
    const lookupsBefore = (
      await captureQueries(() =>
        strapi.documents(TARGET_UID).publish({ documentId: targetDocumentId })
      )
    ).filter(isOwnershipLookup);

    await createHostEntries(5, targetDocumentId);

    const queries = await captureQueries(() =>
      strapi.documents(TARGET_UID).publish({ documentId: targetDocumentId })
    );
    const lookupsAfter = queries.filter(isOwnershipLookup);

    expect(lookupsBefore.length).toBeGreaterThan(0);
    expect(lookupsAfter).toHaveLength(lookupsBefore.length);
    expect(queries.filter(isSchemaQuery)).toEqual([]);

    const { published } = await getTargetVersions();
    expect(await getLinksTargeting(published.id)).toEqual(
      sortIds([...linkIds.plainOwner, linkIds.orphan])
    );
  });

  it('keeps every link on the draft target when the draft is discarded', async () => {
    const queries = await captureQueries(() =>
      strapi.documents(TARGET_UID).discardDraft({ documentId: targetDocumentId })
    );

    const { draft } = await getTargetVersions();

    expect(await getLinksTargeting(draft.id)).toEqual(
      sortIds([...linkIds.draftAndPublishOwner, ...linkIds.plainOwner, linkIds.orphan])
    );
    expect(queries.filter(isSchemaQuery)).toEqual([]);
  });

  it('copies a published-only relation onto the new draft only when the owner has no draft and publish', async () => {
    await strapi.documents(TARGET_UID).publish({ documentId: targetDocumentId });
    const before = await getTargetVersions();

    const plain = await strapi.documents(hostUid('plain-host-a')).create({
      data: {
        name: 'published-only-plain',
        blocks: [
          {
            __component: LINK_UID,
            label: 'published-only-plain',
            target: { documentId: targetDocumentId },
          },
        ],
      } as any,
      populate: populateBlocks as any,
    });
    const dp = await strapi.documents(hostUid('dp-host-a')).create({
      data: {
        name: 'published-only-dp',
        blocks: [
          {
            __component: LINK_UID,
            label: 'published-only-dp',
            target: { documentId: targetDocumentId },
          },
        ],
      } as any,
      populate: populateBlocks as any,
    });

    const plainLinkId = plain.blocks[0].id as number;
    const dpLinkId = dp.blocks[0].id as number;

    // Creating against the document id stores a draft row as well. Leave only the
    // published row, so discard has to decide whether to copy it.
    await pointLinkOnlyAt(plainLinkId, before.published.id);
    await pointLinkOnlyAt(dpLinkId, before.published.id);

    const draftLinksBefore = await getLinksTargeting(before.draft.id);
    expect(draftLinksBefore).not.toContain(plainLinkId);
    expect(draftLinksBefore).not.toContain(dpLinkId);
    expect(await getLinksTargeting(before.published.id)).toEqual(
      expect.arrayContaining([plainLinkId, dpLinkId])
    );

    await strapi.documents(TARGET_UID).discardDraft({ documentId: targetDocumentId });

    const after = await getTargetVersions();
    const newDraftLinks = await getLinksTargeting(after.draft.id);
    const publishedLinks = await getLinksTargeting(after.published.id);

    expect(newDraftLinks).toContain(plainLinkId);
    expect(newDraftLinks).not.toContain(dpLinkId);
    expect(publishedLinks).toEqual(expect.arrayContaining([plainLinkId, dpLinkId]));
  });
});
