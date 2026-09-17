import { AsyncLocalStorage } from 'async_hooks';

/**
 * The resolved active channel, as stored on `ctx.state.channel` by the
 * resolve-channel middleware and read everywhere through `getCurrentChannel()`.
 */
export interface ChannelRef {
  id: number;
  slug: string;
}

interface ChannelScope {
  /** `null` = base (the virtual `default` channel). */
  channel: ChannelRef | null;
  /** Relation-hydration re-entrancy depth (see MAX_OVERLAY_DEPTH). */
  depth: number;
  /**
   * Set while a lifecycle handler (publish/unpublish/discard/delete/clone)
   * runs the wrapped core action: nested document-service calls made by the
   * core during that action (e.g. the firstPublishedAt draft update inside
   * publish) must pass through untouched, not be re-interpreted as channel
   * work.
   */
  internal: boolean;
}

/**
 * Explicit scope override. AsyncLocalStorage so the override survives awaits
 * without leaking across concurrent requests — same pattern as the spaces
 * plugin's `runUnscoped` and the branches plugin's `runOnBranch`.
 */
const scopeStorage = new AsyncLocalStorage<ChannelScope>();

const currentScope = (): ChannelScope | undefined => scopeStorage.getStore();

export const runOnChannel = <T>(channel: ChannelRef | null, fn: () => T | Promise<T>) => {
  const parent = currentScope();
  return scopeStorage.run({ channel, depth: parent?.depth ?? 0, internal: false }, fn);
};

export const runOnBase = <T>(fn: () => T | Promise<T>) => runOnChannel(null, fn);

/** Runs `fn` with nested document-service actions exempt from channel handling. */
export const runInternal = <T>(fn: () => T | Promise<T>) => {
  const parent = currentScope();
  return scopeStorage.run(
    { channel: parent?.channel ?? getRequestChannel(), depth: parent?.depth ?? 0, internal: true },
    fn
  );
};

/** Runs `fn` one hydration level deeper on the same channel. */
export const runDeeper = <T>(fn: () => T | Promise<T>) => {
  const parent = currentScope();
  return scopeStorage.run(
    {
      channel: parent?.channel ?? getRequestChannel(),
      depth: (parent?.depth ?? 0) + 1,
      internal: parent?.internal ?? false,
    },
    fn
  );
};

const getRequestChannel = (): ChannelRef | null => {
  const state = strapi.requestContext.get()?.state as { channel?: ChannelRef } | undefined;
  return state?.channel ?? null;
};

/**
 * The channel the current work targets: an explicit override first, then the
 * request's resolved header. `null` = base (also the answer outside any
 * request: cron jobs, bootstrap, CLI).
 */
export const getCurrentChannel = (): ChannelRef | null => {
  const scope = currentScope();
  if (scope) {
    return scope.channel;
  }
  return getRequestChannel();
};

export const getOverlayDepth = (): number => currentScope()?.depth ?? 0;

export const isInternalScope = (): boolean => currentScope()?.internal === true;

/**
 * Codec-compat pass-through. The branches plugin bypasses its DB visibility
 * net with this; channels filters nothing at the DB layer (base rows are the
 * only rows), so there is nothing to bypass — kept so the copied codec files
 * stay diff-minimal against their branches originals.
 */
export const runUnfiltered = <T>(fn: () => T | Promise<T>) => fn();
