import { describe, test, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../McpServerFactory';
import type { McpToolSchemaScope } from '../resolveToolSchemaScope';

const AUTH: Modules.MCP.McpCapabilityAuth = { policies: [{ action: 'test.read' }] };

const createStrapi = () =>
  ({
    log: { error: vi.fn(), info: vi.fn(), debug: vi.fn() },
    telemetry: { send: vi.fn().mockResolvedValue(true) },
  } as unknown as Core.Strapi);

type ToolRegistry = McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;

const createTools = (): ToolRegistry => new McpCapabilityDefinitionRegistry('tool');

const defineTool = (
  tools: ToolRegistry,
  name: string,
  schemas: { input?: () => unknown; output?: () => unknown } = {}
) =>
  tools.define({
    name,
    title: name,
    description: `${name} description`,
    auth: AUTH,
    // Unconvertible schemas are outside the typed contract; plugins written in JavaScript can
    // still return them.
    resolveInputSchema: (schemas.input ??
      (() =>
        z.object({ topic: z.string() }))) as Modules.MCP.McpToolDefinition['resolveInputSchema'],
    resolveOutputSchema: (schemas.output ??
      (() =>
        z.object({ ok: z.boolean() }))) as Modules.MCP.McpToolDefinition['resolveOutputSchema'],
    createHandler: () => async () => ({ content: [], structuredContent: { ok: true } }),
  });

const connectClient = async (
  strapi: Core.Strapi,
  tools: ToolRegistry,
  toolSchemaScope: McpToolSchemaScope = 'all'
) => {
  const { mcpServer, registries } = createMcpServerWithRegistries({
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
    ability: { can: vi.fn(() => true) },
    user: { id: 1 },
    toolSchemaScope,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'tool-schema-test', version: '1.0.0' });
  await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    registries,
    async close() {
      await client.close();
      await mcpServer.close();
    },
  };
};

