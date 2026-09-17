'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const ARTICLE_UID = 'api::article.article';
const CM_URL = `/content-manager/collection-types/${ARTICLE_UID}`;
const BRANCH_HEADER = 'X-Strapi-Branch';
const CHANGE_UID = 'plugin::branches.change';

const articleModel = {
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
    },
    body: {
      type: 'text',
    },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

describe('Branches — branch isolation and merge', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const data = {
    branch: null,
    mainArticle: null,
    branchArticle: null,
    deletedArticle: null,
  };

  const onBranch = (slug = data.branch.slug) => ({ [BRANCH_HEADER]: slug });

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await strapi.db.query(ARTICLE_UID).deleteMany();
    await strapi.db.query(CHANGE_UID).deleteMany();
    await strapi.db.query('plugin::branches.branch').deleteMany();
  });

  afterAll(async () => {
    await strapi.db.query(ARTICLE_UID).deleteMany();
    await strapi.db.query(CHANGE_UID).deleteMany();
    await strapi.db.query('plugin::branches.branch').deleteMany();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Branch lifecycle', () => {
    test('Rejects an unknown branch header', async () => {
      const res = await rq({ url: CM_URL, method: 'GET', headers: onBranch('does-not-exist') });

      expect(res.statusCode).toBe(400);
    });

    test('Creates a branch from main', async () => {
      const res = await rq({
        url: '/branches',
        method: 'POST',
        body: { name: 'Spring release' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ slug: 'spring-release', status: 'active', parent: null });
      data.branch = res.body;

      const mine = await rq({ url: '/branches/mine', method: 'GET' });
      expect(mine.body.map((branch) => branch.slug)).toEqual(['main', 'spring-release']);
    });

    test('The main slug is reserved', async () => {
      const res = await rq({ url: '/branches', method: 'POST', body: { name: 'main' } });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Inherited documents', () => {
    test('A document created on main is visible from the branch', async () => {
      const created = await rq({
        url: CM_URL,
        method: 'POST',
        body: { title: 'Homepage', body: 'Original body' },
      });
      expect(created.statusCode).toBe(201);
      data.mainArticle = created.body.data ?? created.body;

      const res = await rq({ url: CM_URL, method: 'GET', headers: onBranch() });
      expect(res.statusCode).toBe(200);
      expect(res.body.results.map((doc) => doc.documentId)).toEqual([data.mainArticle.documentId]);
    });

    test('Editing it on the branch records a delta and leaves the row untouched', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.mainArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Homepage (spring)' },
        headers: onBranch(),
      });
      expect(res.statusCode).toBe(200);
      expect((res.body.data ?? res.body).title).toBe('Homepage (spring)');

      const row = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.mainArticle.documentId, publishedAt: null },
      });
      expect(row.title).toBe('Homepage');

      const deltas = await strapi.db.query(CHANGE_UID).findMany({
        where: { contentType: ARTICLE_UID, entryDocumentId: data.mainArticle.documentId },
      });
      expect(deltas).toHaveLength(1);
      expect(deltas[0]).toMatchObject({
        operation: 'update',
        changes: { title: 'Homepage (spring)' },
        base: { title: 'Homepage' },
      });
    });

    test('The branch view carries the change, main does not', async () => {
      const fromBranch = await rq({
        url: `${CM_URL}/${data.mainArticle.documentId}`,
        method: 'GET',
        headers: onBranch(),
      });
      expect((fromBranch.body.data ?? fromBranch.body).title).toBe('Homepage (spring)');

      const fromMain = await rq({ url: `${CM_URL}/${data.mainArticle.documentId}`, method: 'GET' });
      expect((fromMain.body.data ?? fromMain.body).title).toBe('Homepage');

      const list = await rq({ url: CM_URL, method: 'GET', headers: onBranch() });
      expect(list.body.results[0].title).toBe('Homepage (spring)');
    });

    test('The content API serves the branch view with the header', async () => {
      const fromBranch = await rq({
        url: `/api/articles?status=draft`,
        method: 'GET',
        headers: onBranch(),
      });
      expect(fromBranch.statusCode).toBe(200);
      expect(fromBranch.body.data.map((doc) => doc.title)).toEqual(['Homepage (spring)']);

      const fromMain = await rq({ url: `/api/articles?status=draft`, method: 'GET' });
      expect(fromMain.body.data.map((doc) => doc.title)).toEqual(['Homepage']);
    });

    test('Publishing on the branch is forbidden', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.mainArticle.documentId}/actions/publish`,
        method: 'POST',
        headers: onBranch(),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Documents created and deleted on the branch', () => {
    test('A document created on the branch is invisible from main', async () => {
      const created = await rq({
        url: CM_URL,
        method: 'POST',
        body: { title: 'Only on the branch' },
        headers: onBranch(),
      });
      expect(created.statusCode).toBe(201);
      data.branchArticle = created.body.data ?? created.body;

      // Raw reads outside a request run on main, where the row is hidden by the
      // read net: check the column through knex instead.
      const row = await strapi.db
        .connection('articles')
        .where({ document_id: data.branchArticle.documentId })
        .first();
      expect(row.branch_id).toBe(data.branch.id);

      const fromMain = await rq({ url: CM_URL, method: 'GET' });
      expect(fromMain.body.results.map((doc) => doc.documentId)).toEqual([
        data.mainArticle.documentId,
      ]);

      const fromMainApi = await rq({ url: '/api/articles?status=draft', method: 'GET' });
      expect(fromMainApi.body.data.map((doc) => doc.documentId)).toEqual([
        data.mainArticle.documentId,
      ]);

      const fromBranch = await rq({ url: CM_URL, method: 'GET', headers: onBranch() });
      expect(fromBranch.body.results.map((doc) => doc.documentId).sort()).toEqual(
        [data.mainArticle.documentId, data.branchArticle.documentId].sort()
      );
    });

    test('Deleting an inherited document on the branch is a tombstone', async () => {
      const created = await rq({ url: CM_URL, method: 'POST', body: { title: 'Doomed' } });
      data.deletedArticle = created.body.data ?? created.body;

      const res = await rq({
        url: `${CM_URL}/${data.deletedArticle.documentId}`,
        method: 'DELETE',
        headers: onBranch(),
      });
      expect(res.statusCode).toBe(200);

      const row = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.deletedArticle.documentId },
      });
      expect(row).not.toBeNull();

      const tombstones = await strapi.db.query(CHANGE_UID).findMany({
        where: { entryDocumentId: data.deletedArticle.documentId, operation: 'delete' },
      });
      expect(tombstones).toHaveLength(1);

      const fromBranch = await rq({ url: CM_URL, method: 'GET', headers: onBranch() });
      expect(fromBranch.body.results.map((doc) => doc.documentId)).not.toContain(
        data.deletedArticle.documentId
      );

      const fromMain = await rq({ url: CM_URL, method: 'GET' });
      expect(fromMain.body.results.map((doc) => doc.documentId)).toContain(
        data.deletedArticle.documentId
      );
    });

    test('The list-view states describe every document', async () => {
      const res = await rq({
        url: `/branches/states?contentType=${ARTICLE_UID}&documentIds=${[
          data.mainArticle.documentId,
          data.branchArticle.documentId,
        ].join(',')}`,
        method: 'GET',
        headers: onBranch(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.body[data.mainArticle.documentId]).toMatchObject({
        state: 'modified',
        attributes: ['title'],
      });
      expect(res.body[data.branchArticle.documentId]).toMatchObject({ state: 'created' });

      const fromMain = await rq({
        url: `/branches/states?contentType=${ARTICLE_UID}&documentIds=${data.mainArticle.documentId}`,
        method: 'GET',
      });
      expect(fromMain.body[data.mainArticle.documentId].branches.map((b) => b.slug)).toEqual([
        'spring-release',
      ]);
    });
  });

  describe('Diff and merge', () => {
    test('Lists the branch changes', async () => {
      const res = await rq({ url: `/branches/${data.branch.id}/changes`, method: 'GET' });

      expect(res.statusCode).toBe(200);
      expect(res.body.counts).toMatchObject({ create: 1, update: 1, delete: 1, conflicts: 0 });
      const updated = res.body.changes.find((change) => change.kind === 'update');
      expect(updated).toMatchObject({
        documentId: data.mainArticle.documentId,
        attributes: ['title'],
        conflicts: [],
      });
    });

    test('A concurrent edit on main becomes a conflict that blocks the merge', async () => {
      const edit = await rq({
        url: `${CM_URL}/${data.mainArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Homepage (main edit)' },
      });
      expect(edit.statusCode).toBe(200);

      const changes = await rq({ url: `/branches/${data.branch.id}/changes`, method: 'GET' });
      expect(changes.body.counts.conflicts).toBe(1);

      const diff = await rq({
        url: `/branches/${data.branch.id}/changes/${ARTICLE_UID}/${data.mainArticle.documentId}`,
        method: 'GET',
      });
      expect(diff.statusCode).toBe(200);
      expect(diff.body.attributes).toEqual([
        expect.objectContaining({
          attribute: 'title',
          base: 'Homepage',
          parent: 'Homepage (main edit)',
          branch: 'Homepage (spring)',
          status: 'conflict',
        }),
      ]);

      const blocked = await rq({
        url: `/branches/${data.branch.id}/merge`,
        method: 'POST',
        body: {},
      });
      expect(blocked.statusCode).toBe(400);
    });

    test('Merging with a resolution applies the branch to main', async () => {
      const res = await rq({
        url: `/branches/${data.branch.id}/merge`,
        method: 'POST',
        body: {
          resolutions: {
            [ARTICLE_UID]: { [data.mainArticle.documentId]: { '': { title: 'branch' } } },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ created: 1, updated: 1, deleted: 1 });

      const mainRow = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.mainArticle.documentId, publishedAt: null },
      });
      expect(mainRow.title).toBe('Homepage (spring)');

      const createdRow = await strapi.db
        .connection('articles')
        .where({ document_id: data.branchArticle.documentId })
        .first();
      expect(createdRow.branch_id).toBeNull();

      const deletedRow = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.deletedArticle.documentId },
      });
      expect(deletedRow).toBeNull();

      const deltas = await strapi.db.query(CHANGE_UID).count({
        where: { branch: { id: data.branch.id } },
      });
      expect(deltas).toBe(0);

      const branch = await rq({ url: `/branches/${data.branch.id}`, method: 'GET' });
      expect(branch.body.status).toBe('merged');

      const fromMain = await rq({ url: CM_URL, method: 'GET' });
      expect(fromMain.body.results.map((doc) => doc.title).sort()).toEqual(
        ['Homepage (spring)', 'Only on the branch'].sort()
      );
    });

    test('A merged branch no longer resolves', async () => {
      const res = await rq({ url: CM_URL, method: 'GET', headers: onBranch() });

      expect(res.statusCode).toBe(400);
    });
  });
});
