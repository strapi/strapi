import { Documents } from '@strapi/types';

const createMiddlewareManager = (): Documents.Middleware.Manager => {
  return {
    middlewares: {
      allUIDs: {
        allActions: [],
      },
    },

    get(uid, action) {
      return [
        ...this.middlewares.allUIDs.allActions,
        ...(this.middlewares[uid]?.allActions || []),
        ...(this.middlewares.allUIDs[action] || []),
        ...(this.middlewares[uid]?.[action] || []),
      ];
    },

    add(uid, action, middleware) {
      if (!this.middlewares[uid]) {
        this.middlewares[uid] = {};
      }

      if (!this.middlewares[uid][action]) {
        this.middlewares[uid][action] = [];
      }

      this.middlewares[uid][action].push(middleware);

      return this;
    },

    async run(ctx, cb) {
      const runMiddlewares = this.get(ctx.uid, ctx.action).reduceRight(
        (next: any, middleware: any) => (ctx: any) => middleware(ctx, next),
        cb
      );

      return runMiddlewares(ctx);
    },
  };
};

export default createMiddlewareManager;
