declare module 'koa-favicon' {
  import type Koa from 'koa';

  export default function favicon(
    path: string,
    options?: { maxAge?: number; mime?: string }
  ): Koa.Middleware;
}
