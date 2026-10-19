import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';

// eslint-disable-next-line import/no-relative-packages -- calls the real filters builder from a stub tool
import { buildFiltersSchema } from '../../../../../../content-manager/server/src/mcp/schemas/filters-schema';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../McpServerFactory';
import { classifyMcpToolRegistration } from '../classify-mcp-tool-registration';
import { mcpToolSchemaCache } from '../tool-schema-cache';
import type { McpToolRegistrationPlan } from '../classify-mcp-tool-registration';

const JSON_SCHEMA_OPTIONS = { target: 'draft-2020-12' as const };

const createStrapi = () =>
  ({
    log: { error: jest.fn(), info: jest.fn(), debug: jest.fn() },
    telemetry: { send: jest.fn().mockResolvedValue(true) },
  }) as unknown as Core.Strapi;

const connect = async (
  strapi: Core.Strapi,
  tools: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>,
  toolRegistration: McpToolRegistrationPlan,
  ability: { can: jest.Mock } = { can: jest.fn(() => true) }
) => {
  const { mcpServer } = await createMcpServerWithRegistries({
    strapi,
    definitions: {
      tools,
      prompts: new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
        'prompt'
      ),
      resources: new McpCapabilityDefinitionRegistry<'resource', Modules.MCP.McpResourceDefinition>(
        'resource'
      ),
    },
    isDevMode: false,
    ability,
    user: { id: 1 },
    toolRegistration,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'request-tool-registration', version: '1.0.0' });
  await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: () => Promise.all([client.close(), mcpServer.close()]),
  };
};

const defineTool = (
  name: string,
  action: string,
  resolvers: {
    resolveInputSchema: Modules.MCP.McpToolDefinition['resolveInputSchema'];
    resolveOutputSchema: Modules.MCP.McpToolDefinition['resolveOutputSchema'];
    resolveSchemaProjection?: (context: Modules.MCP.McpHandlerContext) => {
      fieldSets: ReadonlyArray<readonly string[]>;
      localeSets: ReadonlyArray<readonly string[]>;
    };
  }
) =>
  ({
    name,
    title: name,
    description: name,
    auth: { policies: [{ action }] },
    createHandler: () => async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
      structuredContent: { ok: true },
    }),
    ...resolvers,
  }) as Modules.MCP.McpToolDefinition;

