'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest, createRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const UID = 'api::prov-article.prov-article';
const SEO_UID = 'prov.seo';

const seo = {
  category: 'prov',
  displayName: 'seo',
  attributes: {
    metaTitle: { type: 'string' },
  },
};

const article = {
  singularName: 'prov-article',
  pluralName: 'prov-articles',
  displayName: 'Provenance article',
  kind: 'collectionType',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    body: { type: 'richtext' },
    secret: { type: 'string', private: true },
    seo: { type: 'component', component: SEO_UID },
  },
};

// Stands in for the approval queue of Agent Governance
let parkPublish = false;

/**
 * Stands in for the auth strategy of Agent Governance: an admin user of kind `agent`.
 */
const agentStrategy = (strapi) => ({
  name: 'agent',
  async authenticate(ctx) {
    const name = ctx.request.headers['x-test-agent'];

    if (name === undefined) {
      return { authenticated: false };
    }

    const user = await strapi.db.query('admin::user').findOne({ populate: ['roles'] });

    ctx.state.user = { ...user, kind: 'agent', firstname: name, username: null };
    ctx.state.userAbility = await strapi
      .service('admin::permission')
      .engine.generateUserAbility(user);

    return { authenticated: true, credentials: ctx.state.user };
  },
});

/**
 * The plugin is not a dependency of the test app: it is enabled for this suite only, the way
 * an installed dependency is found, so other suites keep running without it.
 */
const enableProvenance = ({ strapi }) => {
  strapi.config.set('info.dependencies', {
    ...strapi.config.get('info.dependencies', {}),
    '@strapi/plugin-provenance': '*',
  });

  strapi.get('auth').register('admin', agentStrategy(strapi));
  strapi.documents.use(async (ctx, next) => {
    if (parkPublish && ctx.action === 'publish') {
      return { status: 'pending_approval', pendingActionId: 'queued' };
    }

    return next();
  });
};

