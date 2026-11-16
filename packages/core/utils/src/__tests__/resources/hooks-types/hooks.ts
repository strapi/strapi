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
 * 1. Untyped hooks keep the types they had before the hooks took a handler type.
 * The `PreGeneric*` types copy those declarations.
 */

interface PreGenericHook<T extends Handler = Handler> {
  getHandlers(): Handler[];
  register(handler: T): PreGenericHook<T>;
  delete(handler: T): PreGenericHook<T>;
  call(...args: any[]): void;
}
interface PreGenericAsyncSeriesHook extends PreGenericHook {
  call(...args: any[]): Promise<void>;
}
interface PreGenericAsyncSeriesWaterfallHook extends PreGenericHook {
  call(...args: any[]): Promise<any>;
}
interface PreGenericAsyncParallelHook extends PreGenericHook {
  call(...args: any[]): Promise<any[]>;
}
interface PreGenericAsyncBailHook extends PreGenericHook {
  call(...args: any[]): Promise<any>;
}
type PreGenericFactoryHook<TCall> = {
  call: TCall;
  getHandlers(): Handler[];
  register(handler: Handler): PreGenericHook<Handler>;
  delete(handler: Handler): PreGenericHook<Handler>;
};

export type DefaultTypes = [
  Expect<Equal<[Hook], [PreGenericHook]>>,
  Expect<Equal<[ReturnType<typeof internals.createHook>], [PreGenericHook]>>,
  Expect<Equal<[AsyncSeriesHook], [PreGenericAsyncSeriesHook]>>,
  Expect<Equal<[AsyncSeriesWaterfallHook], [PreGenericAsyncSeriesWaterfallHook]>>,
  Expect<Equal<[AsyncParallelHook], [PreGenericAsyncParallelHook]>>,
  Expect<Equal<[AsyncBailHook], [PreGenericAsyncBailHook]>>,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncSeriesHook>],
      [PreGenericFactoryHook<(context: unknown) => Promise<void>>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncSeriesWaterfallHook>],
      [PreGenericFactoryHook<(param: unknown) => Promise<unknown>>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncParallelHook>],
      [PreGenericFactoryHook<(context: unknown) => Promise<any[]>>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<typeof createAsyncBailHook>],
      [PreGenericFactoryHook<(context: unknown) => Promise<any>>]
    >
  >,
  Expect<Equal<[ProviderHooksMap['willRegister']], [PreGenericAsyncSeriesHook]>>,
  Expect<Equal<[ProviderHooksMap['didRegister']], [PreGenericAsyncParallelHook]>>,
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

// A hook passes one context to its handlers, so `call` takes one argument
type TwoParameters = (first: string, second: number) => void;
const twoParameters: AsyncSeriesHook<TwoParameters> = createAsyncSeriesHook<TwoParameters>();
const twoParametersHook = internals.createHook<TwoParameters>();

export const callWithOneContext = async () => {
  await twoParameters.call('first');
  // @ts-expect-error the second argument never reaches the handlers
  await twoParameters.call('first', 2);
  // @ts-expect-error the second argument never reaches the handlers
  twoParametersHook.call('first', 2);
};

// A waterfall handler resolves to the value it takes, and the interface and the factory agree
type Formatter = (value: string) => string | Promise<string>;
type MisshapedFormatter = (value: string) => number;
const formatter: AsyncSeriesWaterfallHook<Formatter> = createAsyncSeriesWaterfallHook<Formatter>();
// The factory keeps `T extends Handler`: `ReturnType<typeof createAsyncSeriesWaterfallHook>` reads
// the constraint, and an untyped waterfall hook must keep taking typed handlers
declare const untypedWaterfall: ReturnType<typeof createAsyncSeriesWaterfallHook>;
untypedWaterfall.register((value: string) => value.trim());
// @ts-expect-error the next handler receives what this one resolves to, so the types must match
export type MisshapedWaterfall = AsyncSeriesWaterfallHook<MisshapedFormatter>;

export type WaterfallResults = [
  Expect<Equal<[Awaited<ReturnType<typeof formatter.call>>], [string]>>,
  Expect<
    Equal<
      [Awaited<ReturnType<AsyncSeriesWaterfallHook<Formatter>['call']>>],
      [Awaited<ReturnType<ReturnType<typeof createAsyncSeriesWaterfallHook<Formatter>>['call']>>]
    >
  >,
];