describe('request-directed MCP tool registration', () => {
  beforeEach(() => {
    mcpToolSchemaCache.clear();
  });

  test.each([
    ['initialize', { jsonrpc: '2.0', id: 1, method: 'initialize' }],
    ['notification', { jsonrpc: '2.0', method: 'notifications/initialized' }],
    ['ping', { jsonrpc: '2.0', id: 1, method: 'ping' }],
    ['unknown method', { jsonrpc: '2.0', id: 1, method: 'prompts/list' }],
    ['malformed body', { foo: 'bar' }],
  ])(
    '%s registers no tool schemas while still advertising the tools capability',
    async (_label, body) => {
      const strapi = createStrapi();
      const resolveInputSchema = jest.fn(() => z.object({ name: z.string() }));
      const resolveOutputSchema = jest.fn(() => z.object({ ok: z.boolean() }));
      const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
        'tool'
      );
      tools.define(defineTool('visible', 'test.read', { resolveInputSchema, resolveOutputSchema }));

      const session = await connect(strapi, tools, classifyMcpToolRegistration(body));
      try {
        expect(session.client.getServerCapabilities()?.tools).toBeDefined();
        await expect(session.client.listTools()).resolves.toEqual({ tools: [] });
        expect(resolveInputSchema).not.toHaveBeenCalled();
        expect(resolveOutputSchema).not.toHaveBeenCalled();
      } finally {
        await session.close();
      }
    }
  );

  test('tools/call resolves only the named authorized tool and validates with live Zod', async () => {
    const strapi = createStrapi();
    const namedInput = jest.fn(() => z.object({ name: z.string() }));
    const namedOutput = jest.fn(() => z.object({ ok: z.boolean() }));
    const otherInput = jest.fn(() => z.object({ extra: z.string() }));
    const otherOutput = jest.fn(() => z.object({ ok: z.boolean() }));
    const handler = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
      structuredContent: { ok: true },
    }));
    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define({
      ...defineTool('named', 'test.read', {
        resolveInputSchema: namedInput,
        resolveOutputSchema: namedOutput,
      }),
      createHandler: () => handler,
    });
    tools.define(
      defineTool('other', 'test.read', {
        resolveInputSchema: otherInput,
        resolveOutputSchema: otherOutput,
      })
    );

    const session = await connect(strapi, tools, { mode: 'call', names: new Set(['named']) });
    try {
      await expect(
        session.client.callTool({ name: 'named', arguments: { name: 'Ada' } })
      ).resolves.toMatchObject({ structuredContent: { ok: true } });
      await expect(
        session.client.callTool({ name: 'named', arguments: { name: 1 } })
      ).resolves.toMatchObject({
        isError: true,
        content: [{ type: 'text', text: expect.stringContaining('Input validation error') }],
      });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(namedInput).toHaveBeenCalledTimes(1);
      expect(namedOutput).toHaveBeenCalledTimes(1);
      expect(otherInput).not.toHaveBeenCalled();
      expect(otherOutput).not.toHaveBeenCalled();
    } finally {
      await session.close();
    }
  });

  test('a token with no permission does not build filters schemas for hidden tools', async () => {
    const strapi = createStrapi();
    const filters = jest.fn(() =>
      buildFiltersSchema({ title: { type: 'string' }, count: { type: 'integer' } } as never)
    );
    const output = jest.fn(() => z.object({ ok: z.boolean() }));
    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define(
      defineTool('list_article', 'plugin::content-manager.explorer.read', {
        resolveInputSchema: filters,
        resolveOutputSchema: output,
      })
    );

    const session = await connect(strapi, tools, { mode: 'list' }, { can: jest.fn(() => false) });
    try {
      await expect(session.client.listTools()).resolves.toEqual({ tools: [] });
      await expect(
        session.client.callTool({ name: 'list_article', arguments: {} })
      ).rejects.toThrow(/not found/);
      expect(filters).not.toHaveBeenCalled();
      expect(output).not.toHaveBeenCalled();
    } finally {
      await session.close();
    }
  });

  test('unauthorized tools/call is reported as not found', async () => {
    const strapi = createStrapi();
    const resolveInputSchema = jest.fn(() => z.object({}));
    const resolveOutputSchema = jest.fn(() => z.object({ ok: z.boolean() }));
    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define(defineTool('hidden', 'hidden.read', { resolveInputSchema, resolveOutputSchema }));

    const session = await connect(
      strapi,
      tools,
      { mode: 'call', names: new Set(['hidden']) },
      { can: jest.fn(() => false) }
    );
    try {
      await expect(session.client.callTool({ name: 'hidden', arguments: {} })).rejects.toThrow(
        /not found/
      );
      expect(resolveInputSchema).not.toHaveBeenCalled();
    } finally {
      await session.close();
    }
  });

  test('tools/list cache hit matches a live conversion and does not rebuild', async () => {
    const strapi = createStrapi();
    const toJSONSchema = jest.spyOn(z, 'toJSONSchema');
    const projection = { field: 'title' };
    const resolveInputSchema = jest.fn(() => z.object({ [projection.field]: z.string() }));
    const resolveOutputSchema = jest.fn(() => z.object({ [projection.field]: z.string() }));
    const toolsFor = () => {
      const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
        'tool'
      );
      tools.define(
        defineTool('list_article', 'test.read', {
          resolveInputSchema,
          resolveOutputSchema,
          resolveSchemaProjection: () => ({
            fieldSets: [[projection.field]],
            localeSets: [['en']],
          }),
        })
      );
      return tools;
    };

    const first = await connect(strapi, toolsFor(), { mode: 'list' });
    let listed: Awaited<ReturnType<Client['listTools']>>;
    try {
      listed = await first.client.listTools();
    } finally {
      await first.close();
    }

    const liveInput = z.toJSONSchema(resolveInputSchema.mock.results[0].value, {
      ...JSON_SCHEMA_OPTIONS,
      io: 'input',
    });
    const liveOutput = z.toJSONSchema(resolveOutputSchema.mock.results[0].value, {
      ...JSON_SCHEMA_OPTIONS,
      io: 'output',
    });
    expect(listed.tools).toHaveLength(1);
    expect(listed.tools[0].inputSchema).toEqual(liveInput);
    expect(listed.tools[0].outputSchema).toEqual(liveOutput);
    expect(resolveInputSchema).toHaveBeenCalledTimes(1);
    expect(resolveOutputSchema).toHaveBeenCalledTimes(1);

    const conversions = toJSONSchema.mock.calls.length;
    const second = await connect(strapi, toolsFor(), { mode: 'list' });
    try {
      const again = await second.client.listTools();
      expect(again.tools[0].inputSchema).toEqual(listed.tools[0].inputSchema);
      expect(again.tools[0].outputSchema).toEqual(listed.tools[0].outputSchema);
    } finally {
      await second.close();
    }

    expect(resolveInputSchema).toHaveBeenCalledTimes(1);
    expect(resolveOutputSchema).toHaveBeenCalledTimes(1);
    expect(toJSONSchema.mock.calls.length).toBe(conversions);
    toJSONSchema.mockRestore();
  });

  test('different field and locale projections do not share a cache entry', async () => {
    const strapi = createStrapi();
    let field = 'title';
    let locale = 'en';
    const resolveInputSchema = jest.fn(() =>
      z.object({
        [field]: z.string(),
        locale: z.enum([locale] as [string, ...string[]]),
      })
    );
    const resolveOutputSchema = jest.fn(() => z.object({ [field]: z.string() }));
    const define = () => {
      const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
        'tool'
      );
      tools.define(
        defineTool('list_article', 'test.read', {
          resolveInputSchema,
          resolveOutputSchema,
          resolveSchemaProjection: () => ({
            fieldSets: [[field]],
            localeSets: [[locale]],
          }),
        })
      );
      return tools;
    };

    const list = async () => {
      const session = await connect(strapi, define(), { mode: 'list' });
      try {
        const { tools } = await session.client.listTools();
        return tools[0].inputSchema;
      } finally {
        await session.close();
      }
    };

    const title = await list();
    expect(JSON.stringify(title)).toContain('title');
    expect(JSON.stringify(title)).not.toContain('count');

    field = 'count';
    const count = await list();
    expect(JSON.stringify(count)).toContain('count');
    expect(JSON.stringify(count)).not.toContain('title');
    expect(resolveInputSchema).toHaveBeenCalledTimes(2);

    field = 'title';
    locale = 'fr';
    const french = await list();
    expect(JSON.stringify(french)).toContain('fr');
    expect(JSON.stringify(french)).not.toContain('"en"');
    expect(resolveInputSchema).toHaveBeenCalledTimes(3);

    locale = 'en';
    await list();
    expect(resolveInputSchema).toHaveBeenCalledTimes(3);
  });

  test('concurrent identical lists share one schema build', async () => {
    const strapi = createStrapi();
    const resolveInputSchema = jest.fn(() => z.object({ name: z.string() }));
    const resolveOutputSchema = jest.fn(() => z.object({ ok: z.boolean() }));
    const define = () => {
      const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
        'tool'
      );
      tools.define(defineTool('shared', 'test.read', { resolveInputSchema, resolveOutputSchema }));
      return tools;
    };

    const [left, right] = await Promise.all([
      connect(strapi, define(), { mode: 'list' }),
      connect(strapi, define(), { mode: 'list' }),
    ]);
    try {
      const [listedLeft, listedRight] = await Promise.all([
        left.client.listTools(),
        right.client.listTools(),
      ]);
      expect(listedLeft.tools[0].inputSchema).toEqual(listedRight.tools[0].inputSchema);
    } finally {
      await Promise.all([left.close(), right.close()]);
    }

    expect(resolveInputSchema).toHaveBeenCalledTimes(1);
    expect(resolveOutputSchema).toHaveBeenCalledTimes(1);
  });

  test('a failed schema build is not reused by the next list', async () => {
    const strapi = createStrapi();
    let calls = 0;
    const resolveOutputSchema = jest.fn(() => {
      calls += 1;
      if (calls === 1) {
        throw new Error('schema resolution failed');
      }
      return z.object({ ok: z.boolean() });
    });
    const define = () => {
      const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
        'tool'
      );
      tools.define(
        defineTool('flaky', 'test.read', {
          resolveInputSchema: () => z.object({}),
          resolveOutputSchema,
        })
      );
      return tools;
    };

    const failed = await connect(strapi, define(), { mode: 'list' });
    try {
      await expect(failed.client.listTools()).resolves.toEqual({ tools: [] });
    } finally {
      await failed.close();
    }
    expect(strapi.log.error).toHaveBeenCalledWith(
      expect.stringContaining('schema resolution failed')
    );

    const recovered = await connect(strapi, define(), { mode: 'list' });
    try {
      const { tools } = await recovered.client.listTools();
      expect(tools.map((tool) => tool.name)).toEqual(['flaky']);
    } finally {
      await recovered.close();
    }
    expect(calls).toBe(2);
  });

  test('tools/call keeps live Zod after a list has cached JSON Schema', async () => {
    const strapi = createStrapi();
    const handler = jest.fn(async () => ({
      content: [{ type: 'text' as const, text: 'ok' }],
      structuredContent: { ok: true },
    }));
    const resolveInputSchema = jest.fn(() => z.object({ name: z.string() }));
    const resolveOutputSchema = jest.fn(() => z.object({ ok: z.boolean() }));
    const define = () => {
      const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
        'tool'
      );
      tools.define({
        ...defineTool('named', 'test.read', { resolveInputSchema, resolveOutputSchema }),
        createHandler: () => handler,
      });
      return tools;
    };

    const listed = await connect(strapi, define(), { mode: 'list' });
    await listed.close();
    expect(resolveInputSchema).toHaveBeenCalledTimes(1);

    const called = await connect(strapi, define(), { mode: 'call', names: new Set(['named']) });
    try {
      await expect(
        called.client.callTool({ name: 'named', arguments: { name: 'Ada' } })
      ).resolves.toMatchObject({ structuredContent: { ok: true } });
    } finally {
      await called.close();
    }

    expect(resolveInputSchema).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
