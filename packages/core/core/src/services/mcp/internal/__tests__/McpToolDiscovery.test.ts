import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../McpServerFactory';

const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

const schemaIsUsable = (schema: Record<string, unknown>): boolean => {
  if (schema.$schema !== undefined && schema.$schema !== JSON_SCHEMA_2020_12) {
    return false;
  }

  try {
    // `strictTuples` is an AJV authoring lint, not JSON Schema validation. Zod emits valid
    // 2020-12 `prefixItems` without the optional fixed-length assertion.
    const ajv = new Ajv2020({ strict: true, strictTuples: false });
    addFormats(ajv);
    ajv.compile(schema);
    return true;
  } catch {
    return false;
  }
};

describe('MCP tool discovery', () => {
  test('a strict client retains every advertised tool and execution behavior stays intact', async () => {
    const logError = jest.fn();
    const telemetrySend = jest.fn().mockResolvedValue(true);
    const strapi = {
      log: {
        error: logError,
        info: jest.fn(),
        debug: jest.fn(),
      },
      telemetry: {
        send: telemetrySend,
      },
    } as Core.Strapi;
    const ability = { can: jest.fn(() => true) };
    const handler = jest.fn(async ({ args }: { args: { pair: [string, number] } }) => ({
      content: [],
      structuredContent: { pair: args.pair, attempts: 1 },
    }));

    const recursiveNode: z.ZodTypeAny = z.lazy(() =>
      z
        .object({
          label: z.string(),
          child: recursiveNode.optional(),
        })
        .strict()
    );

    const tools = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
      'tool'
    );
    tools.define({
      name: 'representative-tool',
      title: 'Representative tool',
      description: 'Exercises dialect-sensitive schema constructs',
      auth: { policies: [{ action: 'test.read' }] },
      resolveInputSchema: () =>
        z.object({
          pair: z.tuple([z.string(), z.number()]),
          node: recursiveNode,
        }),
      resolveOutputSchema: () =>
        z
          .object({
            pair: z.tuple([z.string(), z.number()]),
            attempts: z.number().default(1),
          })
          .loose(),
      createHandler: () => handler,
    });
    tools.define({
      name: 'failing-tool',
      title: 'Failing tool',
      description: 'Exercises safe handler failures',
      auth: { policies: [{ action: 'test.read' }] },
      resolveInputSchema: () => z.object({}),
      resolveOutputSchema: () => z.object({ ok: z.boolean() }),
      createHandler: () => async () => {
        throw new Error('handler failed');
      },
    });
    tools.define({
      name: 'registration-failure',
      title: 'Registration failure',
      description: 'Exercises registration fault isolation',
      auth: { policies: [{ action: 'test.read' }] },
      resolveInputSchema: () => z.object({}),
      resolveOutputSchema() {
        throw new Error('schema resolution failed');
      },
      createHandler: () => async () => ({
        content: [],
        structuredContent: { ok: true },
      }),
    });

    const { mcpServer } = createMcpServerWithRegistries({
      strapi,
      definitions: {
        tools,
        prompts: new McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>(
          'prompt'
        ),
        resources: new McpCapabilityDefinitionRegistry<
          'resource',
          Modules.MCP.McpResourceDefinition
        >('resource'),
      },
      isDevMode: false,
      ability,
      user: { id: 1 },
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'strict-discovery-test', version: '1.0.0' });

    try {
      await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);

      const { tools: advertisedTools } = await client.listTools();
      expect(advertisedTools.map((tool) => tool.name)).toEqual([
        'representative-tool',
        'failing-tool',
      ]);

      const usableTools = advertisedTools.filter(
        (tool) =>
          schemaIsUsable(tool.inputSchema) &&
          (tool.outputSchema === undefined || schemaIsUsable(tool.outputSchema))
      );
      expect(usableTools).toHaveLength(advertisedTools.length);

      const representativeTool = advertisedTools.find(
        (tool) => tool.name === 'representative-tool'
      );
      expect(representativeTool).toBeDefined();
      expect(representativeTool?.inputSchema).toMatchObject({
        $schema: JSON_SCHEMA_2020_12,
        properties: {
          pair: {
            type: 'array',
            prefixItems: [{ type: 'string' }, { type: 'number' }],
          },
        },
      });
      expect(representativeTool?.inputSchema).toHaveProperty('$defs');
      expect(JSON.stringify(representativeTool?.inputSchema)).toContain('"$ref":"#/$defs/');
      expect(JSON.stringify(representativeTool?.inputSchema)).not.toContain('"definitions"');

      const result = await client.callTool({
        name: 'representative-tool',
        arguments: {
          pair: ['value', 2],
          node: { label: 'root', child: { label: 'leaf' } },
        },
      });
      expect(result).toMatchObject({
        structuredContent: { pair: ['value', 2], attempts: 1 },
      });
      expect(handler).toHaveBeenCalledTimes(1);

      await expect(
        client.callTool({
          name: 'representative-tool',
          arguments: { pair: [2, 'value'], node: { label: 'root' } },
        })
      ).resolves.toMatchObject({
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Input validation error'),
          },
        ],
      });
      expect(handler).toHaveBeenCalledTimes(1);

      await expect(client.callTool({ name: 'failing-tool', arguments: {} })).resolves.toMatchObject(
        {
          isError: true,
        }
      );
      expect(telemetrySend).toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(
        '[MCP] Failed to register tool "registration-failure" with MCP server: schema resolution failed'
      );
    } finally {
      await client.close();
      await mcpServer.close();
    }
  });
});
