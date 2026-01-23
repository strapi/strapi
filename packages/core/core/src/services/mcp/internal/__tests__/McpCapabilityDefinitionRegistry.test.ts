import type { Modules } from '@strapi/types';

import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';

describe('McpCapabilityDefinitionRegistry', () => {
  test('stores capability type', () => {
    const registry = new McpCapabilityDefinitionRegistry<
      'tool',
      Modules.MCP.McpCapabilityDefinition
    >('tool');

    expect(registry.capability).toBe('tool');
  });

  test('define() registers a definition and get() returns it', () => {
    const registry = new McpCapabilityDefinitionRegistry<
      'tool',
      Modules.MCP.McpCapabilityDefinition
    >('tool');

    const definition: Modules.MCP.McpCapabilityDefinition = {
      name: 'my-capability',
      devModeOnly: false,
      auth: { actions: ['test::action'] },
    };

    registry.define(definition);

    expect(registry.get('my-capability')).toBe(definition);
    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.size).toBe(1);
    expect(registry.values).toEqual([definition]);
  });

  test('define() throws when name is already registered', () => {
    const registry = new McpCapabilityDefinitionRegistry<
      'prompt',
      Modules.MCP.McpCapabilityDefinition
    >('prompt');

    const definitionA: Modules.MCP.McpCapabilityDefinition = {
      name: 'duplicate',
      devModeOnly: true,
    };
    const definitionB: Modules.MCP.McpCapabilityDefinition = {
      name: 'duplicate',
      devModeOnly: false,
      auth: { actions: ['test::action'] },
    };

    registry.define(definitionA);

    expect(() => registry.define(definitionB)).toThrow(
      '[MCP] prompt with name "duplicate" is already registered. Names must be unique.'
    );

    expect(registry.get('duplicate')).toBe(definitionA);
    expect(registry.size).toBe(1);
  });

  test('delete() removes definitions and reports success', () => {
    const registry = new McpCapabilityDefinitionRegistry<
      'resource',
      Modules.MCP.McpCapabilityDefinition
    >('resource');

    const definitionA: Modules.MCP.McpCapabilityDefinition = {
      name: 'a',
      devModeOnly: false,
      auth: { actions: ['test::action'] },
    };
    const definitionB: Modules.MCP.McpCapabilityDefinition = {
      name: 'b',
      devModeOnly: true,
    };

    registry.define(definitionA);
    registry.define(definitionB);

    expect(registry.size).toBe(2);
    expect(registry.values).toEqual([definitionA, definitionB]);

    expect(registry.delete('a')).toBe(true);
    expect(registry.get('a')).toBeUndefined();
    expect(registry.size).toBe(1);
    expect(registry.values).toEqual([definitionB]);

    expect(registry.delete('a')).toBe(false);
    expect(registry.delete('unknown')).toBe(false);
    expect(registry.size).toBe(1);
  });
});
