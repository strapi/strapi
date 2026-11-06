import crypto from 'node:crypto';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAgent } from 'api-tests/agent';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';
import { z } from '@strapi/utils';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const TEST_TOOL_NAME = 'mcp-oauth-test-tool';
const AUTHORIZED_ACTION = 'admin::webhooks.read';
const REDIRECT_URI = 'http://127.0.0.1:33418/callback';

type GrantTokens = {
  access_token: string;
  refresh_token: string;
};

describe('MCP OAuth authentication (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let clientId: string;
  let rpcId = 0;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
        instance.config.set('server.mcp.oauth.enabled', true);
      },
      bootstrap({ strapi: instance }) {
        instance.ai.mcp.registerTool({
          name: TEST_TOOL_NAME,
          title: 'MCP OAuth Test Tool',
          description: 'Only used by MCP OAuth API integration tests',
          auth: { policies: [{ action: AUTHORIZED_ACTION }] },
          resolveInputSchema: () => z.object({}),
          resolveOutputSchema: () => z.object({ ok: z.boolean() }),
          createHandler: () => async () => ({ structuredContent: { ok: true }, content: [] }),
        });
      },
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });

    // One shared public client for the whole suite (the register endpoint is rate limited).
    const res = await createAgent(strapi)({
      url: '/mcp/oauth/register',
      method: 'POST',
      body: {
        client_name: 'MCP OAuth API test client',
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: 'none',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.client_secret).toBeUndefined();
    clientId = res.body.client_id;
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  const makePkcePair = () => {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    return { verifier, challenge };
  };

  const authorize = async (
    challenge: string,
    { state = 'test-state', ...overrides }: Record<string, string | undefined> = {}
  ) => {
    return createAgent(strapi)({
      url: '/mcp/oauth/authorize',
      method: 'GET',
      qs: {
        response_type: 'code',
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        ...overrides,
      },
    });
  };

  const getTicket = async (challenge: string): Promise<string> => {
    const res = await authorize(challenge);

    expect(res.statusCode).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.pathname).toBe('/admin/mcp/oauth/consent');

    const ticket = location.searchParams.get('ticket');
    expect(ticket).toEqual(expect.any(String));

    return ticket as string;
  };

  const approve = async (ticket: string): Promise<string> => {
    const res = await rq({
      url: '/admin/mcp/oauth/consent',
      method: 'POST',
      body: { ticket, decision: 'approve' },
    });

    expect(res.statusCode).toBe(200);

    const redirectTo = new URL(res.body.data.redirectTo);
    expect(`${redirectTo.origin}${redirectTo.pathname}`).toBe(REDIRECT_URI);
    expect(redirectTo.searchParams.get('state')).toBe('test-state');
    expect(redirectTo.searchParams.get('iss')).toEqual(expect.any(String));

    const code = redirectTo.searchParams.get('code');
    expect(code).toEqual(expect.any(String));

    return code as string;
  };

  const exchangeCode = async (code: string, verifier: string) => {
    return createAgent(strapi)({
      url: '/mcp/oauth/token',
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      },
    });
  };

  /** Runs the whole authorization code + PKCE flow and returns the issued tokens. */
  const obtainGrant = async (): Promise<GrantTokens> => {
    const { verifier, challenge } = makePkcePair();
    const ticket = await getTicket(challenge);
    const code = await approve(ticket);

    const res = await exchangeCode(code, verifier);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: expect.any(Number),
      refresh_token: expect.any(String),
    });

    return res.body;
  };

  const refresh = async (refreshToken: string) => {
    return createAgent(strapi)({
      url: '/mcp/oauth/token',
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      },
    });
  };

  const mcpRpc = async (accessToken: string | undefined, method: string) => {
    rpcId += 1;

    const headers: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    };

    if (accessToken !== undefined) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return createAgent(strapi)({
      url: '/mcp',
      method: 'POST',
      headers,
      body: { jsonrpc: '2.0', id: rpcId, method },
    });
  };

  const parseMcpResponse = (res: { body?: unknown; text?: string }) => {
    if (res.body !== undefined && Object.keys(res.body as Record<string, unknown>).length > 0) {
      return res.body as Record<string, any>;
    }

    const dataLines = (res.text ?? '')
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice('data: '.length).trim())
      .filter((line) => line.length > 0 && line !== '[DONE]');

    return dataLines.length > 0 ? JSON.parse(dataLines[dataLines.length - 1]) : {};
  };

  const listTools = async (accessToken: string): Promise<string[]> => {
    const res = await mcpRpc(accessToken, 'tools/list');

    expect(res.statusCode).toBe(200);
    const rpcResponse = parseMcpResponse(res);
    expect(rpcResponse.error).toBeUndefined();

    return rpcResponse.result?.tools?.map((tool: { name: string }) => tool.name) ?? [];
  };

  describe('discovery', () => {
    test('serves the protected resource metadata', async () => {
      for (const url of [
        '/.well-known/oauth-protected-resource',
        '/.well-known/oauth-protected-resource/mcp',
      ]) {
        const res = await createAgent(strapi)({ url, method: 'GET' });

        expect(res.statusCode).toBe(200);
        expect(res.body.resource).toMatch(/\/mcp$/);
        expect(res.body.authorization_servers).toHaveLength(1);
        expect(res.body.bearer_methods_supported).toEqual(['header']);
      }
    });

    test('serves the authorization server metadata', async () => {
      const res = await createAgent(strapi)({
        url: '/.well-known/oauth-authorization-server',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.authorization_endpoint).toMatch(/\/mcp\/oauth\/authorize$/);
      expect(res.body.token_endpoint).toMatch(/\/mcp\/oauth\/token$/);
      expect(res.body.registration_endpoint).toMatch(/\/mcp\/oauth\/register$/);
      expect(res.body.response_types_supported).toEqual(['code']);
      expect(res.body.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
      expect(res.body.code_challenge_methods_supported).toEqual(['S256']);
    });

    test('unauthenticated /mcp requests point at the resource metadata', async () => {
      const res = await mcpRpc(undefined, 'tools/list');

      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toMatch(
        /^Bearer resource_metadata=".*\/\.well-known\/oauth-protected-resource\/mcp"$/
      );
    });
  });

  describe('authorization endpoint', () => {
    test('rejects an unregistered redirect_uri without redirecting', async () => {
      const { challenge } = makePkcePair();
      const res = await authorize(challenge, { redirect_uri: 'https://evil.example/cb' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });

    test('rejects a request without PKCE in place, never redirecting', async () => {
      // Registration is open, so error redirects would make the endpoint an open redirector.
      const res = await authorize('', { code_challenge: undefined });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid_request');
      expect(res.headers.location).toBeUndefined();
    });
  });

  describe('consent', () => {
    test('describes a pending authorization request to the admin', async () => {
      const { challenge } = makePkcePair();
      const ticket = await getTicket(challenge);

      const res = await rq({
        url: '/admin/mcp/oauth/authorization-request',
        method: 'GET',
        qs: { ticket },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        client: { name: 'MCP OAuth API test client' },
        redirectUri: REDIRECT_URI,
        redirectHost: '127.0.0.1:33418',
      });
    });

    test('rejects an invalid ticket', async () => {
      const res = await rq({
        url: '/admin/mcp/oauth/authorization-request',
        method: 'GET',
        qs: { ticket: 'garbage' },
      });

      expect(res.statusCode).toBe(400);
    });

    test('requires admin authentication', async () => {
      const { challenge } = makePkcePair();
      const ticket = await getTicket(challenge);

      const res = await createAgent(strapi)({
        url: '/admin/mcp/oauth/consent',
        method: 'POST',
        body: { ticket, decision: 'approve' },
      });

      expect(res.statusCode).toBe(401);
    });

    test('a denial redirects back with access_denied and no code', async () => {
      const { challenge } = makePkcePair();
      const ticket = await getTicket(challenge);

      const res = await rq({
        url: '/admin/mcp/oauth/consent',
        method: 'POST',
        body: { ticket, decision: 'deny' },
      });

      expect(res.statusCode).toBe(200);
      const redirectTo = new URL(res.body.data.redirectTo);
      expect(redirectTo.searchParams.get('error')).toBe('access_denied');
      expect(redirectTo.searchParams.get('code')).toBeNull();
    });
  });

  describe('token issuance and MCP access', () => {
    test('the full authorization code + PKCE flow yields a working MCP token', async () => {
      const tokens = await obtainGrant();

      await expect(listTools(tokens.access_token)).resolves.toContain(TEST_TOOL_NAME);
    });

    test('rejects a wrong PKCE verifier', async () => {
      const { challenge } = makePkcePair();
      const { verifier: otherVerifier } = makePkcePair();
      const ticket = await getTicket(challenge);
      const code = await approve(ticket);

      const res = await exchangeCode(code, otherVerifier);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid_grant');
    });

    test('a replayed code is rejected and revokes the tokens it issued', async () => {
      const { verifier, challenge } = makePkcePair();
      const ticket = await getTicket(challenge);
      const code = await approve(ticket);

      const first = await exchangeCode(code, verifier);
      expect(first.statusCode).toBe(200);

      const replay = await exchangeCode(code, verifier);
      expect(replay.statusCode).toBe(400);
      expect(replay.body.error).toBe('invalid_grant');

      const res = await mcpRpc(first.body.access_token, 'tools/list');
      expect(res.statusCode).toBe(401);
    });

    test('refresh rotates the tokens, and reusing the old refresh token revokes the grant', async () => {
      const tokens = await obtainGrant();

      const rotated = await refresh(tokens.refresh_token);
      expect(rotated.statusCode).toBe(200);
      expect(rotated.body.refresh_token).not.toBe(tokens.refresh_token);

      await expect(listTools(rotated.body.access_token)).resolves.toContain(TEST_TOOL_NAME);

      // Replaying the rotated-out refresh token is treated as a leak: the family dies.
      const replay = await refresh(tokens.refresh_token);
      expect(replay.statusCode).toBe(400);
      expect(replay.body.error).toBe('invalid_grant');

      const afterReplay = await refresh(rotated.body.refresh_token);
      expect(afterReplay.statusCode).toBe(400);

      const res = await mcpRpc(rotated.body.access_token, 'tools/list');
      expect(res.statusCode).toBe(401);
    });

    test('revocation kills the grant immediately', async () => {
      const tokens = await obtainGrant();

      const res = await createAgent(strapi)({
        url: '/mcp/oauth/revoke',
        method: 'POST',
        body: { client_id: clientId, token: tokens.refresh_token },
      });
      expect(res.statusCode).toBe(200);

      const mcpRes = await mcpRpc(tokens.access_token, 'tools/list');
      expect(mcpRes.statusCode).toBe(401);
    });

    test('deactivating the admin user cuts MCP access on the next request', async () => {
      const tokens = await obtainGrant();
      await expect(listTools(tokens.access_token)).resolves.toContain(TEST_TOOL_NAME);

      const me = await rq({ url: '/admin/users/me', method: 'GET' });
      const userId = me.body.data.id;

      await strapi.db.query('admin::user').update({
        where: { id: userId },
        data: { isActive: false },
      });

      try {
        const res = await mcpRpc(tokens.access_token, 'tools/list');
        expect(res.statusCode).toBe(401);
      } finally {
        await strapi.db.query('admin::user').update({
          where: { id: userId },
          data: { isActive: true },
        });
      }
    });

    test('admin API tokens keep working on /mcp with OAuth enabled', async () => {
      const tokenRes = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'mcp-oauth-coexistence-token' },
      });
      expect(tokenRes.statusCode).toBe(201);

      const res = await mcpRpc(tokenRes.body.data.accessKey, 'tools/list');

      expect(res.statusCode).toBe(200);
      expect(parseMcpResponse(res).error).toBeUndefined();
    });
  });
});
