import type { Modules } from '@strapi/types';

export class McpCapabilityDefinitionRegistry<
  CapabilityName extends 'tool' | 'prompt' | 'resource',
  Definition extends Modules.MCP.McpCapabilityDefinition,
> {
  capability: CapabilityName;

  #definitions = new Map<string, Definition>();

  constructor(capability: CapabilityName) {
    this.capability = capability;
  }

  get size(): number {
    return this.#definitions.size;
  }

  define(definition: Definition) {
    const existing = this.#definitions.get(definition.name);
    if (existing !== undefined) {
      throw new Error(
        `[MCP] ${this.capability} with name "${definition.name}" is already registered. Names must be unique.`
      );
    }

    if (definition.devModeOnly !== true) {
      if (definition.auth === undefined || definition.auth.action === '') {
        throw new Error(
          `[MCP] ${this.capability} with name "${definition.name}" must declare auth action or be devModeOnly.`
        );
      }
    }

    this.#definitions.set(definition.name, definition);
  }

  get(name: string): Definition | undefined {
    return this.#definitions.get(name);
  }

  delete(name: string): boolean {
    return this.#definitions.delete(name);
  }

  getAll(): Definition[] {
    return Array.from(this.#definitions.values());
  }

  forEach(callback: (definition: Definition) => void) {
    this.#definitions.forEach(callback);
  }
}
