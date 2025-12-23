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

  define(definition: Definition) {
    const existing = this.#definitions.get(definition.name);
    if (existing !== undefined) {
      throw new Error(
        `[MCP] ${this.capability} with name "${definition.name}" is already registered. Names must be unique.`
      );
    }
    this.#definitions.set(definition.name, definition);
  }

  get(name: string): Definition | undefined {
    return this.#definitions.get(name);
  }

  delete(name: string): boolean {
    return this.#definitions.delete(name);
  }

  get values(): Definition[] {
    return Array.from(this.#definitions.values());
  }
}
