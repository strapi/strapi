/**
 * Compile-only checks of the arguments `call` takes, run by `hooks.types.vitest.test.ts` twice:
 * with `strict: true`, and with the server preset of `@strapi/typescript-utils` (`strict: false`,
 * so without `strictNullChecks`). Only the number of arguments is checked here. Without
 * `strictNullChecks`, TypeScript drops `undefined` from types, so the checks that involve
 * `undefined` live in `hooks.ts`, which runs with `strict: true` only.
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
} from '../../../hooks';

type Context = { id: number };
type RequiredContext = (context: Context) => boolean;
type MaybeUndefinedContext = (context: Context | undefined) => boolean;
type OptionalContext = (context?: Context) => boolean;
type NoContext = () => void;
type Formatter = (value: Context) => Context;

const forwardSeries = <T extends Handler>(
  hook: AsyncSeriesHook<T>,
  ...args: Parameters<AsyncSeriesHook<T>['call']>
) => hook.call(...args);

declare const hook: Hook<RequiredContext>;
declare const typedSeries: AsyncSeriesHook<RequiredContext>;
declare const typedWaterfall: AsyncSeriesWaterfallHook<Formatter>;
declare const typedParallel: AsyncParallelHook<RequiredContext>;
declare const typedBail: AsyncBailHook<RequiredContext>;
const series = createAsyncSeriesHook<RequiredContext>();
const waterfall = createAsyncSeriesWaterfallHook<Formatter>();
const parallel = createAsyncParallelHook<RequiredContext>();
const bail = createAsyncBailHook<RequiredContext>();

// A handler that takes a context makes `call` require it
export const requiredContext = async () => {
  // @ts-expect-error the context is required
  hook.call();
  // @ts-expect-error the context is required
  await typedSeries.call();
  // @ts-expect-error the context is required
  await typedWaterfall.call();
  // @ts-expect-error the context is required
  await typedParallel.call();
  // @ts-expect-error the context is required
  await typedBail.call();
  // @ts-expect-error the context is required
  await series.call();
  // @ts-expect-error the context is required
  await waterfall.call();
  // @ts-expect-error the context is required
  await parallel.call();
  // @ts-expect-error the context is required
  await bail.call();
  // @ts-expect-error the context is required, also when a helper forwards the arguments
  await forwardSeries(series);
  // @ts-expect-error one context reaches the handlers, not two arguments
  await series.call({ id: 1 }, 2);
  await series.call({ id: 1 });
  await forwardSeries(series, { id: 1 });
};

// A context that can be `undefined` is still an argument to pass, as for a plain function
export const maybeUndefinedContext = async () => {
  const maybeUndefined = createAsyncSeriesHook<MaybeUndefinedContext>();
  // @ts-expect-error the context is required, even when it can be undefined
  await maybeUndefined.call();
  // Through a constant: lint reads `.call(undefined)` as `Function.prototype.call`
  const noContext: Context | undefined = undefined;
  await maybeUndefined.call(noContext);
};

// A handler with an optional parameter, or none, lets `call` go without a context
export const optionalContext = async () => {
  internals.createHook<OptionalContext>().call();
  await createAsyncSeriesHook<OptionalContext>().call();
  await createAsyncParallelHook<OptionalContext>().call({ id: 1 });
  await createAsyncSeriesHook<NoContext>().call();
  // @ts-expect-error a handler without parameter takes no context
  await createAsyncSeriesHook<NoContext>().call({ id: 1 });
};

// An untyped hook keeps its arguments: anything on the interfaces, one context on the factories
declare const untypedSeries: AsyncSeriesHook;
export const untypedArguments = async () => {
  await untypedSeries.call();
  await untypedSeries.call('anything', 'more');
  await createAsyncSeriesHook().call('anything');
  // @ts-expect-error a factory hook takes one context, as before
  await createAsyncSeriesHook().call();
};
