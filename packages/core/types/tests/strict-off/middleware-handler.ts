import type Koa from 'koa';

import type { Core, Modules } from '../../src';
import type { Equal, Expect } from './helpers';

type IsAny<T> = 0 extends 1 & T ? true : false;

// Without strict types, a handler's result and what `next()` resolves to stay `any`, as on develop.
type MiddlewareHandlerChecks = [
  Expect<Equal<IsAny<ReturnType<Core.MiddlewareHandler>>, true>>,
  Expect<Equal<Parameters<Core.MiddlewareHandler>[1], Koa.Next>>,
  Expect<Equal<IsAny<Awaited<ReturnType<Parameters<Core.MiddlewareHandler>[1]>>>, true>>,
  Expect<Equal<IsAny<ReturnType<Modules.Auth.AuthenticationService['authenticate']>>, true>>,
  Expect<Equal<Parameters<Core.MiddlewareHandler>[0], Parameters<Koa.Middleware>[0]>>,
];
declare const middlewareHandlerChecks: MiddlewareHandlerChecks;
middlewareHandlerChecks satisfies unknown;
