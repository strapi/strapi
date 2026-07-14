import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped read/write routing state.
 *
 * When a read replica is configured, reads may be served by the replica to
 * offload the writer. Replicas lag the writer, so a read issued after a write
 * in the same logical unit of work (e.g. an HTTP request) could observe stale
 * data. To preserve read-after-write consistency we track, per async scope,
 * whether a write has occurred ("dirty"). Once dirty, subsequent reads in that
 * scope are routed to the writer.
 *
 * Outside any scope (bootstrap, migrations, lifecycles, cron, CLI) there is no
 * store, `shouldUseReplica()` returns false, and everything is routed to the
 * writer — the safe default.
 */
interface RoutingStore {
  dirty: boolean;
}

const storage = new AsyncLocalStorage<RoutingStore>();

const routingCtx = {
  /**
   * Run `cb` inside a fresh routing scope. A nested run inherits the parent's
   * dirty state *at creation time*, so a read-after-write already recorded on
   * the parent cannot escape to the replica through a nested async context.
   * (The snapshot does not propagate later parent/child changes across scopes;
   * scopes are not nested in current usage — see server request middleware.)
   */
  run<T>(cb: () => T): T {
    const parent = storage.getStore();
    const store: RoutingStore = { dirty: parent?.dirty ?? false };
    return storage.run(store, cb);
  },

  /** Mark the current scope as having performed a write. No-op outside a scope. */
  markDirty() {
    const store = storage.getStore();
    if (store) {
      store.dirty = true;
    }
  },

  /** Whether a write has occurred in the current scope. */
  isDirty() {
    return storage.getStore()?.dirty ?? false;
  },

  /** Whether we are currently inside a routing scope. */
  hasScope() {
    return storage.getStore() !== undefined;
  },

  /**
   * Whether reads in the current scope may be served by the replica: only when
   * a scope exists and no write has occurred in it yet.
   */
  shouldUseReplica() {
    const store = storage.getStore();
    return store !== undefined && !store.dirty;
  },
};

export { routingCtx };
