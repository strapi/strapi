import { pickBy } from 'lodash/fp';
import { addNamespace, hasNamespace } from './namespace';

type Handler = (context: any) => any;

type AsyncHook = {
  handlers: Handler[];
  register(handler: Handler): AsyncHook;
  delete(handler: Handler): AsyncHook;
  call(): Promise<void>;
};

type SyncHook = {
  get handlers(): Handler[];
  register(handler: Handler): SyncHook;
  delete(handler: Handler): SyncHook;
  call(): void;
};

export type Hook = AsyncHook | SyncHook;

type HookExtendFn = (hook: Hook) => Hook;

const hooksRegistry = () => {
  const hooks: Record<string, Hook> = {};

  return {
    /**
     * Returns this list of registered hooks uids
     */
    keys() {
      return Object.keys(hooks);
    },

    /**
     * Returns the instance of a hook.
     */
    get(uid: string) {
      return hooks[uid];
    },

    /**
     * Returns a map with all the hooks in a namespace
     */
    getAll(namespace: string) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(hooks);
    },

    /**
     * Registers a hook
     */
    set(uid: string, hook: Hook) {
      hooks[uid] = hook;
      return this;
    },

    /**
     * Registers a map of hooks for a specific namespace
     */
    add(namespace: string, hooks: Record<string, Hook>) {
      for (const hookName of Object.keys(hooks)) {
        const hook = hooks[hookName];
        const uid = addNamespace(hookName, namespace);

        this.set(uid, hook);
      }

      return this;
    },

    /**
     * Wraps a hook to extend it
     */
    extend(uid: string, extendFn: HookExtendFn) {
      const currentHook = this.get(uid);

      if (!currentHook) {
        throw new Error(`Hook ${uid} doesn't exist`);
      }

      const newHook = extendFn(currentHook);
      hooks[uid] = newHook;

      return this;
    },
  };
};

export default hooksRegistry;
