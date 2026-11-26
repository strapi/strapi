import type { Core } from '@strapi/types';

export class Container implements Pick<Core.Strapi, 'add' | 'get' | 'has'> {
  private registerMap = new Map<string, unknown>();

  private serviceMap = new Map();

  add<TName extends Core.ContainerLookupName>(
    name: TName,
    resolver: Core.IsStrict extends false ? unknown : NoInfer<Core.ContainerResolver<TName>>
  ) {
    if (this.registerMap.has(name)) {
      throw new Error(`Cannot register already registered service ${name}`);
    }

    this.registerMap.set(name, resolver);
    return this;
  }

  has(name: string) {
    return this.registerMap.has(name) || this.serviceMap.has(name);
  }

  /**
   * Resolves the value added under `name`, typed like `Core.Strapi['get']`: a registered name
   * (`Strapi.Registries.ContainerEntries`) resolves to its registered value, an unregistered or
   * dynamic name to `unknown`, an explicit type argument to itself. The maps are untyped: the
   * registry is the contract of what `add` stores under each name.
   *
   * Unlike `Core.Strapi['get']`, `T` is not wrapped in `NoInfer`: TypeScript cannot infer a
   * `NoInfer` type parameter when it compares two signatures, so this class could not implement it.
   * Without strict types, it returns `any`, as on develop: the published declarations of
   * `@strapi/core` are emitted, and checked by applications, with strict types off.
   */
  get<T = unknown, TName extends Core.ContainerLookupName = Core.ContainerLookupName>(
    name: TName,
    args?: unknown
  ): Core.IsStrict extends false ? any : Core.ContainerLookup<TName, T> {
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

  /**
   * Drop registered services so a destroyed instance can be collected.
   * `Strapi.destroy()` does not call this. The API test helper does, after
   * destroy succeeds, because those tests keep the instance for the whole
   * Jest process.
   */
  release() {
    this.registerMap.clear();
    this.serviceMap.clear();
  }
}
