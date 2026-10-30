// Types the part of the untyped `koa2-ratelimit` package that `middlewares/rateLimit.ts` uses.
// That file explains why the plugin does not use `@types/koa2-ratelimit`.
declare module 'koa2-ratelimit' {
  import type { Middleware } from 'koa';

  const koa2Ratelimit: {
    RateLimit: { middleware(options: object): Middleware };
  };

  export = koa2Ratelimit;
}
