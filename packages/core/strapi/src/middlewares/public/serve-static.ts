import path from 'path';
import koaStatic from 'koa-static';
import type { Middleware } from '../types';

// serveStatic is not supposed to be used to serve a folder that have sub-folders
export const serveStatic = (filesDir: string, koaStaticOptions: koaStatic.Options = {}) => {
  const serve = koaStatic(filesDir, koaStaticOptions);

  // eslint-disable-next-line @typescript-eslint/ban-types
  const middleware: Middleware = async (ctx, next) => {
    const prev = ctx.path;
    const newPath = path.basename(ctx.path);
    ctx.path = newPath;
    // @ts-ignore
    await serve(ctx, async () => {
      ctx.path = prev;
      await next();
      ctx.path = newPath;
    });
    ctx.path = prev;
  };

  return middleware;
};
