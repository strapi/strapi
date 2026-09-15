import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import { McpCapabilityDefinitionRegistry } from '../internal/McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../internal/McpServerFactory';

const AUTH: Modules.MCP.McpCapabilityAuth = { policies: [{ action: 'test.read' }] };

/** One value per content variant Strapi's owned contract accepts, with nested fields. */
const everyContentVariant: Modules.MCP.McpContentBlock[] = [
  {
    type: 'text',
    text: 'text variant',
    annotations: { audience: ['user'], priority: 0.5, lastModified: '2026-09-02T10:00:00Z' },
    _meta: { 'vendor.example/text': 'kept' },
  },
  {
    type: 'image',
    data: 'aGVsbG8=',
    mimeType: 'image/png',
    annotations: { audience: ['assistant'] },
    _meta: { 'vendor.example/image': 'kept' },
  },
  {
    type: 'audio',
    data: 'aGVsbG8=',
    mimeType: 'audio/wav',
    _meta: { 'vendor.example/audio': 'kept' },
  },
  {
    type: 'resource_link',
    name: 'linked-resource',
    uri: 'strapi://app/linked',
    title: 'Linked resource',
    description: 'Every listing attribute on a link',
    mimeType: 'application/json',
    size: 42,
    icons: [{ src: 'strapi://icon.png', mimeType: 'image/png', sizes: ['16x16'], theme: 'light' }],
    annotations: { priority: 1 },
    _meta: { 'vendor.example/link': 'kept' },
  },
  {
    type: 'resource',
    resource: {
      uri: 'strapi://app/embedded',
      mimeType: 'application/octet-stream',
      blob: 'aGVsbG8=',
      _meta: { 'vendor.example/embedded-resource': 'kept' },
    },
    annotations: { audience: ['user'] },
    _meta: { 'vendor.example/embedded': 'kept' },
  },
];

const createStrapi = () =>
  ({
    log: { error: jest.fn(), info: jest.fn(), debug: jest.fn() },
    telemetry: { send: jest.fn().mockResolvedValue(true) },
  }) as unknown as Core.Strapi;

const connectClient = async (
  strapi: Core.Strapi,
  definitions: Partial<Parameters<typeof createMcpServerWithRegistries>[0]['definitions']>
) => {
  const { mcpServer } = createMcpServerWithRegistries({
    strapi,
    definitions: {
      tools:
        definitions.tools ??
        new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>('tool'),
      prompts:
        definitions.prompts ??
        new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>('prompt'),
      resources:
        definitions.resources ??
        new McpCapabilityDefinitionRegistry<'resource', Modules.MCP.McpResourceDefinition>(
          'resource'
        ),
    },
    isDevMode: false,
    ability: { can: jest.fn(() => true) },
    user: { id: 1 },
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'capability-results-test', version: '1.0.0' });
  await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);

  return { client, close: async () => Promise.all([client.close(), mcpServer.close()]) };
};

