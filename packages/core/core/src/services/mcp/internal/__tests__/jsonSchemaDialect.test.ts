/**
 * Regression coverage for strapi/strapi#27395.
 *
 * `@modelcontextprotocol/sdk` converts the Zod schemas handed to `registerTool` lazily, inside
 * its own `tools/list` handler, and (as of 1.30.0) emits JSON Schema draft-07. MCP SEP-1613 makes
 * 2020-12 the default dialect, so strict clients reject every advertised tool. These tests drive a
 * real `McpServer` through the SDK's own in-memory transport and assert what a client actually
 * receives, then compile the result with a real JSON Schema 2020-12 validator.
 */
// eslint-disable-next-line import/extensions
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// eslint-disable-next-line import/extensions
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import Ajv2020 from 'ajv/dist/2020';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { McpToolRegistry } from '../../tool-registry';
import { installJsonSchemaDialectShim, toJsonSchema2020 } from '../jsonSchemaDialect';

const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

type JsonSchema = Record<string, unknown>;

/** Mirrors the recursive shape produced by content-manager's `buildFiltersSchema` (`z.lazy`). */
const buildFiltersLikeSchema = (): z.ZodTypeAny => {
  const filters: z.ZodTypeAny = z.lazy(() =>
    z
      .object({
        $and: z.array(filters).optional(),
        $or: z.array(filters).optional(),
        $not: filters.optional(),
        title: z
          .union([
            z.string(),
            z.object({ $eq: z.string().optional(), $contains: z.string().optional() }),
          ])
          .optional(),
      })
      .strict()
  );
  return filters.optional();
};

const createMockStrapi = () =>
  ({
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    telemetry: { send: jest.fn().mockResolvedValue(true) },
  }) as unknown as Core.Strapi;

const defineFixtureTools = (
  definitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>
) => {
  definitions.define({
    name: 'list_article',
    title: 'List articles',
    description: 'Lists articles with a recursive filters object',
    devModeOnly: true,
    resolveInputSchema: () =>
      z.object({ filters: buildFiltersLikeSchema(), page: z.number().optional() }),
    resolveOutputSchema: () =>
      z.object({
        data: z.array(z.object({ documentId: z.string() })),
        meta: z.object({ pagination: z.object({ page: z.number(), total: z.number() }) }),
      }),
    createHandler: () => async () => ({
      content: [],
      structuredContent: { data: [], meta: { pagination: { page: 1, total: 0 } } },
    }),
  });

  definitions.define({
    name: 'span_tool',
    title: 'Span',
    description: 'Takes a tuple',
    devModeOnly: true,
    resolveInputSchema: () => z.object({ span: z.tuple([z.number(), z.number()]) }),
    resolveOutputSchema: () => z.object({ ok: z.boolean() }),
    createHandler: () => async () => ({ content: [], structuredContent: { ok: true } }),
  });

  definitions.define({
    name: 'no_input',
    title: 'No input',
    description: 'Has no input schema',
    devModeOnly: true,
    resolveOutputSchema: () => z.object({ ok: z.boolean() }),
    createHandler: () => async () => ({ content: [], structuredContent: { ok: true } }),
  });
};

/**
 * Binds the registry to a real SDK server, connects a real SDK client over an in-memory
 * transport and returns the tools exactly as a client would receive them from `tools/list`.
 */
const setupServer = async (strapi: Core.Strapi) => {
  const definitions = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
    'tool'
  );
  defineFixtureTools(definitions);

  const mcpServer = new McpServer(
    { name: 'test', version: '0.0.0' },
    { capabilities: { tools: {} } }
  );
  const registry = new McpToolRegistry({
    strapi,
    definitions,
    ability: { can: () => true },
    user: { id: 1 },
  });
  registry.bind(mcpServer);
  registry.enableAll();

  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  const listTools = async () => {
    const { tools } = await client.listTools();
    return Object.fromEntries(tools.map((tool) => [tool.name, tool])) as Record<
      string,
      {
        name: string;
        title?: string;
        description?: string;
        inputSchema: JsonSchema;
        outputSchema?: JsonSchema;
      }
    >;
  };

  const close = async () => {
    await client.close();
    await mcpServer.close();
  };

  return { mcpServer, registry, listTools, close };
};

