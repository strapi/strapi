'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest, createRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

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

/**
 * The plugin is not a dependency of the test app: it is enabled for this suite only, the way
 * an installed dependency is found, so other suites keep running without it.
 */
const enableProvenance = ({ strapi }) => {
  strapi.config.set('info.dependencies', {
    ...strapi.config.get('info.dependencies', {}),
    '@strapi/plugin-provenance': '*',
  });
};

describe('Provenance plugin', () => {
  const builder = createTestBuilder();
  let strapi;
  let admin;
  let agentApi;
  let plainApi;
  let plainToken;
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
    const { body } = await admin.get('/provenance/settings');

    return admin.put('/provenance/settings', { body: { ...body.data.settings, ...settings } });
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

  describeOnCondition(edition === 'EE')('with Review Workflows', () => {
    let stages: Record<string, { id: number }>;
    let workflowId: number;

    beforeAll(async () => {
      const { body } = await admin.post('/review-workflows/workflows', {
        body: {
          data: {
            name: 'Provenance workflow',
            stages: [{ name: 'To do' }, { name: 'AI review' }, { name: 'Approved' }],
            contentTypes: [UID],
          },
        },
      });
      const workflow = body.data;
      workflowId = workflow.id;

      stages = Object.fromEntries(workflow.stages.map((stage) => [stage.name, stage]));
      await setSettings({
        workflows: {
          [workflow.id]: {
            approvalStageId: stages.Approved.id,
            aiReviewStageId: stages['AI review'].id,
            reworkStageId: stages['To do'].id,
          },
        },
      });
    });

    afterAll(async () => {
      // Other suites count the workflows
      await admin.delete(`/review-workflows/workflows/${workflowId}`);
      await setSettings({ workflows: {} });
    });

    const getStage = async (documentId: string) => {
      const { body } = await admin.get(`/content-manager/collection-types/${UID}/${documentId}`);

      return body.data.strapi_stage?.name;
    };

    test('sends AI writes to AI review and keeps agents out of the approval stage', async () => {
      const documentId = await agentCreate({ title: 'Workflow' });

      expect(await getStage(documentId)).toBe('AI review');

      const refused = await agentApi.put(`/prov-articles/${documentId}`, {
        body: { data: { strapi_stage: { connect: [stages.Approved.id] } } },
        qs: { status: 'draft' },
      });

      expect(refused.status).toBe(403);
      expect(await getStage(documentId)).toBe('AI review');
    });

    test('reviews every field when a person approves the entry', async () => {
      const documentId = await agentCreate({ title: 'To approve', body: 'Generated' });

      const moved = await admin.put(
        `/review-workflows/content-manager/collection-types/${UID}/${documentId}/stage`,
        { body: { data: { id: stages.Approved.id } } }
      );
      expect(moved.status).toBe(200);

      const fields = await getProvenance(documentId);
      expect(fields.title.review).not.toBeNull();
      expect(fields.body.review).not.toBeNull();
    });
  });
});
