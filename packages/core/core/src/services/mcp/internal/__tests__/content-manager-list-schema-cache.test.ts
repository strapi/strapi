/* eslint-disable import/no-relative-packages -- content-manager tools are registered by core */
import { Ability, AbilityBuilder } from '@casl/ability';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';

import { ACTIONS } from '../../../../../../content-manager/server/src/services/permission-checker';
import {
  deriveDisplayedContentTypeMcpToolDefinitions,
  type ContentManagerModelForMcp,
} from '../../../../../../content-manager/server/src/mcp/derive-content-type-mcp-tools';
import { buildFiltersSchema } from '../../../../../../content-manager/server/src/mcp/schemas/filters-schema';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { createMcpServerWithRegistries } from '../McpServerFactory';
import type { McpToolRegistrationPlan } from '../classify-mcp-tool-registration';
import { mcpToolSchemaCache } from '../tool-schema-cache';

jest.mock('../../../../../../content-manager/server/src/mcp/schemas/filters-schema', () => {
  const actual = jest.requireActual(
    '../../../../../../content-manager/server/src/mcp/schemas/filters-schema'
  );
  return {
    ...actual,
    buildFiltersSchema: jest.fn((...args: Parameters<typeof actual.buildFiltersSchema>) =>
      actual.buildFiltersSchema(...args)
    ),
  };
});

jest.mock('../../../../../../content-manager/server/src/utils', () => ({
  getService: jest.fn(),
}));

const uid = 'api::article.article';
const model: ContentManagerModelForMcp = {
  uid,
  kind: 'collectionType',
  apiID: 'article',
  options: {},
  attributes: {
    title: { type: 'string' },
    count: { type: 'integer' },
  } as ContentManagerModelForMcp['attributes'],
};

