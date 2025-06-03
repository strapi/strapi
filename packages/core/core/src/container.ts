import type { Core } from '@strapi/types';

export class Container implements Core.Container {
  private registerMap = new Map<string, unknown>();

  private serviceMap = new Map();

  add(name: string, resolver: unknown) {
    if (this.registerMap.has(name)) {
      throw new Error(`Cannot register already registered service ${name}`);
    }

    this.registerMap.set(name, resolver);
    return this;
  }

  get(name: string, args?: unknown) {
    // TODO: handle singleton vs instantiation everytime
    if (this.serviceMap.has(name)) {
      return this.serviceMap.get(name);
    }

    if (this.registerMap.has(name)) {
      const resolver = this.registerMap.get(name);

      if (typeof resolver === 'function') {
        this.serviceMap.set(name, resolver(this, args));
      } else {
        this.serviceMap.set(name, resolver);
      }

      return this.serviceMap.get(name);
    }

    throw new Error(`Could not resolve service ${name}`);
  }
}