describe('Provenance plugin', () => {
  const builder = createTestBuilder();
  let strapi;
  let admin;
  let agentApi;
  let plainApi;
  let plainToken;
  // No license includes the feature yet: the suite switches the plugin's own gate
  let licensed = true;
  let reviewerId: number;
  const tokenIds: string[] = [];

  const createToken = async (name: string) => {
    // The test database is reused between runs: token names must be new
    const { body } = await admin.post('/admin/api-tokens', {
      body: { name: `${name} ${Date.now()}`, type: 'full-access', lifespan: null, description: '' },
    });
    tokenIds.push(body.data.id);

    return body.data;
  };

  const getProvenance = async (documentId: string, status = 'draft') => {
    const { body } = await admin.get(`/provenance/entries/${UID}/${documentId}`, {
      qs: { status },
    });

    return body.data.fields;
  };

  // Changes some settings and keeps the others
  const setSettings = async (settings: Record<string, unknown>) => {
    const wasLicensed = licensed;

    // The settings routes only exist with the license feature
    licensed = true;

    const { body } = await admin.get('/provenance/settings');
    const response = await admin.put('/provenance/settings', {
      body: { ...body.data.settings, ...settings },
    });

    licensed = wasLicensed;

    return response;
  };

  const agentCreate = async (data: Record<string, unknown>) => {
    const { body } = await agentApi.post('/prov-articles', {
      body: { data },
      qs: { status: 'draft' },
    });

    return body.data.documentId as string;
  };

  beforeAll(async () => {
    await builder.addComponent(seo).addContentType(article).build();

    strapi = await createStrapiInstance({ bypassAuth: false, register: enableProvenance });
    admin = await createAuthRequest({ strapi });
    strapi.plugin('provenance').service('settings').isProvenanceEnabled = () => licensed;

    reviewerId = (await strapi.db.query('admin::user').findOne({})).id;

    const agent = await createToken('provenance agent');
    plainToken = await createToken('provenance plain');
    await admin.put(`/provenance/tokens/${agent.id}`, { body: { profile: 'agent' } });

    agentApi = createContentAPIRequest({ strapi, auth: { token: agent.accessKey } });
    plainApi = createContentAPIRequest({ strapi, auth: { token: plainToken.accessKey } });
  });

  afterAll(async () => {
    await Promise.all(tokenIds.map((id) => admin.delete(`/admin/api-tokens/${id}`)));
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await setSettings({ requireReviewBeforePublish: false });
  });

  test('records the writes of an agent token as AI', async () => {
    const documentId = await agentCreate({ title: 'Ten tips', body: 'Water in the morning.' });
    const fields = await getProvenance(documentId);

    expect(fields.title).toMatchObject({
      source: 'ai-generated',
      signal: 'token',
      review: null,
      digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
    });
    expect(fields.body.source).toBe('ai-generated');
  });

  test('keeps AI output AI when a person edits it, and leaves unchanged fields alone', async () => {
    const documentId = await agentCreate({ title: 'Draft title', body: 'Generated body' });

    await admin.put(`/content-manager/collection-types/${UID}/${documentId}`, {
      body: { title: 'Edited title', body: 'Generated body' },
    });

    const fields = await getProvenance(documentId);

    expect(fields.title).toMatchObject({ source: 'ai-assisted', signal: 'admin-session' });
    expect(fields.body).toMatchObject({ source: 'ai-generated', signal: 'token' });
  });

  test('lets a client declare AI, never human', async () => {
    const declared = await plainApi.post('/prov-articles', {
      body: { data: { title: 'Declared' } },
      qs: { status: 'draft' },
      headers: {
        Authorization: `Bearer ${plainToken.accessKey}`,
        'Strapi-Provenance': 'source=ai; model="test-model"',
      },
    });

    expect((await getProvenance(declared.body.data.documentId)).title).toMatchObject({
      source: 'ai-generated',
      signal: 'client-declared',
      model: 'test-model',
    });

    const documentId = await agentCreate({ title: 'Agent' });
    await agentApi.put(`/prov-articles/${documentId}`, {
      body: { data: { title: 'Still the agent' }, provenance: { title: { source: 'human' } } },
      qs: { status: 'draft' },
    });

    expect((await getProvenance(documentId)).title.source).toBe('ai-generated');
  });

  test('refuses to publish unreviewed AI content until a person reviews it', async () => {
    await setSettings({ requireReviewBeforePublish: true });
    const documentId = await agentCreate({ title: 'Needs review' });

    const refused = await admin.post(
      `/content-manager/collection-types/${UID}/${documentId}/actions/publish`
    );

    expect(refused.status).toBe(400);
    expect(refused.body.error.details).toHaveProperty('title');

    const reviewed = await admin.post(`/provenance/entries/${UID}/${documentId}/review`, {
      body: {},
    });
    expect(reviewed.status).toBe(200);

    const published = await admin.post(
      `/content-manager/collection-types/${UID}/${documentId}/actions/publish`
    );
    expect(published.status).toBe(200);

    const { body } = await agentApi.get(`/prov-articles/${documentId}`, {
      qs: { provenance: 'true' },
    });
    expect(body.meta.provenance.title).toMatchObject({ source: 'ai-generated', reviewed: true });
  });

  test('tracks a component as one field and keeps its provenance on publish', async () => {
    const documentId = await agentCreate({ title: 'With SEO', seo: { metaTitle: 'Generated' } });

    expect((await getProvenance(documentId)).seo.source).toBe('ai-generated');

    await admin.post(`/content-manager/collection-types/${UID}/${documentId}/actions/publish`);

    expect((await getProvenance(documentId, 'published')).seo).toMatchObject({
      source: 'ai-generated',
      drifted: false,
    });
  });

  test('describes a list entry by entry and hides private fields', async () => {
    await agentCreate({ title: 'Listed', secret: 'hidden' });

    const { body } = await agentApi.get('/prov-articles', {
      qs: { provenance: 'true', status: 'draft' },
    });

    expect(Array.isArray(body.meta.provenance)).toBe(true);
    expect(body.meta.provenance).toHaveLength(body.data.length);
    body.meta.provenance.forEach((fields) => expect(fields).not.toHaveProperty('secret'));
  });

  describe('without the license feature', () => {
    let documentId: string;

    beforeAll(async () => {
      documentId = await agentCreate({ title: 'Written with the license' });
      licensed = false;
    });

    afterAll(() => {
      licensed = true;
    });

    test('has no routes', async () => {
      const responses = await Promise.all([
        admin.get(`/provenance/entries/${UID}/${documentId}`),
        admin.get(`/provenance/entries/${UID}/${documentId}/export`, { qs: { status: 'draft' } }),
        admin.get('/provenance/settings'),
        admin.get('/provenance/tokens'),
      ]);

      responses.forEach(({ status }) => expect(status).toBe(404));
    });

    test('records nothing, and the guard does not apply', async () => {
      await setSettings({ requireReviewBeforePublish: true });

      const created = await agentCreate({ title: 'Written without the license' });
      const published = await admin.post(
        `/content-manager/collection-types/${UID}/${created}/actions/publish`
      );

      expect(published.status).toBe(200);

      const rows = await strapi.db
        .query('plugin::provenance.field-provenance')
        .findMany({ where: { targetDocumentId: created } });

      expect(rows).toHaveLength(0);
    });

    test('adds nothing to Content API reads', async () => {
      const { status, body } = await agentApi.get(`/prov-articles`, {
        qs: { provenance: 'true', status: 'draft' },
      });

      expect(status).toBe(200);
      expect(body.meta.provenance).toBeUndefined();
    });
  });

  describe('with concurrent requests on one document', () => {
    const rowsOf = (documentId: string, status: string) =>
      strapi.db.query('plugin::provenance.field-provenance').findMany({
        where: { targetDocumentId: documentId, targetStatus: status, fieldPath: 'title' },
      });

    test('creates documents in parallel', async () => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          agentApi.post('/prov-articles', {
            body: { data: { title: `Parallel ${index}` } },
            qs: { status: 'draft' },
          })
        )
      );

      responses.forEach(({ status }) => expect(status).toBe(201));
    });

    test('keeps one row per field, describing the value that won', async () => {
      const documentId = await agentCreate({ title: 'Race' });

      await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          agentApi.put(`/prov-articles/${documentId}`, {
            body: { data: { title: `Race ${index}` } },
            qs: { status: 'draft' },
          })
        )
      );

      expect(await rowsOf(documentId, 'draft')).toHaveLength(1);
      expect((await getProvenance(documentId)).title).toMatchObject({
        source: 'ai-generated',
        drifted: false,
      });
    });

    test('never publishes an AI value without a review of that value', async () => {
      await setSettings({ requireReviewBeforePublish: true });

      const documentIds = await Promise.all(
        Array.from({ length: 5 }, (_, index) => agentCreate({ title: `Guarded ${index}` }))
      );

      await Promise.all(
        documentIds.flatMap((documentId) => [
          admin.post(`/provenance/entries/${UID}/${documentId}/review`, { body: {} }),
          ...Array.from({ length: 3 }, (_, index) =>
            agentApi.put(`/prov-articles/${documentId}`, {
              body: { data: { title: `Edited ${index}` } },
              qs: { status: 'draft' },
            })
          ),
          ...Array.from({ length: 2 }, () =>
            admin.post(`/content-manager/collection-types/${UID}/${documentId}/actions/publish`)
          ),
        ])
      );

      for (const documentId of documentIds) {
        const published = await strapi.documents(UID).findOne({ documentId, status: 'published' });

        if (published !== null) {
          const { title } = await getProvenance(documentId, 'published');

          expect(title.drifted).toBe(false);
          expect(title.review).not.toBeNull();
        }

        expect(await rowsOf(documentId, 'draft')).toHaveLength(1);
      }
    });
  });

  test('takes the content type and document from the route only', async () => {
    const documentId = await agentCreate({ title: 'Route only' });

    const { status, body } = await admin.get(`/provenance/entries/${UID}/${documentId}`, {
      qs: { uid: 'api::other.other', documentId: 'other' },
    });

    expect(status).toBe(200);
    expect(body.data.fields.title.source).toBe('ai-generated');
  });

  test('does not let an API token review content', async () => {
    const documentId = await agentCreate({ title: 'Self review' });

    const { status } = await createRequest({ strapi }).post(
      `/provenance/entries/${UID}/${documentId}/review`,
      { headers: { Authorization: `Bearer ${plainToken.accessKey}` }, body: {} }
    );

    expect([401, 403]).toContain(status);
  });

  test('does not expose its tables through GraphQL', async () => {
    const { body } = await createRequest({ strapi }).post('/graphql', {
      headers: { Authorization: `Bearer ${plainToken.accessKey}` },
      body: { query: '{ provenanceFieldProvenances { documentId } }' },
    });

    expect(body.errors?.length).toBeGreaterThan(0);
  });

  describe('with an agent identity', () => {
    const agentHeaders = { 'x-test-agent': 'Blog Drafter' };

    const agentCreateAsItself = async (data: Record<string, unknown>, headers = {}) => {
      const { status, body } = await createRequest({ strapi }).post(
        `/content-manager/collection-types/${UID}`,
        { headers: { ...agentHeaders, ...headers }, body: data }
      );

      expect(status).toBe(201);

      return body.data.documentId as string;
    };

    // The request of a reviewer: the session of a person, not the agent's
    const asReviewer = <T>(run: () => Promise<T>) => {
      let output!: T;

      return strapi.requestContext
        .run(
          {
            state: { auth: { strategy: { name: 'admin' } }, user: { id: reviewerId } },
            request: { headers: {}, body: {}, url: '' },
          },
          async () => {
            output = await run();
          }
        )
        .then(() => output);
    };

    const agent = { id: 123, name: 'Blog Drafter' };
    const approvals = () => strapi.plugin('provenance').service('approvals');

    test('names the agent as the writer, whatever the client claims', async () => {
      const documentId = await agentCreateAsItself(
        { title: 'Written by an agent' },
        { 'Strapi-Provenance': 'source=ai; model="test-model"; agent="Someone else"' }
      );

      expect((await getProvenance(documentId)).title).toMatchObject({
        source: 'ai-generated',
        signal: 'agent-identity',
        agent: 'Blog Drafter',
        model: 'test-model',
        actor: { type: 'agent' },
      });
    });

    test('does not let an agent review or declare', async () => {
      const documentId = await agentCreateAsItself({ title: 'Self review' });

      const review = await createRequest({ strapi }).post(
        `/provenance/entries/${UID}/${documentId}/review`,
        { headers: agentHeaders, body: {} }
      );
      const declare = await createRequest({ strapi }).post(
        `/provenance/entries/${UID}/${documentId}/declare`,
        { headers: agentHeaders, body: { fields: ['title'] } }
      );

      expect(review.status).toBe(403);
      expect(declare.status).toBe(403);
    });

    test('lets a queue registered in `register` park a publish before the guard', async () => {
      await setSettings({ requireReviewBeforePublish: true });
      const documentId = await agentCreateAsItself({ title: 'Parked' });

      parkPublish = true;

      const output = await strapi.documents(UID).publish({ documentId });

      parkPublish = false;

      expect(output).toEqual({ status: 'pending_approval', pendingActionId: 'queued' });
      expect((await getProvenance(documentId)).title.source).toBe('ai-generated');
    });

    test('records an approved edit as the agent, reviewed by the person', async () => {
      const documentId = await agentCreateAsItself({ title: 'Before', body: 'Unchanged' });

      await asReviewer(() =>
        approvals().executeApproved(
          { uid: UID, documentId, action: 'update', agent, decidedBy: reviewerId, hashes: {} },
          () => strapi.documents(UID).update({ documentId, data: { title: 'The queued edit' } })
        )
      );

      const fields = await getProvenance(documentId);

      expect(fields.title).toMatchObject({
        source: 'ai-generated',
        signal: 'agent-identity',
        agent: 'Blog Drafter',
        actor: { type: 'agent', id: '123' },
      });
      expect(fields.title.review.byId).toBe(String(reviewerId));
      expect(fields.body.review).toBeNull();
    });

    test('refuses an approved publish of values that changed since the diff', async () => {
      await setSettings({ requireReviewBeforePublish: true });
      const documentId = await agentCreateAsItself({ title: 'Shown' });
      const { fields } = await approvals().getReviewState({ uid: UID, documentId });

      await agentCreateAsItself({ title: 'Unrelated' });
      await createRequest({ strapi }).put(
        `/content-manager/collection-types/${UID}/${documentId}`,
        { headers: agentHeaders, body: { title: 'Changed after the diff' } }
      );

      await expect(
        asReviewer(() =>
          approvals().executeApproved(
            {
              uid: UID,
              documentId,
              action: 'publish',
              agent,
              decidedBy: reviewerId,
              hashes: { title: fields.title.hash },
            },
            () => strapi.documents(UID).publish({ documentId })
          )
        )
      ).rejects.toMatchObject({ name: 'StaleApprovalError', details: { fields: ['title'] } });

      expect(await strapi.documents(UID).findOne({ documentId, status: 'published' })).toBeNull();
    });

    test('publishes what was shown past the guard, with the review', async () => {
      await setSettings({ requireReviewBeforePublish: true });
      const documentId = await agentCreateAsItself({ title: 'Approved', body: 'Also AI' });
      const state = await approvals().getReviewState({ uid: UID, documentId });

      expect(state.toReview.sort()).toEqual(['body', 'title']);

      await asReviewer(() =>
        approvals().executeApproved(
          {
            uid: UID,
            documentId,
            action: 'publish',
            agent,
            decidedBy: reviewerId,
            hashes: Object.fromEntries(
              state.toReview.map((field: string) => [field, state.fields[field].hash])
            ),
          },
          () => strapi.documents(UID).publish({ documentId })
        )
      );

      const published = await getProvenance(documentId, 'published');

      expect(published.title).toMatchObject({ source: 'ai-generated', agent: 'Blog Drafter' });
      expect(published.title.review.byId).toBe(String(reviewerId));
    });

    test('still stops a person publishing an agent draft without a review', async () => {
      await setSettings({ requireReviewBeforePublish: true });
      const documentId = await agentCreateAsItself({ title: 'Not reviewed' });

      const { status } = await admin.post(
        `/content-manager/collection-types/${UID}/${documentId}/actions/publish`
      );

      expect(status).toBe(400);
    });
  });
});
