import { cloneDeep } from 'lodash/fp';
import {
  createAsyncSeriesHook,
  createAsyncParallelHook,
  AsyncSeriesHook,
  AsyncParallelHook,
} from './hooks';

export interface ProviderHooksMap {
  willRegister: AsyncSeriesHook;
  didRegister: AsyncParallelHook;
  willDelete: AsyncParallelHook;
  didDelete: AsyncParallelHook;
}

/**
 * Creates a new object containing various hooks used by the providers
 */
const createProviderHooksMap = (): ProviderHooksMap => ({
  // Register events
  willRegister: createAsyncSeriesHook(),
  didRegister: createAsyncParallelHook(),
  // Delete events
  willDelete: createAsyncParallelHook(),
  didDelete: createAsyncParallelHook(),
});

export interface Options {
  throwOnDuplicates?: boolean;
}

type Item = Record<string, unknown>;

export interface Provider {
  hooks: ProviderHooksMap;
  register(key: string, item: Item): Promise<Provider>;
  delete(key: string): Promise<Provider>;
  get(key: string): Item | undefined;
  getWhere(filters?: Record<string, unknown>): Item[];
  values(): Item[];
  keys(): string[];
  has(key: string): boolean;
  size(): number;
  clear(): Promise<Provider>;
}

export type ProviderFactory = (options?: Options) => Provider;

/**
 * A Provider factory
 */
const providerFactory: ProviderFactory = (options = {}) => {
  const { throwOnDuplicates = true } = options;

  const state = {
    hooks: createProviderHooksMap(),
    registry: new Map<string, Item>(),
  };

  return {
    hooks: state.hooks,

    async register(key: string, item: Item) {
      if (throwOnDuplicates && this.has(key)) {
        throw new Error(`Duplicated item key: ${key}`);
      }

      await state.hooks.willRegister.call({ key, value: item });

      state.registry.set(key, item);

      await state.hooks.didRegister.call({ key, value: cloneDeep(item) });

      return this;
    },

    async delete(key: string) {
      if (this.has(key)) {
        const item = this.get(key);

        await state.hooks.willDelete.call({ key, value: cloneDeep(item) });

        state.registry.delete(key);

        await state.hooks.didDelete.call({ key, value: cloneDeep(item) });
      }

      return this;
    },

    get(key: string) {
      return state.registry.get(key);
    },

    getWhere(filters = {}) {
      const items = this.values();
      const filtersEntries = Object.entries(filters);

      if (filtersEntries.length === 0) {
        return items;
      }

      return items.filter((item) => {
        return filtersEntries.every(([key, value]) => item[key] === value);
      });
    },

    values() {
      return Array.from(state.registry.values());
    },

    keys() {
      return Array.from(state.registry.keys());
    },

    has(key: string) {
      return state.registry.has(key);
    },

    size() {
      return state.registry.size;
    },

    async clear() {
      const keys = this.keys();

      for (const key of keys) {
        await this.delete(key);
      }

      return this;
    },
  };
};

export default providerFactory;