describe('MCP tool schema fault isolation', () => {
  test.each([
    [
      'inputSchema with z.date()',
      { input: () => z.object({ at: z.date() }) },
      'inputSchema cannot be converted to JSON Schema: Date cannot be represented in JSON Schema',
    ],
    [
      'inputSchema with z.bigint()',
      { input: () => z.object({ n: z.bigint() }) },
      'inputSchema cannot be converted to JSON Schema: BigInt cannot be represented in JSON Schema',
    ],
    [
      'a non-object inputSchema',
      { input: () => z.string() },
      'inputSchema cannot be converted to JSON Schema: schema must describe an object (got type: "string")',
    ],
    [
      'outputSchema with a transform',
      { output: () => z.object({ size: z.string().transform((value) => value.length) }) },
      'outputSchema cannot be converted to JSON Schema: Transforms cannot be represented in JSON Schema',
    ],
    [
      'outputSchema with z.date()',
      { output: () => z.object({ at: z.date() }) },
      'outputSchema cannot be converted to JSON Schema: Date cannot be represented in JSON Schema',
    ],
  ])('a tool with %s is left out without failing tools/list', async (_label, schemas, reason) => {
    const strapi = createStrapi();
    const tools = createTools();
    defineTool(tools, 'healthy-before');
    defineTool(tools, 'broken', schemas);
    defineTool(tools, 'healthy-after');

    const { client, registries, close } = await connectClient(strapi, tools);

    try {
      const { tools: advertisedTools } = await client.listTools();

      expect(advertisedTools.map((tool) => tool.name)).toEqual(['healthy-before', 'healthy-after']);
      expect(strapi.log.error).toHaveBeenCalledTimes(1);
      expect(strapi.log.error).toHaveBeenCalledWith(
        `[MCP] Failed to register tool "broken" with MCP server: ${reason}`
      );
      expect(registries.tools.status('broken')).toBe('disabled');
      expect(registries.tools.status('healthy-before')).toBe('enabled');

      await expect(
        client.callTool({ name: 'healthy-after', arguments: { topic: 'strapi' } })
      ).resolves.toMatchObject({ structuredContent: { ok: true } });
    } finally {
      await close();
    }
  });

  test('a raw Zod shape is probed the way the SDK lists it', async () => {
    const strapi = createStrapi();
    const tools = createTools();
    // The SDK wraps raw shapes with z.object() at registration and lists the wrapped schema.
    defineTool(tools, 'raw-broken', { input: () => ({ at: z.date() }) });
    defineTool(tools, 'raw-healthy', { input: () => ({ topic: z.string() }) });

    const { client, close } = await connectClient(strapi, tools);

    try {
      const { tools: advertisedTools } = await client.listTools();

      expect(advertisedTools).toMatchObject([
        {
          name: 'raw-healthy',
          inputSchema: { type: 'object', properties: { topic: { type: 'string' } } },
        },
      ]);
      expect(strapi.log.error).toHaveBeenCalledTimes(1);
    } finally {
      await close();
    }
  });

  test('a broken tool is logged once per distinct failure, not on every request', async () => {
    const strapi = createStrapi();
    const tools = createTools();
    let field: () => z.ZodTypeAny = () => z.date();
    defineTool(tools, 'broken', { input: () => z.object({ at: field() }) });
    defineTool(tools, 'healthy');

    const listToolNames = async () => {
      const { client, close } = await connectClient(strapi, tools);
      try {
        return (await client.listTools()).tools.map((tool) => tool.name);
      } finally {
        await close();
      }
    };

    // A new MCP server, and so a new registration, is built for every request.
    for (let request = 0; request < 3; request += 1) {
      await expect(listToolNames()).resolves.toEqual(['healthy']);
    }
    expect(strapi.log.error).toHaveBeenCalledTimes(1);

    // Schemas are resolved per request, so a different failure is still reported.
    field = () => z.bigint();
    await expect(listToolNames()).resolves.toEqual(['healthy']);
    expect(strapi.log.error).toHaveBeenCalledTimes(2);
    expect(strapi.log.error).toHaveBeenLastCalledWith(
      '[MCP] Failed to register tool "broken" with MCP server: inputSchema cannot be converted to JSON Schema: BigInt cannot be represented in JSON Schema'
    );
  });

  test('tools outside the request scope are not probed', async () => {
    const strapi = createStrapi();
    const tools = createTools();
    const resolveBroken = vi.fn(() => z.object({ at: z.date() }));
    defineTool(tools, 'broken', { input: resolveBroken });
    defineTool(tools, 'healthy');

    const { client, close } = await connectClient(strapi, tools, new Set(['healthy']));

    try {
      await expect(
        client.callTool({ name: 'healthy', arguments: { topic: 'strapi' } })
      ).resolves.toMatchObject({ structuredContent: { ok: true } });
      expect(resolveBroken).not.toHaveBeenCalled();
      expect(strapi.log.error).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  test('tools/list returns an empty list when every tool fails registration', async () => {
    const strapi = createStrapi();
    const tools = createTools();
    defineTool(tools, 'broken', { input: () => z.object({ at: z.date() }) });

    const { client, close } = await connectClient(strapi, tools);

    try {
      await expect(client.listTools()).resolves.toMatchObject({ tools: [] });
    } finally {
      await close();
    }
  });

  test('schemas that convert on the side the SDK lists stay registered', async () => {
    const strapi = createStrapi();
    const tools = createTools();
    defineTool(tools, 'convertible', {
      // Transforms are unrepresentable on the output side only; the SDK lists inputSchema as input.
      input: () => z.object({ due: z.string().transform((value) => new Date(value)) }),
      output: () => z.object({ ok: z.boolean() }),
    });

    const { client, close } = await connectClient(strapi, tools);

    try {
      const { tools: advertisedTools } = await client.listTools();

      expect(advertisedTools.map((tool) => tool.name)).toEqual(['convertible']);
      expect(strapi.log.error).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});