const createStrapi = (localized = false) =>
  ({
    log: { error: jest.fn(), info: jest.fn(), debug: jest.fn() },
    telemetry: { send: jest.fn().mockResolvedValue(true) },
    contentTypes: {
      [uid]: {
        pluginOptions: localized ? { i18n: { localized: true } } : {},
      },
    },
    localization: {
      isLocalizedContentType: jest.fn(
        (contentType: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
          contentType.pluginOptions?.i18n?.localized === true
      ),
    },
    get: jest.fn(() => ({ get: jest.fn(() => undefined) })),
  }) as unknown as Core.Strapi;

const abilityFor = (fields: string[] | 'all' | 'none') => {
  const { can, build } = new AbilityBuilder(Ability);
  if (fields === 'all') {
    can('manage', 'all');
  } else if (fields !== 'none') {
    for (const action of Object.values(ACTIONS)) {
      for (const field of fields) {
        can(action, uid, field);
      }
    }
  }
  return build();
};

const registerTools = (strapi: Core.Strapi, localeCodes: [string, ...string[]] | null = null) => {
  const definitions = new McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>(
    'tool'
  );
  const derived = deriveDisplayedContentTypeMcpToolDefinitions(strapi, [model], {
    localeCodes,
    defaultLocale: localeCodes?.[0] ?? null,
  });
  for (const tool of derived) {
    definitions.define(tool);
  }
  return { definitions, derived };
};

const connect = async (
  strapi: Core.Strapi,
  definitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>,
  toolRegistration: McpToolRegistrationPlan,
  ability: Ability
) => {
  const { mcpServer } = await createMcpServerWithRegistries({
    strapi,
    definitions: {
      tools: definitions,
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
  const client = new Client({ name: 'content-manager-mcp-cache', version: '1.0.0' });
  await Promise.all([mcpServer.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: () => Promise.all([client.close(), mcpServer.close()]),
  };
};

describe('content-manager MCP list schema cache', () => {
  beforeEach(() => {
    mcpToolSchemaCache.clear();
    jest.mocked(buildFiltersSchema).mockClear();
    const { getService } = jest.requireMock(
      '../../../../../../content-manager/server/src/utils'
    ) as {
      getService: jest.Mock;
    };
    getService.mockImplementation((name: string) => {
      if (name === 'permission-checker') {
        return {
          create: () => ({
            cannot: () => false,
          }),
        };
      }
      throw new Error(`Unexpected service ${name}`);
    });
  });

  test('does not build filters schemas for tools a token cannot use', async () => {
    const strapi = createStrapi();
    const { definitions, derived } = registerTools(strapi);
    const resolvers = derived.map((tool) => {
      const input = jest.fn(tool.resolveInputSchema);
      const output = jest.fn(tool.resolveOutputSchema);
      tool.resolveInputSchema = input;
      tool.resolveOutputSchema = output;
      return { input, output };
    });

    const session = await connect(strapi, definitions, { mode: 'list' }, abilityFor('none'));
    try {
      await expect(session.client.listTools()).resolves.toEqual({ tools: [] });
    } finally {
      await session.close();
    }

    expect(buildFiltersSchema).not.toHaveBeenCalled();
    for (const resolver of resolvers) {
      expect(resolver.input).not.toHaveBeenCalled();
      expect(resolver.output).not.toHaveBeenCalled();
    }
  });

  test('tools/call resolves only the named tool', async () => {
    const strapi = createStrapi();
    const { definitions, derived } = registerTools(strapi);
    const list = derived.find((tool) => tool.name === 'list_article');
    const get = derived.find((tool) => tool.name === 'get_article');
    if (list === undefined || get === undefined) {
      throw new Error('expected list and get tools');
    }
    const listInput = jest.fn(list.resolveInputSchema);
    const getInput = jest.fn(get.resolveInputSchema);
    list.resolveInputSchema = listInput;
    get.resolveInputSchema = getInput;

    const session = await connect(
      strapi,
      definitions,
      { mode: 'call', names: new Set(['list_article']) },
      abilityFor('all')
    );
    try {
      await session.client.callTool({ name: 'list_article', arguments: {} }).catch(() => undefined);
    } finally {
      await session.close();
    }

    expect(listInput).toHaveBeenCalledTimes(1);
    expect(getInput).not.toHaveBeenCalled();
    expect(buildFiltersSchema).toHaveBeenCalled();
  });

  test('different field projections do not share a list entry, and a repeat does not rebuild', async () => {
    const strapi = createStrapi();
    const listFor = async (fields: string[] | 'all') => {
      const { definitions } = registerTools(strapi);
      const session = await connect(strapi, definitions, { mode: 'list' }, abilityFor(fields));
      try {
        const { tools } = await session.client.listTools();
        return tools.find((tool) => tool.name === 'list_article')?.inputSchema;
      } finally {
        await session.close();
      }
    };

    jest.mocked(buildFiltersSchema).mockClear();
    const title = await listFor(['title']);
    const buildsAfterTitle = jest.mocked(buildFiltersSchema).mock.calls.length;
    expect(buildsAfterTitle).toBeGreaterThan(0);
    expect(JSON.stringify(title)).toContain('title');
    expect(JSON.stringify(title)).not.toContain('count');

    const count = await listFor(['count']);
    expect(jest.mocked(buildFiltersSchema).mock.calls.length).toBeGreaterThan(buildsAfterTitle);
    expect(JSON.stringify(count)).toContain('count');
    expect(JSON.stringify(count)).not.toContain('title');

    const buildsAfterCount = jest.mocked(buildFiltersSchema).mock.calls.length;
    const titleAgain = await listFor(['title']);
    expect(jest.mocked(buildFiltersSchema).mock.calls.length).toBe(buildsAfterCount);
    expect(titleAgain).toEqual(title);
  });

  test('editing the permitted locales changes the next list', async () => {
    const strapi = createStrapi(true);
    const localeCodes: [string, ...string[]] = ['en', 'fr'];
    const { getService } = jest.requireMock(
      '../../../../../../content-manager/server/src/utils'
    ) as {
      getService: jest.Mock;
    };

    const listFor = async (permitted: string[]) => {
      getService.mockImplementation((name: string) => {
        if (name === 'permission-checker') {
          return {
            create: () => ({
              cannot: (_action: string, entity?: { locale?: string }) =>
                entity?.locale !== undefined && permitted.includes(entity.locale) === false,
            }),
          };
        }
        throw new Error(`Unexpected service ${name}`);
      });
      const { definitions } = registerTools(strapi, localeCodes);
      const session = await connect(strapi, definitions, { mode: 'list' }, abilityFor('all'));
      try {
        const { tools } = await session.client.listTools();
        return tools.find((tool) => tool.name === 'get_article')?.inputSchema;
      } finally {
        await session.close();
      }
    };

    const english = await listFor(['en']);
    const both = await listFor(['en', 'fr']);
    expect(JSON.stringify(english)).not.toEqual(JSON.stringify(both));
    expect(JSON.stringify(english)).toContain('en');
    expect(JSON.stringify(english)).not.toContain('fr');
    expect(JSON.stringify(both)).toContain('fr');

    const englishAgain = await listFor(['en']);
    expect(englishAgain).toEqual(english);
  });
});
