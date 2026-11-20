import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';
import { createMcpClient, expectExecutionError, expectToolOk } from './utils/mcp-client';
import type { AdminPermission, AdminToken, JsonRpcResponse } from './utils/mcp-client';
import { getStrictClientUsableTools, JSON_SCHEMA_2020_12 } from './utils/strict-tool-client';

const MODEL_UID = 'api::mcp-comp-doc.mcp-comp-doc';
const SLUG = 'mcp-comp-doc';

const component = {
  displayName: 'mcp-comp-item',
  attributes: {
    label: { type: 'string' },
  },
};

const ct = {
  kind: 'collectionType',
  displayName: 'mcp-comp-doc',
  singularName: 'mcp-comp-doc',
  pluralName: 'mcp-comp-docs',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    singleComp: { type: 'component', component: 'default.mcp-comp-item', repeatable: false },
    repeatComp: { type: 'component', component: 'default.mcp-comp-item', repeatable: true },
  },
};

type ComponentEntry = { id: number; label: string };

describe('MCP content-manager component ids (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let mcp: ReturnType<typeof createMcpClient>;
  let tokenCount = 0;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  const deleteAllDocuments = async () => {
    await strapi.db.query(MODEL_UID).deleteMany({});
  };

  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();

    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
      bootstrap() {},
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    mcp = createMcpClient(strapi, 'strapi-mcp-component-ids-test');
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

  const createAdminToken = async (adminPermissions: AdminPermission[]): Promise<AdminToken> => {
    tokenCount += 1;
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: `mcp-comp-ids-token-${tokenCount}`, adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const createFullAccessKey = async (): Promise<string> => {
    const token = await createAdminToken([
      {
        action: 'plugin::content-manager.explorer.read',
        subject: MODEL_UID,
        conditions: [],
        properties: { fields: null },
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: MODEL_UID,
        conditions: [],
        properties: { fields: null },
      },
      {
        action: 'plugin::content-manager.explorer.update',
        subject: MODEL_UID,
        conditions: [],
        properties: { fields: null },
      },
      {
        action: 'plugin::content-manager.explorer.delete',
        subject: MODEL_UID,
        conditions: [],
        properties: {},
      },
      {
        action: 'plugin::content-manager.explorer.publish',
        subject: MODEL_UID,
        conditions: [],
        properties: {},
      },
    ]);
    await mcp.initializeSession(token.accessKey);
    return token.accessKey;
  };

  const dataOf = (res: JsonRpcResponse): Record<string, unknown> => {
    const data = res.result?.structuredContent?.data;
    expect(data).toBeDefined();
    return data as Record<string, unknown>;
  };

  const componentsOf = (
    data: Record<string, unknown>
  ): { singleComp: ComponentEntry; repeatComp: ComponentEntry[] } => {
    const { singleComp, repeatComp } = data as {
      singleComp?: ComponentEntry;
      repeatComp?: ComponentEntry[];
    };
    expect(singleComp?.id).toEqual(expect.any(Number));
    expect(Array.isArray(repeatComp)).toBe(true);
    return { singleComp: singleComp as ComponentEntry, repeatComp: repeatComp as ComponentEntry[] };
  };

  const createDoc = (accessKey: string, title: string) =>
    mcp.callTool(accessKey, `create_${SLUG}`, {
      data: {
        title,
        singleComp: { label: `${title}-single` },
        repeatComp: [{ label: `${title}-1` }, { label: `${title}-2` }],
      },
    });

  test('advertised create and update input schemas carry the component id and pass the strict client gate', async () => {
    const accessKey = await createFullAccessKey();

    const tools = await mcp.listTools(accessKey);
    expect(tools.length).toBeGreaterThan(0);
    expect(getStrictClientUsableTools(tools)).toHaveLength(tools.length);

    for (const tool of tools) {
      expect([undefined, JSON_SCHEMA_2020_12]).toContain(tool.inputSchema.$schema);
      if (tool.outputSchema !== undefined) {
        expect([undefined, JSON_SCHEMA_2020_12]).toContain(tool.outputSchema.$schema);
      }
    }

    for (const name of [`create_${SLUG}`, `update_${SLUG}`]) {
      const tool = tools.find((entry) => entry.name === name);
      expect(tool).toBeDefined();
      const schemaText = JSON.stringify(tool?.inputSchema);
      expect(schemaText).toContain('"id":{');
      expect(schemaText).toContain('ID of an existing entry to keep and update');
    }
  });

  test('component ids stay the same across a get then update round trip', async () => {
    const accessKey = await createFullAccessKey();

    const created = await createDoc(accessKey, 'roundtrip');
    expectToolOk(created);
    const documentId = dataOf(created).documentId as string;

    const before = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId });
    expectToolOk(before);
    const beforeComps = componentsOf(dataOf(before));
    expect(beforeComps.repeatComp).toHaveLength(2);
    beforeComps.repeatComp.forEach((entry) => expect(entry.id).toEqual(expect.any(Number)));

    const updated = await mcp.callTool(accessKey, `update_${SLUG}`, {
      documentId,
      data: {
        singleComp: { ...beforeComps.singleComp, label: 'roundtrip-single-updated' },
        repeatComp: beforeComps.repeatComp.map((entry) => ({
          ...entry,
          label: `${entry.label}-updated`,
        })),
      },
    });
    expectToolOk(updated);

    const after = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId });
    expectToolOk(after);
    const afterComps = componentsOf(dataOf(after));

    expect(afterComps.singleComp.id).toBe(beforeComps.singleComp.id);
    expect(afterComps.singleComp.label).toBe('roundtrip-single-updated');
    expect(afterComps.repeatComp.map((entry) => entry.id)).toEqual(
      beforeComps.repeatComp.map((entry) => entry.id)
    );
    expect(afterComps.repeatComp.map((entry) => entry.label)).toEqual([
      'roundtrip-1-updated',
      'roundtrip-2-updated',
    ]);
  });

  test('an id from another entry or from the published version is rejected and stored rows do not change', async () => {
    const accessKey = await createFullAccessKey();

    const docA = await createDoc(accessKey, 'aaa');
    expectToolOk(docA);
    const docAId = dataOf(docA).documentId as string;
    const docB = await createDoc(accessKey, 'bbb');
    expectToolOk(docB);
    const docBId = dataOf(docB).documentId as string;

    const getA = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId: docAId });
    expectToolOk(getA);
    const snapshotA = componentsOf(dataOf(getA));

    const getB = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId: docBId });
    expectToolOk(getB);
    const snapshotB = componentsOf(dataOf(getB));

    const foreignRepeat = await mcp.callTool(accessKey, `update_${SLUG}`, {
      documentId: docAId,
      data: { repeatComp: [{ id: snapshotB.repeatComp[0].id, label: 'foreign' }] },
    });
    expectExecutionError(foreignRepeat, `update_${SLUG}`, 'not related to the entity');

    const foreignSingle = await mcp.callTool(accessKey, `update_${SLUG}`, {
      documentId: docAId,
      data: { singleComp: { id: snapshotB.singleComp.id, label: 'foreign' } },
    });
    expectExecutionError(foreignSingle, `update_${SLUG}`, 'not related to the entity');

    const published = await mcp.callTool(accessKey, `publish_${SLUG}`, { documentId: docAId });
    expectToolOk(published);

    const publishedGet = await mcp.callTool(accessKey, `get_${SLUG}`, {
      documentId: docAId,
      status: 'published',
    });
    expectToolOk(publishedGet);
    const publishedComps = componentsOf(dataOf(publishedGet));
    expect(snapshotA.repeatComp.map((entry) => entry.id)).not.toContain(
      publishedComps.repeatComp[0].id
    );

    const stalePublished = await mcp.callTool(accessKey, `update_${SLUG}`, {
      documentId: docAId,
      data: { repeatComp: [{ id: publishedComps.repeatComp[0].id, label: 'stale' }] },
    });
    expectExecutionError(stalePublished, `update_${SLUG}`, 'not related to the entity');

    const afterA = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId: docAId });
    expectToolOk(afterA);
    expect(componentsOf(dataOf(afterA))).toEqual(snapshotA);

    const afterB = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId: docBId });
    expectToolOk(afterB);
    expect(componentsOf(dataOf(afterB))).toEqual(snapshotB);
  });

  test('create ignores a passed component id and the other entry keeps its rows', async () => {
    const accessKey = await createFullAccessKey();

    const other = await createDoc(accessKey, 'other');
    expectToolOk(other);
    const otherId = dataOf(other).documentId as string;

    const otherGet = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId: otherId });
    expectToolOk(otherGet);
    const otherSnapshot = componentsOf(dataOf(otherGet));

    const created = await mcp.callTool(accessKey, `create_${SLUG}`, {
      data: {
        title: 'fresh',
        singleComp: { id: otherSnapshot.singleComp.id, label: 'fresh-single' },
        repeatComp: [{ id: otherSnapshot.repeatComp[0].id, label: 'fresh-1' }],
      },
    });
    expectToolOk(created);
    const createdComps = componentsOf(dataOf(created));

    expect(createdComps.singleComp.id).not.toBe(otherSnapshot.singleComp.id);
    expect(createdComps.singleComp.label).toBe('fresh-single');
    expect(createdComps.repeatComp).toHaveLength(1);
    expect(createdComps.repeatComp[0].id).not.toBe(otherSnapshot.repeatComp[0].id);
    expect(createdComps.repeatComp[0].label).toBe('fresh-1');

    const otherAfter = await mcp.callTool(accessKey, `get_${SLUG}`, { documentId: otherId });
    expectToolOk(otherAfter);
    expect(componentsOf(dataOf(otherAfter))).toEqual(otherSnapshot);
  });
});
