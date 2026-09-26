import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../McpServerFactory';

const AUTH: Modules.MCP.McpCapabilityAuth = { policies: [{ action: 'test.read' }] };

const createStrapi = () =>
  ({
    log: { error: jest.fn(), info: jest.fn(), debug: jest.fn() },
    telemetry: { send: jest.fn().mockResolvedValue(true) },
  }) as unknown as Core.Strapi;

const createHandler = () => async () => ({
  messages: [{ role: 'user' as const, content: { type: 'text' as const, text: 'ok' } }],
});

const connectClient = async (
  strapi: Core.Strapi,
  prompts: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>
) => {
  const { mcpServer, registries } = createMcpServerWithRegistries({
    strapi,
    definitions: {
      tools: new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>('tool'),
      prompts,
      resources: new McpCapabilityDefinitionRegistry<'resource', Modules.MCP.McpResourceDefinition>(
        'resource'
      ),
    },
    isDevMode: false,
    ability: { can: jest.fn(() => true) },
    user: { id: 1 },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'prompt-discovery-test', version: '1.0.0' });
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

const definePrompt = (
  prompts: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>,
  name: string,
  argsSchema?: z.ZodTypeAny
) =>
  prompts.define({
    name,
    title: name,
    description: `${name} description`,
    auth: AUTH,
    // Unconvertible and non-object schemas are outside the typed contract; plugins written in
    // JavaScript can still pass them.
    argsSchema: argsSchema as Modules.MCP.McpPromptDefinition['argsSchema'],
    createHandler,
  });

describe('MCP prompt discovery', () => {
  test.each([
    ['z.date()', () => z.date(), 'Date cannot be represented in JSON Schema'],
    ['z.coerce.date()', () => z.coerce.date(), 'Date cannot be represented in JSON Schema'],
    ['z.bigint()', () => z.bigint(), 'BigInt cannot be represented in JSON Schema'],
    ['z.custom()', () => z.custom<string>(), 'Custom types cannot be represented in JSON Schema'],
    [
      'z.instanceof()',
      () => z.instanceof(URL),
      'Custom types cannot be represented in JSON Schema',
    ],
  ])(
    'a prompt whose argsSchema uses %s fails registration without hiding sibling prompts',
    async (_label, createField, reason) => {
      const strapi = createStrapi();
      const prompts = new McpCapabilityDefinitionRegistry<
        'prompt',
        Modules.MCP.McpPromptDefinition
      >('prompt');
      definePrompt(prompts, 'healthy-before', z.object({ topic: z.string().describe('Topic') }));
      definePrompt(prompts, 'unconvertible', z.object({ due: createField().describe('Due') }));
      definePrompt(prompts, 'healthy-after', z.object({ limit: z.number().optional() }));
      definePrompt(prompts, 'healthy-without-args');

      const { client, registries, close } = await connectClient(strapi, prompts);

      try {
        const { prompts: advertisedPrompts } = await client.listPrompts();

        expect(advertisedPrompts.map((prompt) => prompt.name)).toEqual([
          'healthy-before',
          'healthy-after',
          'healthy-without-args',
        ]);
        expect(advertisedPrompts[0].arguments).toEqual([
          { name: 'topic', description: 'Topic', required: true },
        ]);
        expect(advertisedPrompts[1].arguments).toEqual([{ name: 'limit', required: false }]);

        expect(strapi.log.error).toHaveBeenCalledTimes(1);
        expect(strapi.log.error).toHaveBeenCalledWith(
          `[MCP] Failed to register prompt "unconvertible" with MCP server: argsSchema cannot be converted to JSON Schema: ${reason}`
        );
        expect(registries.prompts.status('unconvertible')).toBe('disabled');
        expect(registries.prompts.status('healthy-before')).toBe('enabled');
        expect(registries.prompts.status('healthy-after')).toBe('enabled');

        await expect(
          client.getPrompt({ name: 'healthy-before', arguments: { topic: 'strapi' } })
        ).resolves.toMatchObject({ messages: [{ role: 'user' }] });
        await expect(
          client.getPrompt({ name: 'unconvertible', arguments: { due: '2026-09-17' } })
        ).rejects.toThrow();
      } finally {
        await close();
      }
    }
  );

  test('a prompt whose argsSchema is not an object fails registration without hiding sibling prompts', async () => {
    const strapi = createStrapi();
    const prompts = new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
      'prompt'
    );
    definePrompt(prompts, 'not-an-object', z.string());
    definePrompt(prompts, 'healthy', z.object({ topic: z.string() }));

    const { client, close } = await connectClient(strapi, prompts);

    try {
      const { prompts: advertisedPrompts } = await client.listPrompts();

      expect(advertisedPrompts.map((prompt) => prompt.name)).toEqual(['healthy']);
      expect(strapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[MCP] Failed to register prompt "not-an-object" with MCP server: argsSchema cannot be converted to JSON Schema: '
        )
      );
    } finally {
      await close();
    }
  });

  test('raw Zod shapes are probed the way the SDK lists them', async () => {
    const strapi = createStrapi();
    const prompts = new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
      'prompt'
    );
    // The SDK wraps raw shapes with z.object() at registration and lists the wrapped schema.
    definePrompt(prompts, 'raw-unconvertible', { due: z.date() } as unknown as z.ZodTypeAny);
    definePrompt(prompts, 'raw-healthy', { topic: z.string() } as unknown as z.ZodTypeAny);

    const { client, close } = await connectClient(strapi, prompts);

    try {
      const { prompts: advertisedPrompts } = await client.listPrompts();

      expect(advertisedPrompts).toMatchObject([
        { name: 'raw-healthy', arguments: [{ name: 'topic', required: true }] },
      ]);
      expect(strapi.log.error).toHaveBeenCalledTimes(1);
      expect(strapi.log.error).toHaveBeenCalledWith(
        '[MCP] Failed to register prompt "raw-unconvertible" with MCP server: argsSchema cannot be converted to JSON Schema: Date cannot be represented in JSON Schema'
      );
    } finally {
      await close();
    }
  });

  test('prompts/list returns an empty list when every prompt fails registration', async () => {
    const strapi = createStrapi();
    const prompts = new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
      'prompt'
    );
    definePrompt(prompts, 'unconvertible', z.object({ due: z.date() }));

    const { client, close } = await connectClient(strapi, prompts);

    try {
      await expect(client.listPrompts()).resolves.toMatchObject({ prompts: [] });
    } finally {
      await close();
    }
  });

  test('schemas that only convert on the input side stay registered', async () => {
    const strapi = createStrapi();
    const prompts = new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
      'prompt'
    );
    const recursiveNode: z.ZodTypeAny = z.lazy(() =>
      z.object({ label: z.string(), child: recursiveNode.optional() })
    );
    definePrompt(
      prompts,
      'input-convertible',
      z.object({
        // Transforms are unrepresentable on the output side only; prompts/list converts the input.
        due: z.string().transform((value) => new Date(value)),
        node: recursiveNode.optional(),
      })
    );

    const { client, close } = await connectClient(strapi, prompts);

    try {
      const { prompts: advertisedPrompts } = await client.listPrompts();

      expect(advertisedPrompts.map((prompt) => prompt.name)).toEqual(['input-convertible']);
      expect(strapi.log.error).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});
