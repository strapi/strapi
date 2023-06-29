import { Middleware } from '../../types';

export const runMiddleware = async <T>(context: T, middlewares: Middleware<T>[]): Promise<void> => {
  if (!middlewares.length) {
    return;
  }
  const cb = middlewares[0];
  await cb(context, async (newContext: T) => {
    await runMiddleware(newContext, middlewares.slice(1));
  });
};
