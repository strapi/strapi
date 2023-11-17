import { Documents } from '@strapi/types';

export const priority = {
  LOWEST: 1,
  LOW: 10,
  DEFAULT: 100,
  HIGH: 1_000,
  HIGHEST: 10_000,
} as const;

const createMiddlewareManager = (): Documents.Middleware.Manager => {
  return {
    priority,

    middlewares: {
      // All uid's
      _all: {
        // All actions on all uid's
        _all: [],
      },
    },

    get(uid, action) {
      return (
        [
          // All actions on all uid's
          ...this.middlewares._all._all,
          // All actions on a specific uid
          ...(this.middlewares[uid]?._all || []),
          // A specific action on all uid's
          ...(this.middlewares._all[action] || []),
          // A specific action on a specific uid
          ...(this.middlewares[uid]?.[action] || []),
        ]
          // Sort by priority - the higher the priority, the earlier the middleware will be executed
          .sort((a, b) => b.priority - a.priority)
          .map(({ middleware }) => middleware)
      );
    },

    add(uid, action, middleware, opts) {
      if (!this.middlewares[uid]) {
        this.middlewares[uid] = {};
      }

      if (!this.middlewares[uid][action]) {
        this.middlewares[uid][action] = [];
      }

      const middlewareList = Array.isArray(middleware) ? middleware : [middleware];
      middlewareList.forEach((middleware) => {
        this.middlewares[uid][action].push({
          middleware,
          priority: opts?.priority ?? priority.DEFAULT,
        });
      });

      return this;
    },

    async run(ctx, cb) {
      const runMiddlewares = this.get(ctx.uid, ctx.action).reduceRight(
        (next: any, middleware: any) => (ctx: any) => middleware(ctx, next),
        cb
      );

      return runMiddlewares(ctx);
    },
  } satisfies Documents.Middleware.Manager;
};

export default createMiddlewareManager;
