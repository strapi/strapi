import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAgent } from 'api-tests/agent';
import { createAuthRequest } from 'api-tests/request';
import type { Core, UID } from '@strapi/types';

/**
 * End-to-end coverage for the MCP relation-shaping output boundary:
 *  - populated relations are reduced to identity-only shape (no leaked target fields);
 *  - to-many relations (including `morphToMany`) return ARRAYS, and the outputSchema
 *    advertised in tools/list declares the same cardinality (the MCP TS SDK does not
 *    validate structuredContent server-side; strict clients validate against tools/list,
 *    so declared-vs-runtime drift breaks them);
 *  - `localizations[].status` is computed BEFORE shaping strips `publishedAt`/`updatedAt`
 *    (calculate, then strip), so it matches what the admin Content Manager shows.
 */

const MCP_PROTOCOL_VERSION = '2025-06-18';

const TARGET_UID = 'api::mcp-shape-target.mcp-shape-target';
const SOURCE_UID = 'api::mcp-shape-source.mcp-shape-source';
const LOCALIZED_UID = 'api::mcp-shape-localized.mcp-shape-localized';

const CM_READ_ACTION = 'plugin::content-manager.explorer.read';

const targetCt = {
  kind: 'collectionType',
  displayName: 'mcp-shape-target',
  singularName: 'mcp-shape-target',
  pluralName: 'mcp-shape-targets',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    secret: { type: 'string' },
  },
};

const sourceCt = {
  kind: 'collectionType',
  displayName: 'mcp-shape-source',
  singularName: 'mcp-shape-source',
  pluralName: 'mcp-shape-sources',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    // Unidirectional to-one / to-many (the CTB "oneWay"/"manyWay" forms are stored like this)
    oneTarget: { type: 'relation', relation: 'oneToOne', target: TARGET_UID },
    manyTargets: { type: 'relation', relation: 'oneToMany', target: TARGET_UID },
    // morphToMany is the runtime relation kind `relations.isAnyToMany` ignores — the
    // output schema used to declare a single object here while the runtime returns an array.
    morphTargets: { type: 'relation', relation: 'morphToMany' },
  },
};

const localizedCt = {
  kind: 'collectionType',
  displayName: 'mcp-shape-localized',
  singularName: 'mcp-shape-localized',
  pluralName: 'mcp-shape-localizeds',
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
};

const EXTRA_LOCALES = [
  { code: 'fr', name: 'French (fr)' },
  { code: 'it', name: 'Italian (it)' },
];

// Identity-only relation shape at the MCP output boundary.
const IDENTITY_KEYS = ['documentId', 'locale', '__type', 'status'];

type AdminPermission = {
  action: string;
  subject: string | null;
  conditions: string[];
  properties: Record<string, unknown>;
};

type AdminToken = {
  id: number;
  name: string;
  accessKey: string;
};

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
};

type JsonRpcResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    tools?: Array<{ name: string; outputSchema?: JsonSchema }>;
    structuredContent?: Record<string, unknown>;
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
};

