/**
 * Compile-only checks of the hook types, run by `hooks.types.vitest.test.ts`.
 * A failed assertion is a type error, and an unused `@ts-expect-error` is one too.
 */
import {
  createAsyncBailHook,
  createAsyncParallelHook,
  createAsyncSeriesHook,
  createAsyncSeriesWaterfallHook,
  internals,
} from '../../../hooks';
import type {
  AsyncBailHook,
  AsyncParallelHook,
  AsyncSeriesHook,
  AsyncSeriesWaterfallHook,
  Handler,
  Hook,
  HookContext,
  HookResult,
} from '../../../hooks';
import type { ProviderHooksMap } from '../../../provider-factory';

/** `true` when X and Y are the same type. Wrap both in a tuple, as a bare `any` matches loosely. */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

/*
 * 1. Untyped hooks keep the types they had before the hooks became generic.
 * The `Develop*` types copy those declarations.
 */

interface DevelopHook<T extends Handler = Handler> {
  getHandlers(): Handler[];
  register(handler: T): DevelopHook<T>;
  delete(handler: T): DevelopHook<T>;
  call(...args: any[]): void;
}
interface DevelopAsyncSeriesHook extends DevelopHook {
  call(...args: any[]): Promise<void>;
}
interface DevelopAsyncSeriesWaterfallHook extends DevelopHook {
  call(...args: any[]): Promise<any>;
}
interface DevelopAsyncParallelHook extends DevelopHook {
  call(...args: any[]): Promise<any[]>;
}
interface DevelopAsyncBailHook extends DevelopHook {
  call(...args: any[]): Promise<any>;
}
type DevelopFactoryHook<TCall> = {
  call: TCall;
  getHandlers(): Handler[];
  register(handler: Handler): DevelopHook<Handler>;
  delete(handler: Handler): DevelopHook<Handler>;
};

export type DefaultTypes = [
  Expect<Equal<[Hook], [DevelopHook]>>,
  Expect<Equal<[ReturnType<typeof internals.createHook>], [DevelopHook]>>,
  Expect<Equal<[AsyncSeriesHook], [DevelopAsyncSeriesHook]>>,
  Expect<Equal<[AsyncSeriesWaterfallHook], [DevelopAsyncSeriesWaterfallHook]>>,
  Expect<Equal<[AsyncParallelHook], [DevelopAsyncParallelHook]>>,
  Expect<Equal<[AsyncBailHook], [DevelopAsyncBailHook]>>,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncSeriesHook>],
      [DevelopFactoryHook<(context: unknown) => Promise<void>>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncSeriesWaterfallHook>],
      [DevelopFactoryHook<(param: unknown) => Promise<unknown>>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncParallelHook>],
      [DevelopFactoryHook<(context: unknown) => Promise<any[]>>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncBailHook>],
      [DevelopFactoryHook<(context: unknown) => Promise<any>>]
    >
  >,
  Expect<Equal<[ProviderHooksMap['willRegister']], [DevelopAsyncSeriesHook]>>,
  Expect<Equal<[ProviderHooksMap['didRegister']], [DevelopAsyncParallelHook]>>,
  // An untyped bail or waterfall result is still read as before
  Expect<IsAny<Awaited<ReturnType<ReturnType<typeof createAsyncBailHook>['call']>>>>,
  Expect<IsAny<Awaited<ReturnType<AsyncSeriesWaterfallHook['call']>>>>,
];

// An untyped hook still takes any handler and any context
const untypedBail = createAsyncBailHook();
untypedBail.register((value: string) => value.length);
export const untypedBailResult = untypedBail.call(42).then((result) => result.toFixed());

// A hook written by hand still implements the untyped interfaces
export const handWrittenSeries: AsyncSeriesHook = {
  getHandlers: () => [],
  register() {
    return this;
  },
  delete() {
    return this;
  },
  async call(context: { id: number }) {
    await Promise.all(this.getHandlers().map((handler) => handler(context)));
  },
};

/*
 * 2. A hook typed with its handler checks the handlers and the context it is called with.
 */

type Context = { id: number };
type ContextHandler = (context: Context) => boolean;
type ContextFormatter = (context: Context) => Context | Promise<Context>;

export type TypedHelpers = [
  Expect<Equal<[HookContext<Handler>], [unknown]>>,
  Expect<Equal<[HookContext<ContextHandler>], [Context]>>,
  Expect<Equal<[HookResult<ContextFormatter>], [Context]>>,
];

const hook = internals.createHook<ContextHandler>();
hook.register((context) => context.id > 0);
// @ts-expect-error a handler must take the hook's context
hook.register((context: string) => context.length > 0);
// @ts-expect-error a registered handler takes the hook's context, not a string
hook.getHandlers()[0]('not a context');
// @ts-expect-error the hook is called with its handler's context
hook.call('not a context');

const series = createAsyncSeriesHook<ContextHandler>();
const waterfall = createAsyncSeriesWaterfallHook<ContextFormatter>();
const parallel = createAsyncParallelHook<ContextHandler>();
const bail = createAsyncBailHook<ContextHandler>();

// @ts-expect-error a registered handler takes the hook's context, not a string
series.getHandlers()[0]('not a context');

export const callFactoryHooks = async () => {
  // @ts-expect-error the hook is called with its handler's context
  await series.call('not a context');
  // @ts-expect-error the hook is called with its handler's context
  await waterfall.call('not a context');
  // @ts-expect-error the hook is called with its handler's context
  await parallel.call('not a context');
  // @ts-expect-error the hook is called with its handler's context
  await bail.call('not a context');
};

export type TypedResults = [
  Expect<Equal<[Awaited<ReturnType<typeof series.call>>], [void]>>,
  Expect<Equal<[Awaited<ReturnType<typeof waterfall.call>>], [Context]>>,
  Expect<Equal<[Awaited<ReturnType<typeof parallel.call>>], [boolean[]]>>,
  Expect<Equal<[Awaited<ReturnType<typeof bail.call>>], [boolean | undefined]>>,
];

// The interfaces take the handler type too, and the factories implement them
const typedSeries: AsyncSeriesHook<ContextHandler> = series;
const typedWaterfall: AsyncSeriesWaterfallHook<ContextFormatter> = waterfall;
const typedParallel: AsyncParallelHook<ContextHandler> = parallel;
const typedBail: AsyncBailHook<ContextHandler> = bail;

export const callTypedHooks = async () => {
  // @ts-expect-error the hook is called with its handler's context
  await typedSeries.call('not a context');
  // @ts-expect-error the hook is called with its handler's context
  await typedWaterfall.call('not a context');
  // @ts-expect-error the hook is called with its handler's context
  await typedParallel.call('not a context');
  // @ts-expect-error the hook is called with its handler's context
  await typedBail.call('not a context');
};

export type TypedInterfaceResults = [
  Expect<Equal<[Awaited<ReturnType<typeof typedWaterfall.call>>], [Context]>>,
  Expect<Equal<[Awaited<ReturnType<typeof typedParallel.call>>], [boolean[]]>>,
  Expect<Equal<[Awaited<ReturnType<typeof typedBail.call>>], [boolean | undefined]>>,
];
