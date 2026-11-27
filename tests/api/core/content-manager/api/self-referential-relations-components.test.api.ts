import type { Data, UID } from '@strapi/types';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import modelsUtils from 'api-tests/models';

const PAGE_UID: UID.ContentType = 'api::page.page';

const builder = createTestBuilder();
let strapi: any;
let rq: any;

const pageLink = (withRelations = false) => ({
  displayName: 'page-link',
  category: 'default',
  attributes: {
    label: { type: 'string' },
    ...(withRelations
      ? {
          page: { type: 'relation', relation: 'oneToOne', target: PAGE_UID },
          pages: { type: 'relation', relation: 'oneToMany', target: PAGE_UID },
        }
      : {}),
  },
});

const pageSection = {
  displayName: 'page-section',
  category: 'default',
  attributes: {
    title: { type: 'string' },
    links: { type: 'component', repeatable: true, component: 'default.page-link' },
  },
};

const page = {
  displayName: 'page',
  singularName: 'page',
  pluralName: 'pages',
  kind: 'collectionType',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    link: { type: 'component', repeatable: false, component: 'default.page-link' },
    links: { type: 'component', repeatable: true, component: 'default.page-link' },
    blocks: {
      type: 'dynamiczone',
      components: ['default.page-link', 'default.page-section'],
    },
  },
};

const populate = {
  link: { populate: ['page', 'pages'] },
  links: { populate: ['page', 'pages'] },
  blocks: {
    on: {
      'default.page-link': { populate: ['page', 'pages'] },
      'default.page-section': { populate: { links: { populate: ['page', 'pages'] } } },
    },
  },
};

const createPage = async (title: string): Promise<Data.DocumentID> => {
  const res = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/${PAGE_UID}`,
    body: { title },
  });

  expect(res.statusCode).toBe(201);
  return res.body.data.documentId;
};

const updatePage = async (documentId: Data.DocumentID, body: Record<string, unknown>) => {
  const res = await rq({
    method: 'PUT',
    url: `/content-manager/collection-types/${PAGE_UID}/${documentId}`,
    body,
  });

  expect(res.statusCode).toBe(200);
};

const runAction = async (documentId: Data.DocumentID, action: 'publish' | 'discard') => {
  const res = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/${PAGE_UID}/${documentId}/actions/${action}`,
  });

  expect(res.body.error).toBeUndefined();
  expect(res.statusCode).toBe(200);
};

const getPage = (documentId: Data.DocumentID, status: 'draft' | 'published') =>
  strapi.documents(PAGE_UID).findOne({ documentId, status, populate });

const toDocumentIds = (relations: Array<{ documentId: Data.DocumentID }> = []) =>
  relations.map((relation) => relation.documentId);

describe('CM API - Self-referential relations inside components with Draft & Publish', () => {
  beforeAll(async () => {
    await builder
      .addComponent(pageLink(false))
      .addComponent(pageSection)
      .addContentType(page)
      .build();

    // The component targets the content type that uses it, so add its relations once both exist
    await modelsUtils.modifyComponent(pageLink(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('A component relation to its own entry is kept on publish', async () => {
    const home = await createPage('Home');

    await updatePage(home, {
      title: 'Home',
      link: { label: 'Self', page: { connect: [{ documentId: home }] } },
    });

    await runAction(home, 'publish');

    const published = await getPage(home, 'published');
    expect(published.link.page?.documentId).toBe(home);

    // The relation points to the published version, not to the draft
    const publishedId = published.id;
    expect(published.link.page.id).toBe(publishedId);
  });

  test('Repeatable, dynamic zone and nested component self-relations are kept on publish', async () => {
    const home = await createPage('Home');

    await updatePage(home, {
      title: 'Home',
      links: [
        { label: 'first', page: { connect: [{ documentId: home }] } },
        { label: 'second', page: { connect: [{ documentId: home }] } },
      ],
      blocks: [
        {
          __component: 'default.page-link',
          label: 'dz',
          page: { connect: [{ documentId: home }] },
        },
        {
          __component: 'default.page-section',
          title: 'section',
          links: [{ label: 'nested', page: { connect: [{ documentId: home }] } }],
        },
      ],
    });

    await runAction(home, 'publish');

    const published = await getPage(home, 'published');
    expect(published.links.map((link: any) => link.page?.id)).toEqual([published.id, published.id]);
    expect(published.blocks[0].page?.id).toBe(published.id);
    expect(published.blocks[1].links[0].page?.id).toBe(published.id);
  });

  test('Order of a to-many component relation mixing self and other entries is kept on publish', async () => {
    const other = await createPage('Other');
    const another = await createPage('Another');
    await runAction(other, 'publish');
    await runAction(another, 'publish');

    const home = await createPage('Home');
    await updatePage(home, {
      title: 'Home',
      link: {
        label: 'mixed',
        pages: {
          connect: [{ documentId: other }, { documentId: home }, { documentId: another }],
        },
      },
    });

    const draft = await getPage(home, 'draft');
    expect(toDocumentIds(draft.link.pages)).toEqual([other, home, another]);

    await runAction(home, 'publish');

    const published = await getPage(home, 'published');
    expect(toDocumentIds(published.link.pages)).toEqual([other, home, another]);
  });

  test('Republishing an entry whose published component links to itself succeeds', async () => {
    const home = await createPage('Home');

    await updatePage(home, {
      title: 'Home',
      link: { label: 'Self', page: { connect: [{ documentId: home }] } },
    });

    await runAction(home, 'publish');

    await updatePage(home, { title: 'Home - edited' });

    // Used to fail with a foreign key error: the link of the deleted published component was re-inserted
    await runAction(home, 'publish');

    const published = await getPage(home, 'published');
    expect(published.title).toBe('Home - edited');
    expect(published.link.page?.id).toBe(published.id);

    const draft = await getPage(home, 'draft');
    expect(draft.link.page?.id).toBe(draft.id);
  });

  test('Republishing an entry migrated from v4 (published component already linked to itself) succeeds', async () => {
    const home = await createPage('Home');

    await updatePage(home, {
      title: 'Home',
      link: { label: 'Self', page: { connect: [{ documentId: home }] } },
    });
    await runAction(home, 'publish');

    // Reproduce the state the v5 migration leaves: the published component links to the
    // published entry. Insert the row directly so this does not depend on the publish fix.
    const published = await getPage(home, 'published');
    const linkMeta = strapi.db.metadata.get('default.page-link');
    const { joinTable } = linkMeta.attributes.page;

    await strapi.db
      .getConnection(joinTable.name)
      .where({ [joinTable.joinColumn.name]: published.link.id })
      .del();
    await strapi.db.getConnection(joinTable.name).insert({
      [joinTable.joinColumn.name]: published.link.id,
      [joinTable.inverseJoinColumn.name]: published.id,
    });

    await runAction(home, 'publish');

    const republished = await getPage(home, 'published');
    expect(republished.link.page?.id).toBe(republished.id);
  });

  test('A component relation to its own entry is kept on discard draft', async () => {
    const home = await createPage('Home');

    await updatePage(home, {
      title: 'Home',
      link: { label: 'Self', page: { connect: [{ documentId: home }] } },
    });
    await runAction(home, 'publish');

    await updatePage(home, { title: 'Home - edited' });

    await runAction(home, 'discard');

    const draft = await getPage(home, 'draft');
    expect(draft.title).toBe('Home');
    expect(draft.link.page?.id).toBe(draft.id);

    const published = await getPage(home, 'published');
    expect(published.link.page?.id).toBe(published.id);
  });
});