const collectRefs = (node: unknown, acc: string[] = []): string[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectRefs(child, acc));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') {
        acc.push(value);
      } else {
        collectRefs(value, acc);
      }
    }
  }
  return acc;
};

const createStrictValidator = () =>
  new Ajv2020({ strict: true, strictTuples: false, allErrors: true });

describe('MCP tools/list JSON Schema dialect (SEP-1613)', () => {
  let strapi: Core.Strapi;
  let server: Awaited<ReturnType<typeof setupServer>>;

  beforeEach(async () => {
    strapi = createMockStrapi();
    server = await setupServer(strapi);
  });

  afterEach(async () => {
    await server.close();
  });

  test('advertises JSON Schema 2020-12 on both inputSchema and outputSchema of every tool', async () => {
    const tools = await server.listTools();

    expect(Object.keys(tools).sort()).toEqual(['list_article', 'no_input', 'span_tool']);

    for (const tool of Object.values(tools)) {
      if (tool.name !== 'no_input') {
        expect(tool.inputSchema.$schema).toBe(JSON_SCHEMA_2020_12);
      }
      expect(tool.outputSchema?.$schema).toBe(JSON_SCHEMA_2020_12);
    }
  });

  test('emits recursive (z.lazy) schemas with $defs, not draft-07 definitions', async () => {
    const { list_article: tool } = await server.listTools();

    expect(tool.inputSchema).toHaveProperty('$defs');
    expect(tool.inputSchema).not.toHaveProperty('definitions');

    const refs = collectRefs(tool.inputSchema);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith('#/$defs/')).toBe(true);
    }
  });

  test('emits tuples as prefixItems, not draft-07 items arrays', async () => {
    const { span_tool: tool } = await server.listTools();
    const span = (tool.inputSchema.properties as Record<string, JsonSchema>).span;

    expect(Array.isArray(span.prefixItems)).toBe(true);
    expect(Array.isArray(span.items)).toBe(false);
  });

  test('keeps the SDK empty-object fallback for tools without an input schema', async () => {
    const { no_input: tool } = await server.listTools();

    expect(tool.inputSchema).toEqual({ type: 'object', properties: {} });
    expect(tool.outputSchema?.$schema).toBe(JSON_SCHEMA_2020_12);
  });

  test('passes non-schema tool fields through unchanged', async () => {
    const { list_article: tool } = await server.listTools();

    expect(tool.title).toBe('List articles');
    expect(tool.description).toBe('Lists articles with a recursive filters object');
  });

  describe('validated by a real JSON Schema 2020-12 validator', () => {
    test('every advertised schema compiles under a strict 2020-12 validator', async () => {
      const tools = await server.listTools();

      for (const tool of Object.values(tools)) {
        const ajv = createStrictValidator();
        expect(() => ajv.compile(tool.inputSchema)).not.toThrow();
        expect(() => ajv.compile(tool.outputSchema as JsonSchema)).not.toThrow();
      }
    });

    test('recursive filters validate through the relocated $defs references', async () => {
      const { list_article: tool } = await server.listTools();
      const validate = createStrictValidator().compile(tool.inputSchema);

      expect(
        validate({ filters: { $and: [{ title: 'x' }, { $not: { title: { $eq: 'y' } } }] } })
      ).toBe(true);
      expect(validate({ filters: { $and: [{ bogus: 1 }] } })).toBe(false);
      expect(validate({ filters: { $or: [{ $not: { title: 1 } }] } })).toBe(false);
    });

    test('tuples validate through prefixItems', async () => {
      const { span_tool: tool } = await server.listTools();
      const validate = createStrictValidator().compile(tool.inputSchema);

      expect(validate({ span: [1, 2] })).toBe(true);
      expect(validate({ span: ['a', 2] })).toBe(false);
    });

    test('list-shaped output schemas compile and validate structured content', async () => {
      const { list_article: tool } = await server.listTools();
      const validate = createStrictValidator().compile(tool.outputSchema as JsonSchema);

      expect(
        validate({ data: [{ documentId: 'abc' }], meta: { pagination: { page: 1, total: 1 } } })
      ).toBe(true);
      expect(validate({ data: [{}], meta: {} })).toBe(false);
    });
  });
});

