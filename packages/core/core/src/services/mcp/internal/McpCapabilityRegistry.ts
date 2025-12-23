// eslint-disable-next-line import/extensions
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpCapabilityDefinitions } from './McpCapabilityDefinitions';

export interface McpCapabilityRegistry {
  bind: (mcpServer: McpServer) => void;
}

export type RegisteredCapability = {
  enabled: boolean;
  enable(): void;
  disable(): void;
  remove(): void;
};

export class McpCapabilityRegistryBase<
  CapabilityName extends 'tool' | 'prompt' | 'resource',
  Definition extends { name: string },
  Registered extends RegisteredCapability,
> {
  #definitions: McpCapabilityDefinitions<CapabilityName, Definition>;

  #registered = new Map<string, Registered>();

  constructor(definitions: McpCapabilityDefinitions<CapabilityName, Definition>) {
    this.#definitions = definitions;
  }

  protected register<LocallyRegistered extends Registered>(
    registerFn: (definition: Definition) => LocallyRegistered
  ) {
    for (const definition of this.#definitions.values) {
      const existing = this.#registered.get(definition.name);
      if (existing !== undefined) {
        throw new Error(
          `[MCP] ${this.#definitions.capability} with name "${definition.name}" is already registered. Names must be unique.`
        );
      }

      const registered = registerFn(definition);
      this.#registered.set(definition.name, registered);
    }
  }

  list(ctx?: {
    filter?: {
      status?: 'enabled' | 'disabled' | 'defined' | 'undefined';
    };
  }) {
    const { filter } = ctx ?? {};
    return this.#definitions.values.reduce<
      { name: string; status: 'enabled' | 'disabled' | 'defined' | 'undefined' }[]
    >((acc, curr) => {
      const name = curr.name;
      const status = this.status(name);
      if (filter?.status !== undefined && status !== filter.status) {
        return acc;
      }
      acc.push({ name, status });
      return acc;
    }, []);
  }

  status(name: string): 'enabled' | 'disabled' | 'defined' | 'undefined' {
    const registered = this.#registered.get(name);
    if (registered !== undefined) {
      return registered.enabled === true ? 'enabled' : 'disabled';
    }
    const definition = this.#definitions.get(name);
    if (definition !== undefined) {
      return 'defined';
    }
    return 'undefined';
  }

  enable(name: string) {
    const registered = this.#registered.get(name);
    if (!registered) {
      throw new Error(
        `[MCP] ${this.#definitions.capability} with name "${name}" is not registered.`
      );
    }
    registered.enable();
  }

  disable(name: string) {
    const registered = this.#registered.get(name);
    if (!registered) {
      throw new Error(
        `[MCP] ${this.#definitions.capability} with name "${name}" is not registered.`
      );
    }
    registered.disable();
  }

  remove(name: string) {
    const registered = this.#registered.get(name);
    if (!registered) {
      throw new Error(
        `[MCP] ${this.#definitions.capability} with name "${name}" is not registered.`
      );
    }
    registered.remove();
    this.#registered.delete(name);
  }
}
