import { cloneDeep } from 'lodash/fp';
import { createAsyncSeriesHook, createAsyncParallelHook } from './hooks';

/**
 * @typedef ProviderHooksMap
 * @property willRegister
 * @property didRegister
 * @property willDelete
 * @property didDelete
 */

/**
 * Creates a new object containing various hooks used by the providers
 * @return {ProviderHooksMap}
 */
const createProviderHooksMap = () => ({
  // Register events
  willRegister: createAsyncSeriesHook(),
  didRegister: createAsyncParallelHook(),
  // Delete events
  willDelete: createAsyncParallelHook(),
  didDelete: createAsyncParallelHook(),
});

interface Options {
  throwOnDuplicates?: boolean;
}

/**
 * A Provider factory
 */
const providerFactory = (options: Options = {}) => {
  const { throwOnDuplicates = true } = options;

  const state = {
    hooks: createProviderHooksMap(),
    registry: new Map(),
  };

  return {
    hooks: state.hooks,

    async register(key: string, item: unknown) {
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

export = providerFactory;