describe('installJsonSchemaDialectShim', () => {
  const DRAFT_07 = 'http://json-schema.org/draft-07/schema#';

  const connect = async (mcpServer: McpServer) => {
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);
    return {
      client,
      async close() {
        await client.close();
        await mcpServer.close();
      },
    };
  };

  test('is a no-op that warns when the SDK internals do not look as expected', () => {
    const strapi = createMockStrapi();
    const fakeServer = { server: {} } as unknown as McpServer;

    expect(
      installJsonSchemaDialectShim({
        strapi,
        mcpServer: fakeServer,
        getRegisteredTool: () => undefined,
      })
    ).toBe(false);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('JSON Schema 2020-12'));
  });

  test('is a no-op without warning when no tool has been registered yet', () => {
    const strapi = createMockStrapi();
    const mcpServer = new McpServer({ name: 'test', version: '0.0.0' });

    expect(
      installJsonSchemaDialectShim({ strapi, mcpServer, getRegisteredTool: () => undefined })
    ).toBe(false);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('keeps the SDK document for a tool whose conversion throws and converts the others', async () => {
    const strapi = createMockStrapi();
    const mcpServer = new McpServer({ name: 'test', version: '0.0.0' });
    const registered: Record<string, ReturnType<McpServer['registerTool']>> = {};

    for (const name of ['good', 'bad']) {
      registered[name] = mcpServer.registerTool(
        name,
        {
          inputSchema: z.object({ value: z.string() }),
          outputSchema: z.object({ ok: z.boolean() }),
        },
        async () => ({ content: [], structuredContent: { ok: true } })
      );
    }

    const installed = installJsonSchemaDialectShim({
      strapi,
      mcpServer,
      getRegisteredTool: (name) => registered[name],
      convert(schema, io) {
        if (schema === registered.bad.inputSchema) {
          throw new Error('Date cannot be represented in JSON Schema');
        }
        return toJsonSchema2020(schema, io);
      },
    });
    expect(installed).toBe(true);

    const { client, close } = await connect(mcpServer);
    try {
      const { tools } = await client.listTools();
      const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

      expect(Object.keys(byName).sort()).toEqual(['bad', 'good']);
      expect(byName.good.inputSchema.$schema).toBe(JSON_SCHEMA_2020_12);
      expect(byName.good.outputSchema?.$schema).toBe(JSON_SCHEMA_2020_12);
      // The failing field falls back to what the SDK produced; the other field is still converted.
      expect(byName.bad.inputSchema.$schema).toBe(DRAFT_07);
      expect(byName.bad.outputSchema?.$schema).toBe(JSON_SCHEMA_2020_12);
      expect(strapi.log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Could not convert inputSchema of tool "bad"')
      );
    } finally {
      await close();
    }
  });

  test('leaves tools it cannot resolve untouched', async () => {
    const strapi = createMockStrapi();
    const mcpServer = new McpServer({ name: 'test', version: '0.0.0' });
    mcpServer.registerTool(
      'unknown',
      { inputSchema: z.object({ value: z.string() }) },
      async () => ({ content: [] })
    );
    installJsonSchemaDialectShim({ strapi, mcpServer, getRegisteredTool: () => undefined });

    const { client, close } = await connect(mcpServer);
    try {
      const { tools } = await client.listTools();
      expect(tools[0].inputSchema.$schema).toBe(DRAFT_07);
    } finally {
      await close();
    }
  });

  test('converts lazily so schemas changed through update() are reflected', async () => {
    const strapi = createMockStrapi();
    const mcpServer = new McpServer({ name: 'test', version: '0.0.0' });
    const tool = mcpServer.registerTool(
      'mutable',
      { inputSchema: z.object({ before: z.string() }) },
      async () => ({ content: [] })
    );
    installJsonSchemaDialectShim({ strapi, mcpServer, getRegisteredTool: () => tool });

    const { client, close } = await connect(mcpServer);
    try {
      const first = (await client.listTools()).tools[0].inputSchema;
      expect(first.$schema).toBe(JSON_SCHEMA_2020_12);
      expect(first.properties).toHaveProperty('before');

      tool.update({ paramsSchema: { after: z.number() } });

      const second = (await client.listTools()).tools[0].inputSchema;
      expect(second.$schema).toBe(JSON_SCHEMA_2020_12);
      expect(second.properties).toHaveProperty('after');
      expect(second.properties).not.toHaveProperty('before');
    } finally {
      await close();
    }
  });
});
