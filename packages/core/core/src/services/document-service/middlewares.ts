type Middleware = (ctx: any, next: () => Promise<void>) => Promise<void>;

export const createMiddlewareManager = () => {
  const middlewares: Middleware[] = [];

  const manager = {
    use(middleware: any) {
      middlewares.push(middleware);

      return () => middlewares.splice(middlewares.indexOf(middleware), 1);
    },

    async run(ctx: any, cb: () => void) {
      let index = 0;
      const next = async () => {
        if (index < middlewares.length) {
          // eslint-disable-next-line no-plusplus
          return middlewares[index++](ctx, next);
        }

        return cb();
      };

      return next();
    },

    wrapObject<TSource extends Record<string, any>>(source: TSource, ctxDefaults = {}): TSource {
      const facade: TSource = {} as TSource;

      for (const key in source) {
        if (Object.hasOwnProperty.call(source, key)) {
          const prop = source[key];

          if (typeof prop === 'function') {
            const newMethod = async (...args: any[]) => {
              const ctx = {
                ...ctxDefaults,
                action: key,
                args,
              };

              return manager.run(ctx, () => prop(...ctx.args));
            };

            facade[key] = newMethod as typeof prop;
          } else {
            facade[key] = prop;
          }
        }
      }

      return facade;
    },
  };

  return manager;
};