describe('MCP content-manager relation shaping (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  const createdLocaleIds: number[] = [];
  let tokenCount = 0;
  let rpcId = 0;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  const deleteAllDocuments = async () => {
    await strapi.db.query(SOURCE_UID).deleteMany({});
    await strapi.db.query(TARGET_UID).deleteMany({});
    await strapi.db.query(LOCALIZED_UID).deleteMany({});
  };

  beforeAll(async () => {
    await builder.addContentTypes([targetCt, sourceCt, localizedCt]).build();

    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
      bootstrap() {},
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    await deleteAllAdminTokens();

    for (const locale of EXTRA_LOCALES) {
      const res = await rq({
        method: 'POST',
        url: '/i18n/locales',
        body: { ...locale, isDefault: false },
      });
      expect(res.statusCode).toBe(200);
      createdLocaleIds.push(res.body.id);
    }
  });

  afterAll(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();

    for (const id of createdLocaleIds) {
      await rq({ method: 'DELETE', url: `/i18n/locales/${id}` });
    }

    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
  });

  // ---------------------------------------------------------------------------
  // Helpers (same MCP transport plumbing as mcp-content-manager-rbac.test.api.ts)
  // ---------------------------------------------------------------------------

  const parseMcpResponse = (res: { body?: unknown; text?: string }): JsonRpcResponse => {
    if (res.body !== undefined && Object.keys(res.body as Record<string, unknown>).length > 0) {
      return res.body as JsonRpcResponse;
    }

    if (typeof res.text === 'string' && res.text.length > 0) {
      const dataLines = res.text
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice('data: '.length).trim())
        .filter((line) => line.length > 0 && line !== '[DONE]');

      if (dataLines.length > 0) {
        return JSON.parse(dataLines[dataLines.length - 1]);
      }

      return JSON.parse(res.text);
    }

    return {};
  };

  const mcpPost = async (accessKey: string, body: Record<string, unknown>) =>
    createAgent(strapi)({
      url: '/mcp',
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessKey}`,
      },
      body,
    });

  const mcpRpc = async (accessKey: string, method: string, params?: Record<string, unknown>) => {
    rpcId += 1;
    return mcpPost(accessKey, { jsonrpc: '2.0', id: rpcId, method, params });
  };

  const initializeMcpSession = async (accessKey: string): Promise<void> => {
    rpcId += 1;
    const initRes = await mcpPost(accessKey, {
      jsonrpc: '2.0',
      id: rpcId,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'strapi-mcp-shaping-test', version: '1.0.0' },
      },
    });

    expect(initRes.statusCode).toBe(200);
    expect(parseMcpResponse(initRes)).toMatchObject({ jsonrpc: '2.0', result: expect.any(Object) });

    const notifiedRes = await mcpPost(accessKey, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    expect([200, 202]).toContain(notifiedRes.statusCode);
  };

  const createAdminToken = async (adminPermissions: AdminPermission[]): Promise<AdminToken> => {
    tokenCount += 1;
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: `mcp-shaping-token-${tokenCount}`, adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const callTool = async (
    accessKey: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<JsonRpcResponse> => {
    const res = await mcpRpc(accessKey, 'tools/call', { name, arguments: args });
    return parseMcpResponse(res);
  };

  const getRegisteredTool = async (accessKey: string, name: string) => {
    const res = await mcpRpc(accessKey, 'tools/list');
    expect(res.statusCode).toBe(200);
    const parsed = parseMcpResponse(res);
    expect(parsed.error).toBeUndefined();
    const tool = parsed.result?.tools?.find((entry) => entry.name === name);
    expect(tool).toBeDefined();
    return tool!;
  };

  // Unwraps a (possibly nullable) JSON-Schema node to the object schema carrying `properties`.
  const resolveObjectSchema = (schema: JsonSchema | undefined): JsonSchema | undefined => {
    if (schema === undefined) return undefined;
    if (schema.properties !== undefined) return schema;
    if (Array.isArray(schema.anyOf)) {
      return schema.anyOf.find((candidate) => candidate.properties !== undefined);
    }
    return undefined;
  };

  const readPermission = (
    subject: string,
    // null → all fields permitted (admin "all fields" semantics)
    fields: string[] | null,
    locales?: string[]
  ): AdminPermission => ({
    action: CM_READ_ACTION,
    subject,
    conditions: [],
    properties: { fields, ...(locales !== undefined ? { locales } : {}) },
  });

  const expectIdentityOnly = (entry: Record<string, unknown>) => {
    expect(typeof entry.documentId).toBe('string');
    for (const key of Object.keys(entry)) {
      expect(IDENTITY_KEYS).toContain(key);
    }
  };

  const expectSuccessfulToolCall = (response: JsonRpcResponse) => {
    // A cardinality mismatch between runtime shape and the registered output schema
    // surfaces here: the MCP SDK rejects the structuredContent before it is returned.
    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);
  };

  const seedSourceWithRelations = async () => {
    const target1 = await strapi.documents(TARGET_UID as UID.CollectionType).create({
      data: { name: 'Target 1', secret: 'SECRET-target-1' },
    });
    const target2 = await strapi.documents(TARGET_UID as UID.CollectionType).create({
      data: { name: 'Target 2', secret: 'SECRET-target-2' },
    });

    const source = await strapi.documents(SOURCE_UID as UID.CollectionType).create({
      data: {
        name: 'Source',
        oneTarget: target1.documentId,
        manyTargets: [target1.documentId, target2.documentId],
        morphTargets: {
          connect: [
            { documentId: target1.documentId, __type: TARGET_UID },
            { documentId: target2.documentId, __type: TARGET_UID },
          ],
        },
      } as Record<string, unknown>,
    });

    return { source, target1, target2 };
  };

  // `fields: null` (all fields) keeps morph relations in scope: enumerated field
  // permissions never include morph attributes, which would drop them from both
  // getPermittedFields and the registered output schema.
  const createSourceReadToken = async () =>
    createAdminToken([readPermission(SOURCE_UID, null), readPermission(TARGET_UID, ['name'])]);

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  test('get tool returns identity-only relations, with ARRAYS for to-many and morphToMany', async () => {
    const { source, target1, target2 } = await seedSourceWithRelations();

    const token = await createSourceReadToken();
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, 'get_mcp-shape-source', {
      documentId: source.documentId,
    });

    expectSuccessfulToolCall(response);

    const data = response.result?.structuredContent?.data as Record<string, unknown>;
    expect(data).toBeDefined();
    expect(data.name).toBe('Source');

    // to-one → single identity object
    expect(data.oneTarget).toEqual({ documentId: target1.documentId });

    // unidirectional oneToMany → identity array
    expect(Array.isArray(data.manyTargets)).toBe(true);
    const manyTargets = data.manyTargets as Array<Record<string, unknown>>;
    expect(manyTargets).toHaveLength(2);
    manyTargets.forEach(expectIdentityOnly);
    expect(manyTargets.map((entry) => entry.documentId).sort()).toEqual(
      [target1.documentId, target2.documentId].sort()
    );

    // morphToMany → identity array (regression for the isAnyToMany schema/runtime mismatch)
    expect(Array.isArray(data.morphTargets)).toBe(true);
    const morphTargets = data.morphTargets as Array<Record<string, unknown>>;
    expect(morphTargets).toHaveLength(2);
    morphTargets.forEach(expectIdentityOnly);

    // No target field leaks anywhere in the payload (regression for the original leak fix)
    const serialized = JSON.stringify(response.result?.structuredContent);
    expect(serialized).not.toContain('SECRET-');
    expect(serialized).not.toContain('Target 1');
  });

  test('registered output schema agrees with the runtime relation shapes', async () => {
    // The MCP TS SDK does not validate structuredContent server-side; strict clients
    // (MCP Inspector, Claude) validate against the outputSchema advertised in tools/list,
    // so a declared-vs-runtime cardinality mismatch breaks them. This pins the contract.
    const token = await createSourceReadToken();
    await initializeMcpSession(token.accessKey);

    const tool = await getRegisteredTool(token.accessKey, 'get_mcp-shape-source');

    const dataSchema = resolveObjectSchema(tool.outputSchema?.properties?.data);
    expect(dataSchema).toBeDefined();

    // to-many → declared as an identity array (runtime returns an array — see get test)
    const manyTargetsSchema = dataSchema!.properties?.manyTargets;
    expect(manyTargetsSchema?.type).toBe('array');
    expect(resolveObjectSchema(manyTargetsSchema?.items)?.properties).toHaveProperty('documentId');

    // to-one → declared as a single (nullable) identity object
    expect(resolveObjectSchema(dataSchema!.properties?.oneTarget)?.properties).toHaveProperty(
      'documentId'
    );

    // Morph relations are dropped from the content-manager model DTO
    // (data-mapper formatAttributes ignores morphs), so the registered schema does not
    // declare them — they pass through the loose object unconstrained. The runtime still
    // returns identity arrays for them (see get test). If morphs ever land in the DTO,
    // the shape↔schema agreement unit tests (output-schemas.test.ts) guarantee the
    // declared schema becomes an array, not a single object.
    expect(dataSchema!.properties?.morphTargets).toBeUndefined();
  });

  test('list tool returns identity-only relation arrays in results', async () => {
    const { source } = await seedSourceWithRelations();

    const token = await createSourceReadToken();
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, 'list_mcp-shape-source', {});

    expectSuccessfulToolCall(response);

    const results = response.result?.structuredContent?.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe(source.documentId);

    expect(Array.isArray(results[0].manyTargets)).toBe(true);
    (results[0].manyTargets as Array<Record<string, unknown>>).forEach(expectIdentityOnly);

    expect(JSON.stringify(response.result?.structuredContent)).not.toContain('SECRET-');
  });

  test('localizations carry the status computed BEFORE shaping strips timestamps', async () => {
    const uid = LOCALIZED_UID as UID.CollectionType;

    // en: draft only → top-level status 'draft'
    const document = await strapi.documents(uid).create({
      data: { title: 'EN draft' },
      locale: 'en',
    });

    // fr: published, then the draft is modified afterwards → status 'modified'
    await strapi.documents(uid).update({
      documentId: document.documentId,
      locale: 'fr',
      data: { title: 'FR v1' },
    });
    await strapi.documents(uid).publish({ documentId: document.documentId, locale: 'fr' });
    // Status 'modified' relies on draft.updatedAt > published.updatedAt — make the gap unambiguous.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    await strapi.documents(uid).update({
      documentId: document.documentId,
      locale: 'fr',
      data: { title: 'FR v2' },
    });

    // it: published and untouched since → status 'published'
    await strapi.documents(uid).update({
      documentId: document.documentId,
      locale: 'it',
      data: { title: 'IT v1' },
    });
    await strapi.documents(uid).publish({ documentId: document.documentId, locale: 'it' });

    const token = await createAdminToken([
      readPermission(LOCALIZED_UID, ['title'], ['en', 'fr', 'it']),
    ]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, 'get_mcp-shape-localized', {
      documentId: document.documentId,
      locale: 'en',
    });

    expectSuccessfulToolCall(response);

    const data = response.result?.structuredContent?.data as Record<string, unknown>;
    expect(data).toBeDefined();
    expect(data.status).toBe('draft');

    const localizations = data.localizations as Array<Record<string, unknown>>;
    expect(Array.isArray(localizations)).toBe(true);
    expect(localizations).toHaveLength(2);
    localizations.forEach(expectIdentityOnly);

    // Identity-only shape WITH the freshly-computed status (admin parity)
    expect(localizations).toEqual(
      expect.arrayContaining([
        { documentId: document.documentId, locale: 'fr', status: 'modified' },
        { documentId: document.documentId, locale: 'it', status: 'published' },
      ])
    );
  });
});