describe('MCP owned capability results', () => {
  test('every tool content variant and structured data reaches a client unchanged', async () => {
    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define({
      name: 'every-variant-tool',
      title: 'Every variant tool',
      description: 'Returns one content block per accepted variant',
      auth: AUTH,
      resolveOutputSchema: () => z.object({ ok: z.boolean() }),
      createHandler: () => async () => ({
        content: everyContentVariant,
        structuredContent: { ok: true },
      }),
    });

    const { client, close } = await connectClient(createStrapi(), { tools });

    try {
      const result = await client.callTool({ name: 'every-variant-tool', arguments: {} });

      expect(result.structuredContent).toEqual({ ok: true });
      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual(everyContentVariant);
    } finally {
      await close();
    }
  });

  test('a tool error result keeps its indication and carries no structured data', async () => {
    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define({
      name: 'error-tool',
      title: 'Error tool',
      description: 'Returns an error result',
      auth: AUTH,
      resolveOutputSchema: () => z.object({ ok: z.boolean() }),
      createHandler: () => async () => ({
        content: [{ type: 'text' as const, text: 'it failed' }],
        isError: true as const,
      }),
    });

    const { client, close } = await connectClient(createStrapi(), { tools });

    try {
      const result = await client.callTool({ name: 'error-tool', arguments: {} });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: 'text', text: 'it failed' }]);
      expect(result.structuredContent).toBeUndefined();
    } finally {
      await close();
    }
  });

  test('structured data that fails the advertised schema still fails at the runtime boundary', async () => {
    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define({
      name: 'invalid-output-tool',
      title: 'Invalid output tool',
      description: 'Returns structured data the advertised schema rejects',
      auth: AUTH,
      resolveOutputSchema: () => z.object({ ok: z.boolean() }),
      createHandler: () => async () => ({
        content: [],
        structuredContent: { ok: 'not a boolean' } as unknown as { ok: boolean },
      }),
    });

    const { client, close } = await connectClient(createStrapi(), { tools });

    try {
      await expect(
        client.callTool({ name: 'invalid-output-tool', arguments: {} })
      ).resolves.toMatchObject({ isError: true });
    } finally {
      await close();
    }
  });

  test('prompt content, roles, and extension fields reach a client unchanged', async () => {
    const prompts = new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
      'prompt'
    );
    prompts.define({
      name: 'every-variant-prompt',
      title: 'Every variant prompt',
      description: 'Returns one message per accepted content variant',
      auth: AUTH,
      createHandler: () => async () => ({
        description: 'Owned prompt result',
        messages: everyContentVariant.map((content, index) => ({
          role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
          content,
        })),
        _meta: { 'vendor.example/prompt': 'kept' },
        'vendor.example/top-level': { nested: true },
      }),
    });

    const { client, close } = await connectClient(createStrapi(), { prompts });

    try {
      const result = await client.getPrompt({ name: 'every-variant-prompt' });

      expect(result.description).toBe('Owned prompt result');
      expect(result.messages).toEqual(
        everyContentVariant.map((content, index) => ({
          role: index % 2 === 0 ? 'user' : 'assistant',
          content,
        }))
      );
      expect(result._meta).toMatchObject({ 'vendor.example/prompt': 'kept' });
      expect(result['vendor.example/top-level']).toEqual({ nested: true });
    } finally {
      await close();
    }
  });

  test('resource listing attributes and both read contents reach a client unchanged', async () => {
    const listingMetadata: Modules.MCP.McpResourceListingMetadata = {
      title: 'App info',
      description: 'Metadata about the app',
      mimeType: 'application/json',
      size: 128,
      icons: [{ src: 'strapi://icon.svg', mimeType: 'image/svg+xml', theme: 'dark' }],
      annotations: { audience: ['user'], priority: 0.75 },
      _meta: { 'vendor.example/listing': 'kept' },
    };
    const resources = new McpCapabilityDefinitionRegistry<
      'resource',
      Modules.MCP.McpResourceDefinition
    >('resource');
    resources.define({
      name: 'app-info',
      uri: 'strapi://app/info',
      metadata: listingMetadata,
      auth: AUTH,
      createHandler: () => async (uri) => ({
        contents: [
          { uri: uri.href, mimeType: 'text/plain', text: 'text contents' },
          {
            uri: `${uri.href}/binary`,
            mimeType: 'application/octet-stream',
            blob: 'aGVsbG8=',
            _meta: { 'vendor.example/blob': 'kept' },
          },
        ],
        _meta: { 'vendor.example/read': 'kept' },
        'vendor.example/top-level': 'kept',
      }),
    });

    const { client, close } = await connectClient(createStrapi(), { resources });

    try {
      const { resources: advertised } = await client.listResources();

      expect(advertised).toHaveLength(1);
      expect(advertised[0]).toMatchObject({
        name: 'app-info',
        uri: 'strapi://app/info',
        title: 'App info',
        description: 'Metadata about the app',
        mimeType: 'application/json',
        size: 128,
        icons: [{ src: 'strapi://icon.svg', mimeType: 'image/svg+xml', theme: 'dark' }],
        annotations: { audience: ['user'], priority: 0.75 },
        _meta: { 'vendor.example/listing': 'kept' },
      });
      expect(advertised[0]).not.toHaveProperty('contents');

      const read = await client.readResource({ uri: 'strapi://app/info' });

      expect(read.contents).toEqual([
        { uri: 'strapi://app/info', mimeType: 'text/plain', text: 'text contents' },
        {
          uri: 'strapi://app/info/binary',
          mimeType: 'application/octet-stream',
          blob: 'aGVsbG8=',
          _meta: { 'vendor.example/blob': 'kept' },
        },
      ]);
      expect(read._meta).toMatchObject({ 'vendor.example/read': 'kept' });
      expect(read['vendor.example/top-level']).toBe('kept');
    } finally {
      await close();
    }
  });
});
