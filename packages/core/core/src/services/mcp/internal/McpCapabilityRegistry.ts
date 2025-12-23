import type { Modules } from '@strapi/types';
// eslint-disable-next-line import/extensions
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpCapabilityDefinitionRegistry } from './McpCapabilityDefinitionRegistry';

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
  Definition extends Modules.MCP.McpCapabilityDefinition,
  Registered extends RegisteredCapability,
> {
  #definitions: McpCapabilityDefinitionRegistry<CapabilityName, Definition>;

  #registered = new Map<string, Registered>();

  constructor(definitions: McpCapabilityDefinitionRegistry<CapabilityName, Definition>) {
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

      // Disable the capability until explicitly enabled depending on devModeOnly and authorization
      registered.disable();

      this.#registered.set(definition.name, registered);
    }
  }

  list(ctx?: {
    filter?: {
      status?: ('enabled' | 'disabled' | 'defined' | 'undefined')[];
    };
  }) {
    const { filter } = ctx ?? {};
    return this.#definitions.values.reduce<
      {
        name: string;
        status: 'enabled' | 'disabled' | 'defined' | 'undefined';
        devModeOnly: boolean;
      }[]
    >((acc, curr) => {
      const status = this.status(curr.name);
      if (filter?.status !== undefined && !filter.status.includes(status)) {
        return acc;
      }
      acc.push({ name: curr.name, status, devModeOnly: curr.devModeOnly });
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

  enableAll() {
    for (const registered of this.#registered.values()) {
      registered.enable();
    }
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

  disableAll() {
    for (const registered of this.#registered.values()) {
      registered.disable();
    }
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

  removeAll() {
    for (const registered of this.#registered.values()) {
      registered.remove();
    }
    this.#registered.clear();
  }
}
