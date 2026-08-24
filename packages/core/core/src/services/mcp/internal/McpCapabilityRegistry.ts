import type { Modules } from '@strapi/types';
// eslint-disable-next-line import/extensions
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpCapabilityDefinitionRegistry } from './McpCapabilityDefinitionRegistry';

export interface McpCapabilityRegistry {
  bind: (mcpServer: McpServer) => void;
}

/** Read-only registry surface for external consumers (plugins, handlers). */
export type McpCapabilityRegistryReadonly = Pick<
  McpCapabilityRegistryBase<'tool', Modules.MCP.McpCapabilityDefinition, RegisteredCapability>,
  'list' | 'status'
>;

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
    this.#definitions.forEach((definition) => {
      // Defence: register() must be called at most once per registry instance (double-bind protection).
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
    });
  }

  list(ctx?: {
    filter?: {
      status?: ('enabled' | 'disabled' | 'defined' | 'undefined')[];
    };
  }) {
    const { filter } = ctx ?? {};
    return this.#definitions.getAll().reduce<
      {
        name: string;
        status: 'enabled' | 'disabled' | 'defined' | 'undefined';
        devModeOnly: boolean;
        auth: Definition['auth'] | undefined;
      }[]
    >((acc, curr) => {
      const status = this.status(curr.name);
      if (filter?.status !== undefined && !filter.status.includes(status)) {
        return acc;
      }
      acc.push({ name: curr.name, status, devModeOnly: !!curr.devModeOnly, auth: curr.auth });
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

  /** @internal Used by syncMcpSessionCapabilities; not part of the public registry API. */
  enable(name: string) {
    const registered = this.#registered.get(name);
    if (!registered) {
      throw new Error(
        `[MCP] ${this.#definitions.capability} with name "${name}" is not registered.`
      );
    }
    registered.enable();
  }

  /** @internal Used by syncMcpSessionCapabilities; not part of the public registry API. */
  enableAll() {
    for (const registered of this.#registered.values()) {
      registered.enable();
    }
  }

  /** @internal Used by syncMcpSessionCapabilities; not part of the public registry API. */
  disable(name: string) {
    const registered = this.#registered.get(name);
    if (!registered) {
      throw new Error(
        `[MCP] ${this.#definitions.capability} with name "${name}" is not registered.`
      );
    }
    registered.disable();
  }

  /** @internal Used by syncMcpSessionCapabilities; not part of the public registry API. */
  disableAll() {
    for (const registered of this.#registered.values()) {
      registered.disable();
    }
  }

  /** @internal Used by syncMcpSessionCapabilities; not part of the public registry API. */
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

  /** @internal Used by syncMcpSessionCapabilities; not part of the public registry API. */
  removeAll() {
    for (const registered of this.#registered.values()) {
      registered.remove();
    }
    this.#registered.clear();
  }
}
