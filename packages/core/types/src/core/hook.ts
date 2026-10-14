import type * as Schema from '../schema';
import type { SuggestedString } from '../utils/string';
import type { IsStrict, RegisteredRecord } from './strictness';

/**
 * A function a hook runs with the context its caller passes. Parallel and series hooks ignore its
 * result.
 */
export type HookHandler<TContext> = (context: TContext) => unknown;

/**
 * Handler registration shared by every hook kind. `register` and `delete` return the hook itself, so
 * calls chain. The chained value does not expose `call`: only the hook's caller runs it.
 *
 * Handlers run in registration order: core providers, then plugins, then the application. `delete`
 * needs the registered function itself.
 */
export interface HookHandlers<TContext> {
  getHandlers(): HookHandler<TContext>[];
  register(handler: HookHandler<TContext>): HookHandlers<TContext>;
  delete(handler: HookHandler<TContext>): HookHandlers<TContext>;
}

/**
 * A hook created by `hooks.createAsyncParallelHook()` from `@strapi/utils`, whose caller passes
 * `TContext`. `call` runs every handler at once, each with its own deep clone of the context, so a
 * handler cannot change what the caller or the other handlers see.
 */
export interface AsyncParallelHook<TContext> extends HookHandlers<TContext> {
  call(context: TContext): Promise<unknown[]>;
}

/**
 * The context of the `strapi::content-types.beforeSync` and `afterSync` hooks, which `@strapi/core`
 * calls around the database schema sync at bootstrap.
 */
export type ContentTypesSyncContext = {
  /**
   * The content-type schemas saved at the previous start. `undefined` when the core store table does
   * not exist yet, `null` when it has no saved schemas: handlers check it before reading it.
   */
  oldContentTypes: Record<string, Schema.ContentType> | null | undefined;
  /** The content-type schemas of this start. */
  contentTypes: Record<string, Schema.ContentType>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * Hooks of the Strapi instance itself. `@strapi/core` sets them before plugins register and
       * calls them around the database schema sync at bootstrap. They are registered here, next to the
       * `Strapi` interface, so that packages depending only on `@strapi/types` see them.
       */
      interface Hooks {
        'strapi::content-types.beforeSync': AsyncParallelHook<ContentTypesSyncContext>;
        'strapi::content-types.afterSync': AsyncParallelHook<ContentTypesSyncContext>;
      }
    }
  }
}

/** Hook UIDs that have a registered contract. */
export type RegisteredHookUID = keyof Strapi.Registries.Hooks;

/**
 * The registered contract of a hook UID. With strict types enabled, an unregistered UID resolves to
 * `unknown`: nothing tells which hook, if any, is registered under it. Without strict types, `any`,
 * as before the registry existed.
 */
export type HookFor<TUID extends string> = IsStrict extends false
  ? any
  : TUID extends RegisteredHookUID
    ? Strapi.Registries.Hooks[TUID]
    : unknown;

/** A UID accepted by `strapi.hook(uid)`. Registered UIDs are listed for completion. */
export type HookLookupUID = SuggestedString<RegisteredHookUID>;

/**
 * Hooks keyed by UID, e.g. `strapi.hooks`. With strict types enabled, registered UIDs resolve to their
 * contracts and other keys to `unknown`.
 */
export type HookMap = IsStrict extends false
  ? Record<string, any>
  : RegisteredRecord<{ [TUID in RegisteredHookUID]: HookFor<TUID> }, unknown>;

/**
 * The hooks registry, `strapi.get('hooks')`, with strict types enabled.
 *
 * At runtime, a UID holds one hook, and `set` and `extend` replace it: `set` overwrites it silently
 * (registered handlers are dropped), `extend` wraps it. But the payload is built by the hook's caller,
 * the package that registers the contract, and replacing the hook does not change what it passes.
 * So, for a registered UID, `set` and `extend` accept only a hook of the registered contract: the hook
 * can be replaced, its contract cannot. Unregistered UIDs accept any hook.
 */
export interface StrictHooksRegistry {
  /** UIDs of every hook set so far, registered or not. */
  keys(): string[];
  /**
   * The hook set under `uid`, or `undefined` when nothing is: a registered contract only describes
   * the hook once its owner sets it, during its register phase.
   */
  get<TUID extends HookLookupUID>(uid: TUID): HookFor<TUID> | undefined;
  /** Hooks whose UID is in `namespace` (`'plugin::my-plugin'` or `'strapi::'`), keyed by full UID. */
  getAll(namespace?: string): Record<string, unknown>;
  /** Sets the hook of `uid`, replacing the current one and its handlers. */
  set<TUID extends HookLookupUID>(uid: TUID, hook: HookFor<TUID>): StrictHooksRegistry;
  /**
   * Sets each hook of `hooks` under `namespace`: `'<namespace>.<name>'`, or `'<namespace><name>'`
   * when the namespace ends with `::`. Like `set`, a registered UID accepts only its contract.
   */
  add<TNamespace extends string, THooks extends Record<string, unknown>>(
    namespace: TNamespace,
    hooks: THooks & {
      [TName in keyof THooks & string]: HookFor<
        TNamespace extends `${string}::` ? `${TNamespace}${TName}` : `${TNamespace}.${TName}`
      >;
    }
  ): StrictHooksRegistry;
  /**
   * Replaces the hook of `uid` with the result of `extendFn`, which receives the current hook.
   * Throws when no hook is set under `uid`.
   */
  extend<TUID extends HookLookupUID>(
    uid: TUID,
    extendFn: (hook: HookFor<TUID>) => HookFor<TUID>
  ): StrictHooksRegistry;
}
