export type Middleware = (ctx: any, next: () => Promise<void>) => Promise<void> | void;

export type Options = {
  exclude?: string[];
};

export const createMiddlewareManager = () => {
  const middlewares: Middleware[] = [];

  const manager = {
    use(middleware: Middleware) {
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

    wrapObject<TSource>(source: TSource, ctxDefaults = {}, opts: Options = {}): TSource {
      const facade: TSource = {} as TSource;
      const { exclude = [] } = opts;

      for (const key in source) {
        if (Object.hasOwnProperty.call(source, key)) {
          const prop = source[key];

          if (exclude.includes(key)) {
            facade[key] = prop;
          } else if (typeof prop === 'function') {
            const newMethod = async (params: any = {}) => {
              const ctx = {
                ...ctxDefaults,
                action: key,
                params,
              };

              return manager.run(ctx, () => prop(ctx.params));
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
