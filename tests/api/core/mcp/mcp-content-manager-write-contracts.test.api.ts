import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core, UID } from '@strapi/types';
import {
  createMcpClient,
  expectToolOk,
  expectInputValidationError,
  expectToolError,
  type AdminPermission,
  type AdminToken,
} from './utils/mcp-client';

/**
 * JSON-RPC coverage for the Content Manager MCP *write* contracts.
 *
 * The Zod projection itself is unit-tested in
 * `packages/core/content-manager/server/src/mcp/__tests__/data-schema-*.test.ts`, which
 * `safeParse`s the schemas directly. Those tests cannot show that the advertised schema and
 * the server agree: the MCP SDK validates input *before* the handler runs, so a schema that
 * is too strict rejects a write the server would accept, and one that is too lenient defers
 * to a late entity-validator failure. Both only surface over a real `tools/call`.
 *
 * What this file pins, end to end through `POST /mcp`:
 *  - a D&P create accepts a draft that omits required scalars *and* required non-repeatable
 *    components, and the row actually persists (the CMS-1425 contract);
 *  - an explicit `null` on a draft-required scalar is accepted and clears the field — the
 *    case `.optional()` alone would reject before the handler;
 *  - an id-less nested component on a *non-D&P* update is validated as a create, so omitting
 *    that component's required leaf is rejected at the Zod boundary, not silently written;
 *  - `update_*` with empty `data` parses on both model kinds;
 *  - the advertised `tools/list` shape for a D&P create keeps required fields out of
 *    `required` while still carrying the hint, and — on a non-D&P model — the update/write
 *    description names the late published-create check.
 */

const DP_UID = 'api::mcp-write-dp.mcp-write-dp';
const NO_DP_UID = 'api::mcp-write-nodp.mcp-write-nodp';

// `slugifyUidForMcpToolName` collapses `api::x.x` to a single `x` and lowercases it; the
// hyphens in these singular names are preserved.
const DP_SLUG = 'mcp-write-dp';
const NO_DP_SLUG = 'mcp-write-nodp';

const CM_ACTIONS = {
  create: 'plugin::content-manager.explorer.create',
  read: 'plugin::content-manager.explorer.read',
  update: 'plugin::content-manager.explorer.update',
};

/** Required leaf inside a non-repeatable component: the id-less-create rejection hinges on it. */
const writeComp = {
  displayName: 'mcp-write-comp',
  category: 'mcpwrite',
  attributes: {
    label: { type: 'string', required: true },
    note: { type: 'string' },
  },
};

/** Draft & publish: create resolves to a draft, so required fields are relaxed. */
const dpCt = {
  kind: 'collectionType',
  displayName: 'mcp-write-dp',
  singularName: 'mcp-write-dp',
  pluralName: 'mcp-write-dps',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string', required: true },
    subtitle: { type: 'string' },
    seo: { type: 'component', component: 'mcpwrite.mcp-write-comp', repeatable: false },
  },
};

/** No draft & publish: writes are published, so required scalars stay hard-gated on create. */
const noDpCt = {
  kind: 'collectionType',
  displayName: 'mcp-write-nodp',
  singularName: 'mcp-write-nodp',
  pluralName: 'mcp-write-nodps',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string', required: true },
    seo: { type: 'component', component: 'mcpwrite.mcp-write-comp', repeatable: false },
  },
};

const fieldPermission = (action: string, subject: string, fields: string[]): AdminPermission => ({
  action,
  subject,
  conditions: [],
  properties: { fields },
});

