import type { Modules } from '@strapi/types';
import { McpCapabilityRegistryBase, RegisteredCapability } from '../McpCapabilityRegistry';
import { McpCapabilityDefinitionRegistry } from '../McpCapabilityDefinitionRegistry';

// Mock definition type for testing
type MockDefinition = Modules.MCP.McpCapabilityDefinition<string> & {
  title: string;
  description: string;
};

// Mock registered capability for testing
class MockRegisteredCapability implements RegisteredCapability {
  enabled: boolean = false;

  enable = jest.fn(() => {
    this.enabled = true;
  });

  disable = jest.fn(() => {
    this.enabled = false;
  });

  remove = jest.fn();
}

// Concrete implementation for testing
class TestCapabilityRegistry extends McpCapabilityRegistryBase<
  'tool',
  MockDefinition,
  MockRegisteredCapability
> {
  registerDefinitions() {
    this.register(() => new MockRegisteredCapability());
  }
}

describe('McpCapabilityRegistryBase', () => {
  let definitionRegistry: McpCapabilityDefinitionRegistry<'tool', MockDefinition>;
  let registry: TestCapabilityRegistry;

  beforeEach(() => {
    definitionRegistry = new McpCapabilityDefinitionRegistry<'tool', MockDefinition>('tool');
    registry = new TestCapabilityRegistry(definitionRegistry);
  });

  describe('register', () => {
    test('should register all definitions from the definition registry', () => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        auth: { actions: ['test::action'] },
      });

      registry.registerDefinitions();

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('tool-1');
      expect(list[1].name).toBe('tool-2');
    });

    test('should disable capabilities by default after registration', () => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });

      registry.registerDefinitions();

      expect(registry.status('tool-1')).toBe('disabled');
    });

    test('should throw error when registering a capability with duplicate name', () => {
      definitionRegistry.define({
        name: 'duplicate-tool',
        title: 'Tool',
        description: 'Tool',
        auth: { actions: ['test::action'] },
      });

      registry.registerDefinitions();

      // Try to register again
      expect(() => {
        registry.registerDefinitions();
      }).toThrow(
        '[MCP] tool with name "duplicate-tool" is already registered. Names must be unique.'
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      definitionRegistry.define({
        name: 'tool-3',
        title: 'Tool 3',
        description: 'Third tool',
        auth: { actions: ['test::action'] },
      });
    });

    test('should list all capabilities with status', () => {
      registry.registerDefinitions();

      const list = registry.list();

      expect(list).toHaveLength(3);
      expect(list).toEqual([
        {
          name: 'tool-1',
          status: 'disabled',
          devModeOnly: false,
          auth: { actions: ['test::action'] },
        },
        { name: 'tool-2', status: 'disabled', devModeOnly: true },
        {
          name: 'tool-3',
          status: 'disabled',
          devModeOnly: false,
          auth: { actions: ['test::action'] },
        },
      ]);
    });

    test('should list capabilities filtered by enabled status', () => {
      registry.registerDefinitions();
      registry.enable('tool-1');

      const list = registry.list({
        filter: { status: ['enabled'] },
      });

      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        name: 'tool-1',
        status: 'enabled',
        devModeOnly: false,
        auth: { actions: ['test::action'] },
      });
    });

    test('should list capabilities filtered by disabled status', () => {
      registry.registerDefinitions();
      registry.enable('tool-1');

      const list = registry.list({
        filter: { status: ['disabled'] },
      });

      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('tool-2');
      expect(list[1].name).toBe('tool-3');
    });

    test('should list capabilities filtered by defined status', () => {
      // Don't register, only define
      const list = registry.list({
        filter: { status: ['defined'] },
      });

      expect(list).toHaveLength(3);
      expect(list[0]).toEqual({
        name: 'tool-1',
        status: 'defined',
        devModeOnly: false,
        auth: { actions: ['test::action'] },
      });
      expect(list[1]).toEqual({
        name: 'tool-2',
        status: 'defined',
        devModeOnly: true,
      });
      expect(list[2]).toEqual({
        name: 'tool-3',
        status: 'defined',
        devModeOnly: false,
        auth: { actions: ['test::action'] },
      });
    });

    test('should list capabilities filtered by multiple statuses', () => {
      registry.registerDefinitions();
      registry.enable('tool-1');

      const list = registry.list({
        filter: { status: ['enabled', 'disabled'] },
      });

      expect(list).toHaveLength(3);
    });

    test('should return empty array when no capabilities match filter', () => {
      registry.registerDefinitions();

      const list = registry.list({
        filter: { status: ['enabled'] },
      });

      expect(list).toHaveLength(0);
    });

    test('should include devModeOnly flag in list results', () => {
      registry.registerDefinitions();

      const list = registry.list();

      expect(list[0].devModeOnly).toBe(false);
      expect(list[1].devModeOnly).toBe(true);
      expect(list[2].devModeOnly).toBe(false);
    });
  });

  describe('status', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
    });

    test('should return "disabled" for registered but disabled capability', () => {
      registry.registerDefinitions();

      expect(registry.status('tool-1')).toBe('disabled');
    });

    test('should return "enabled" for registered and enabled capability', () => {
      registry.registerDefinitions();
      registry.enable('tool-1');

      expect(registry.status('tool-1')).toBe('enabled');
    });

    test('should return "defined" for defined but not registered capability', () => {
      // Don't call registerDefinitions
      expect(registry.status('tool-1')).toBe('defined');
    });

    test('should return "undefined" for unknown capability', () => {
      expect(registry.status('unknown-tool')).toBe('undefined');
    });
  });

  describe('enable', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      registry.registerDefinitions();
    });

    test('should enable a disabled capability', () => {
      registry.enable('tool-1');

      expect(registry.status('tool-1')).toBe('enabled');
    });

    test('should call enable method on registered capability', () => {
      registry.enable('tool-1');

      // The enable method should have been called through the internal registered capability
      expect(registry.status('tool-1')).toBe('enabled');
    });

    test('should throw error when enabling unregistered capability', () => {
      expect(() => {
        registry.enable('unknown-tool');
      }).toThrow('[MCP] tool with name "unknown-tool" is not registered.');
    });
  });

  describe('enableAll', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      registry.registerDefinitions();
    });

    test('should enable all registered capabilities', () => {
      registry.enableAll();

      expect(registry.status('tool-1')).toBe('enabled');
      expect(registry.status('tool-2')).toBe('enabled');
    });

    test('should work when called on empty registry', () => {
      const emptyRegistry = new TestCapabilityRegistry(
        new McpCapabilityDefinitionRegistry<'tool', MockDefinition>('tool')
      );

      expect(() => {
        emptyRegistry.enableAll();
      }).not.toThrow();
    });
  });

  describe('disable', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      registry.registerDefinitions();
    });

    test('should disable an enabled capability', () => {
      registry.enable('tool-1');
      expect(registry.status('tool-1')).toBe('enabled');

      registry.disable('tool-1');

      expect(registry.status('tool-1')).toBe('disabled');
    });

    test('should call disable method on registered capability', () => {
      registry.enable('tool-1');

      registry.disable('tool-1');

      // The disable method should have been called through the internal registered capability
      expect(registry.status('tool-1')).toBe('disabled');
    });

    test('should throw error when disabling unregistered capability', () => {
      expect(() => {
        registry.disable('unknown-tool');
      }).toThrow('[MCP] tool with name "unknown-tool" is not registered.');
    });
  });

  describe('disableAll', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      registry.registerDefinitions();
    });

    test('should disable all registered capabilities', () => {
      registry.enableAll();
      expect(registry.status('tool-1')).toBe('enabled');
      expect(registry.status('tool-2')).toBe('enabled');

      registry.disableAll();

      expect(registry.status('tool-1')).toBe('disabled');
      expect(registry.status('tool-2')).toBe('disabled');
    });

    test('should work when called on empty registry', () => {
      const emptyRegistry = new TestCapabilityRegistry(
        new McpCapabilityDefinitionRegistry<'tool', MockDefinition>('tool')
      );

      expect(() => {
        emptyRegistry.disableAll();
      }).not.toThrow();
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      registry.registerDefinitions();
    });

    test('should remove a registered capability', () => {
      expect(registry.status('tool-1')).toBe('disabled');

      registry.remove('tool-1');

      // Should now be "defined" since it's only in definition registry
      expect(registry.status('tool-1')).toBe('defined');
    });

    test('should call remove method on registered capability', () => {
      registry.remove('tool-1');

      // Verify it was removed by checking it's no longer in the list of registered
      expect(registry.status('tool-1')).toBe('defined');
    });

    test('should throw error when removing unregistered capability', () => {
      expect(() => {
        registry.remove('unknown-tool');
      }).toThrow('[MCP] tool with name "unknown-tool" is not registered.');
    });

    test('should allow removing and re-registering a capability', () => {
      registry.remove('tool-1');
      expect(registry.status('tool-1')).toBe('defined');

      registry.registerDefinitions();
      expect(registry.status('tool-1')).toBe('disabled');
    });
  });

  describe('removeAll', () => {
    beforeEach(() => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      registry.registerDefinitions();
    });

    test('should remove all registered capabilities', () => {
      expect(registry.status('tool-1')).toBe('disabled');
      expect(registry.status('tool-2')).toBe('disabled');

      registry.removeAll();

      // Should now be "defined" since they're only in definition registry
      expect(registry.status('tool-1')).toBe('defined');
      expect(registry.status('tool-2')).toBe('defined');
    });

    test('should call remove method on all registered capabilities', () => {
      registry.removeAll();

      // Verify they were removed by checking status
      expect(registry.status('tool-1')).toBe('defined');
      expect(registry.status('tool-2')).toBe('defined');
    });

    test('should work when called on empty registry', () => {
      const emptyRegistry = new TestCapabilityRegistry(
        new McpCapabilityDefinitionRegistry<'tool', MockDefinition>('tool')
      );

      expect(() => {
        emptyRegistry.removeAll();
      }).not.toThrow();
    });

    test('should clear the registered capabilities map', () => {
      registry.removeAll();

      const list = registry.list({ filter: { status: ['disabled', 'enabled'] } });
      expect(list).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    test('should handle enable-disable-enable cycle', () => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      registry.registerDefinitions();

      registry.enable('tool-1');
      expect(registry.status('tool-1')).toBe('enabled');

      registry.disable('tool-1');
      expect(registry.status('tool-1')).toBe('disabled');

      registry.enable('tool-1');
      expect(registry.status('tool-1')).toBe('enabled');
    });

    test('should handle enableAll-disableAll cycle', () => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      registry.registerDefinitions();

      registry.enableAll();
      expect(registry.list({ filter: { status: ['enabled'] } })).toHaveLength(2);

      registry.disableAll();
      expect(registry.list({ filter: { status: ['enabled'] } })).toHaveLength(0);
    });

    test('should handle partial enable and selective removal', () => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      registry.registerDefinitions();

      registry.enable('tool-1');
      expect(registry.status('tool-1')).toBe('enabled');
      expect(registry.status('tool-2')).toBe('disabled');

      registry.remove('tool-1');
      expect(registry.status('tool-1')).toBe('defined');
      expect(registry.status('tool-2')).toBe('disabled');
    });

    test('should maintain separate state for each capability', () => {
      definitionRegistry.define({
        name: 'tool-1',
        title: 'Tool 1',
        description: 'First tool',
        auth: { actions: ['test::action'] },
      });
      definitionRegistry.define({
        name: 'tool-2',
        title: 'Tool 2',
        description: 'Second tool',
        devModeOnly: true,
      });
      registry.registerDefinitions();

      registry.enable('tool-1');

      expect(registry.status('tool-1')).toBe('enabled');
      expect(registry.status('tool-2')).toBe('disabled');
    });
  });
});
