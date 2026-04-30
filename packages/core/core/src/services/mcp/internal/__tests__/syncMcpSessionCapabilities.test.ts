import type { Modules } from '@strapi/types';
import type { McpCapabilityDefinitions } from '../McpServerFactory';
import type { McpAdminTokenAbility } from '../../authentication';
import type { McpSession } from '../McpSession';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';
import { canUseMcpCapability, syncMcpSessionCapabilities } from '../syncMcpSessionCapabilities';

type RegistryStatus = 'enabled' | 'disabled' | 'defined' | 'undefined';

const createDefinitions = ({
  tools = [],
  prompts = [],
  resources = [],
}: {
  tools?: Modules.MCP.McpToolDefinition[];
  prompts?: Modules.MCP.McpPromptDefinition[];
  resources?: Modules.MCP.McpResourceDefinition[];
}): McpCapabilityDefinitions => {
  const toolDefinitions = new McpCapabilityDefinitionRegistry<
    'tool',
    Modules.MCP.McpToolDefinition
  >('tool');
  tools.forEach((definition) => {
    toolDefinitions.define(definition);
  });

  const promptDefinitions = new McpCapabilityDefinitionRegistry<
    'prompt',
    Modules.MCP.McpPromptDefinition
  >('prompt');
  prompts.forEach((definition) => {
    promptDefinitions.define(definition);
  });

  const resourceDefinitions = new McpCapabilityDefinitionRegistry<
    'resource',
    Modules.MCP.McpResourceDefinition
  >('resource');
  resources.forEach((definition) => {
    resourceDefinitions.define(definition);
  });

  return {
    tools: toolDefinitions,
    prompts: promptDefinitions,
    resources: resourceDefinitions,
  };
};

const createRegistry = (initialStatus: Record<string, RegistryStatus>) => {
  const statuses = new Map<string, RegistryStatus>(Object.entries(initialStatus));

  return {
    status: jest.fn((name: string) => statuses.get(name) ?? 'undefined'),
    enable: jest.fn((name: string) => {
      statuses.set(name, 'enabled');
    }),
    disable: jest.fn((name: string) => {
      statuses.set(name, 'disabled');
    }),
  };
};

const createSession = ({
  toolStatus = {},
  promptStatus = {},
  resourceStatus = {},
}: {
  toolStatus?: Record<string, RegistryStatus>;
  promptStatus?: Record<string, RegistryStatus>;
  resourceStatus?: Record<string, RegistryStatus>;
}): Pick<McpSession, 'toolRegistry' | 'promptRegistry' | 'resourceRegistry'> =>
  ({
    toolRegistry: createRegistry(toolStatus),
    promptRegistry: createRegistry(promptStatus),
    resourceRegistry: createRegistry(resourceStatus),
  }) as unknown as Pick<McpSession, 'toolRegistry' | 'promptRegistry' | 'resourceRegistry'>;

const createAbility = (can: McpAdminTokenAbility['can']): McpAdminTokenAbility => ({
  can,
  cannot: jest.fn(
    (action: string, subject?: unknown, field?: string) => !can(action, subject, field)
  ),
});

const createToolDefinition = (
  params: Pick<Modules.MCP.McpToolDefinition, 'name'> &
    Partial<Pick<Modules.MCP.McpToolDefinition, 'auth' | 'devModeOnly'>>
): Modules.MCP.McpToolDefinition =>
  ({
    name: params.name,
    auth: params.auth,
    devModeOnly: params.devModeOnly,
  }) as Modules.MCP.McpToolDefinition;

describe('syncMcpSessionCapabilities', () => {
  test('disables an enabled capability when fresh ability denies it', () => {
    const ability = createAbility(jest.fn(() => false));
    const session = createSession({ toolStatus: { denied: 'enabled' } });
    const definitions = createDefinitions({
      tools: [createToolDefinition({ name: 'denied', auth: { action: 'admin::read' } })],
    });

    const summary = syncMcpSessionCapabilities({
      session,
      definitions,
      ability,
      isDevMode: false,
    });

    expect(session.toolRegistry.disable).toHaveBeenCalledWith('denied');
    expect(session.toolRegistry.enable).not.toHaveBeenCalled();
    expect(summary).toStrictEqual({ enabled: [], disabled: ['denied'] });
  });

  test('enables a disabled capability when fresh ability allows it', () => {
    const ability = createAbility(jest.fn(() => true));
    const session = createSession({ promptStatus: { allowed: 'disabled' } });
    const definitions = createDefinitions({
      prompts: [
        {
          name: 'allowed',
          auth: { action: 'admin::read' },
        } as Modules.MCP.McpPromptDefinition,
      ],
    });

    const summary = syncMcpSessionCapabilities({
      session,
      definitions,
      ability,
      isDevMode: false,
    });

    expect(session.promptRegistry.enable).toHaveBeenCalledWith('allowed');
    expect(session.promptRegistry.disable).not.toHaveBeenCalled();
    expect(summary).toStrictEqual({ enabled: ['allowed'], disabled: [] });
  });

  test('does not mutate registries when current status already matches desired state', () => {
    const ability = createAbility(jest.fn((action: string) => action === 'admin::read'));
    const session = createSession({
      toolStatus: { allowed: 'enabled', denied: 'disabled' },
    });
    const definitions = createDefinitions({
      tools: [
        createToolDefinition({ name: 'allowed', auth: { action: 'admin::read' } }),
        createToolDefinition({ name: 'denied', auth: { action: 'admin::delete' } }),
      ],
    });

    const summary = syncMcpSessionCapabilities({
      session,
      definitions,
      ability,
      isDevMode: false,
    });

    expect(session.toolRegistry.enable).not.toHaveBeenCalled();
    expect(session.toolRegistry.disable).not.toHaveBeenCalled();
    expect(summary).toStrictEqual({ enabled: [], disabled: [] });
  });

  test('passes auth subject through the centralized availability adapter', () => {
    const ability = createAbility(jest.fn(() => true));

    canUseMcpCapability({
      ability,
      definition: createToolDefinition({
        name: 'subject-tool',
        auth: { action: 'admin::read', subject: 'api::article.article' },
      }),
      isDevMode: false,
    });

    expect(ability.can).toHaveBeenCalledWith('admin::read', 'api::article.article');
  });

  test('does not model field-level availability at the session capability layer', () => {
    const ability = createAbility(jest.fn(() => true));

    canUseMcpCapability({
      ability,
      definition: createToolDefinition({
        name: 'field-restricted-tool',
        auth: { action: 'admin::read', subject: 'api::article.article' },
      }),
      isDevMode: false,
    });

    expect(ability.can).toHaveBeenCalledWith('admin::read', 'api::article.article');
  });

  test('keeps devModeOnly availability governed by dev mode only', () => {
    const ability = createAbility(jest.fn(() => false));

    expect(
      canUseMcpCapability({
        ability,
        definition: createToolDefinition({ name: 'dev-tool', devModeOnly: true }),
        isDevMode: true,
      })
    ).toBe(true);
    expect(ability.can).not.toHaveBeenCalled();
  });

  test('does not evaluate entity conditions during coarse session availability', () => {
    const ability = createAbility(jest.fn(() => true));

    canUseMcpCapability({
      ability,
      definition: createToolDefinition({
        name: 'conditioned-tool',
        auth: { action: 'admin::read', subject: 'api::article.article' },
      }),
      isDevMode: false,
    });

    expect(ability.can).toHaveBeenCalledWith('admin::read', 'api::article.article');
  });
});