describe('MCP content-manager write contracts (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let mcp: ReturnType<typeof createMcpClient>;
  let tokenCount = 0;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  const deleteAllDocuments = async () => {
    await strapi.db.query(DP_UID).deleteMany({});
    await strapi.db.query(NO_DP_UID).deleteMany({});
  };

  const createAdminToken = async (adminPermissions: AdminPermission[]): Promise<AdminToken> => {
    tokenCount += 1;
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: `mcp-write-token-${tokenCount}`, adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  /** A token permitted on every field of both models, for the non-RBAC contract assertions. */
  const createFullToken = async (): Promise<AdminToken> =>
    createAdminToken([
      fieldPermission(CM_ACTIONS.create, DP_UID, ['title', 'subtitle', 'seo']),
      fieldPermission(CM_ACTIONS.update, DP_UID, ['title', 'subtitle', 'seo']),
      fieldPermission(CM_ACTIONS.read, DP_UID, ['title', 'subtitle', 'seo']),
      fieldPermission(CM_ACTIONS.create, NO_DP_UID, ['title', 'seo']),
      fieldPermission(CM_ACTIONS.update, NO_DP_UID, ['title', 'seo']),
      fieldPermission(CM_ACTIONS.read, NO_DP_UID, ['title', 'seo']),
    ]);

  beforeAll(async () => {
    await builder.addComponent(writeComp).addContentTypes([dpCt, noDpCt]).build();

    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
      bootstrap() {},
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    mcp = createMcpClient(strapi, 'strapi-mcp-write-contracts');
    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
  });

  test('D&P create accepts a draft omitting required scalar and required component, and persists it', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    // Neither `title` (required scalar) nor `seo.label` (required leaf of a required-ish
    // component) is supplied. The admin panel saves this draft, so MCP must too.
    const response = await mcp.callTool(token.accessKey, `create_${DP_SLUG}`, {
      data: { subtitle: 'draft in progress' },
    });

    expectToolOk(response);

    const rows = await strapi.db.query(DP_UID).findMany({});
    expect(rows).toHaveLength(1);
    expect(rows[0].subtitle).toBe('draft in progress');
    expect(rows[0].title).toBeNull();
    expect(rows[0].publishedAt).toBeNull();
  });

  test('D&P create accepts an explicit null on a draft-required scalar', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    // `.optional()` alone would reject this inside the SDK, before the handler runs:
    // omission and `null` are different writes, and only `null` clears a field.
    const response = await mcp.callTool(token.accessKey, `create_${DP_SLUG}`, {
      data: { title: null, subtitle: 'cleared' },
    });

    expectToolOk(response);

    const rows = await strapi.db.query(DP_UID).findMany({});
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBeNull();
  });

  test('non-D&P create still rejects an omitted required scalar at the Zod boundary', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    // The write is published immediately, so the hard gate is kept and the agent gets the
    // earlier, clearer error rather than a late entity-validator failure.
    const response = await mcp.callTool(token.accessKey, `create_${NO_DP_SLUG}`, {
      data: {},
    });

    expectInputValidationError(response);
    await expect(strapi.db.query(NO_DP_UID).findMany({})).resolves.toHaveLength(0);
  });

  test('non-D&P update rejects an id-less nested component that omits its required leaf', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    const seeded = await strapi.documents(NO_DP_UID as UID.CollectionType).create({
      data: { title: 'seeded', seo: { label: 'original' } },
    });

    // An id-less component on update is a *create* server-side (the Document Service deletes
    // the old row and inserts a fresh one), so it must be validated as a create — omitting
    // the required `label` has to be rejected rather than writing an incomplete row.
    const response = await mcp.callTool(token.accessKey, `update_${NO_DP_SLUG}`, {
      documentId: seeded.documentId,
      data: { seo: { note: 'replacement without its required label' } },
    });

    expectInputValidationError(response);

    const rows = await strapi.db.query(NO_DP_UID).findMany({ populate: ['seo'] });
    expect(rows).toHaveLength(1);
    expect(rows[0].seo?.label).toBe('original');
  });

  test('update accepts empty data on both model kinds', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    const dpDoc = await strapi.documents(DP_UID as UID.CollectionType).create({
      data: { title: 'dp' },
    });
    const noDpDoc = await strapi.documents(NO_DP_UID as UID.CollectionType).create({
      data: { title: 'nodp' },
    });

    // Updates are partial on both kinds: omission preserves the current value.
    expectToolOk(
      await mcp.callTool(token.accessKey, `update_${DP_SLUG}`, {
        documentId: dpDoc.documentId,
        data: {},
      })
    );
    expectToolOk(
      await mcp.callTool(token.accessKey, `update_${NO_DP_SLUG}`, {
        documentId: noDpDoc.documentId,
        data: {},
      })
    );
  });

  test('advertised D&P create schema omits required fields from `required` but keeps the hint', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    const tools = await mcp.listTools(token.accessKey);
    const createTool = tools.find((tool) => tool.name === `create_${DP_SLUG}`);
    expect(createTool).toBeDefined();

    const data = (createTool?.inputSchema?.properties as Record<string, any>)?.data;
    expect(data).toBeDefined();
    // The draft-relaxed contract this PR ships: `title` is required in the content type but
    // must not be advertised as required on a D&P create.
    expect(data.required ?? []).not.toContain('title');
    expect(JSON.stringify(data.properties.title)).toContain('fill it in before publishing');
  });

  test('non-D&P update description names the late published-create check', async () => {
    const token = await createFullToken();
    await mcp.initializeSession(token.accessKey);

    const tools = await mcp.listTools(token.accessKey);

    // `update_*`/`write_*` can reach a create on the server (missing locale, first write).
    // On a non-D&P model that create is published, so required fields are enforced late —
    // `tools/list` is the only place an agent can learn that.
    const noDpUpdate = tools.find((tool) => tool.name === `update_${NO_DP_SLUG}`);
    expect(noDpUpdate?.description).toContain('published immediately');

    // A D&P model has no such gap: that create is a draft.
    const dpUpdate = tools.find((tool) => tool.name === `update_${DP_SLUG}`);
    expect(dpUpdate?.description ?? '').not.toContain('published immediately');
  });
});
