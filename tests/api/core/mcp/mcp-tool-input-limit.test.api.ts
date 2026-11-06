import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core, UID } from '@strapi/types';
import { createMcpClient, expectToolError, expectToolOk } from './utils/mcp-client';

const MODEL_UID = 'api::mcp-limit-doc.mcp-limit-doc';
const SLUG = 'mcp-limit-doc';
const LIMIT = 10;

const ct = {
  kind: 'collectionType',
  displayName: 'mcp-limit-doc',
  singularName: 'mcp-limit-doc',
  pluralName: 'mcp-limit-docs',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    tags: { type: 'json' },
  },
};

describe('MCP tool input element limit (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let mcp: ReturnType<typeof createMcpClient>;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
        instance.config.set('server.mcp.maxToolInputElements', LIMIT);
      },
      bootstrap() {},
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    mcp = createMcpClient(strapi, 'strapi-mcp-limit-test');
    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await strapi.db.query(MODEL_UID).deleteMany({});
    await deleteAllAdminTokens();
    await strapi.destroy();
    await builder.cleanup();
  });

  test('rejects a tool call above the configured limit without creating an entry', async () => {
    const adminPermissions = ['create', 'read'].map((action) => ({
      action: `plugin::content-manager.explorer.${action}`,
      subject: MODEL_UID,
      conditions: [],
      properties: { fields: ['title', 'tags'] },
    }));
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: 'mcp-limit-token', adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    const token = res.body.data;
    await mcp.initializeSession(token.accessKey);

    // `data`, `title` and `tags` count toward the limit, plus one per array element.
    const createWithTags = (count: number) =>
      mcp.callTool(token.accessKey, `create_${SLUG}`, {
        data: { title: `${count} tags`, tags: Array.from({ length: count }, () => 'tag') },
      });

    expectToolError(await createWithTags(LIMIT - 2), `maximum of ${LIMIT} elements`);
    expect(await strapi.documents(MODEL_UID as UID.CollectionType).findMany({})).toHaveLength(0);

    expectToolOk(await createWithTags(LIMIT - 3));
    expect(await strapi.documents(MODEL_UID as UID.CollectionType).findMany({})).toHaveLength(1);
  });
});
