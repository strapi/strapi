import type { Core } from '@strapi/strapi';
import type {} from '@strapi/plugin-graphql/strapi-server';

declare const app: Core.Strapi;

const extension = app.plugin('graphql').service('extension');
const registry = app.plugin('graphql').service('type-registry').new();

// Extension factories receive the type registry of the schema being built.
extension.use(({ nexus, typeRegistry }) => {
  const registered = typeRegistry.get('Article');
  // @ts-expect-error A type that is not registered is `undefined`.
  registered.name satisfies string;
  if (registered !== undefined) {
    registered.config satisfies Record<string, unknown>;
    // @ts-expect-error Registration configs do not expose arbitrary fields as any.
    registered.config.kind.toUpperCase();
  }
  typeRegistry
    .where(({ config: { kind } }) => kind === 'types')
    .map(({ name }) => name) satisfies string[];

  return {
    types: [nexus.objectType({ name: 'Custom', definition() {} })],
    resolvers: { Query: { custom: () => 'value' } },
    resolversConfig: {
      'Query.custom': { auth: false },
      'Query.articles': {
        auth: { scope: ['api::article.article.find'] },
        policies: [],
        middlewares: [
          (resolve, parent, args, context, info) => resolve(parent, args, context, info),
        ],
      },
      Query: { articles: { auth: false } },
    },
  };
});

extension.use({
  resolversConfig: {
    // @ts-expect-error `auth` is `false` or a route auth config.
    'Query.custom': { auth: true },
  },
});
extension.use({
  resolversConfig: {
    // @ts-expect-error Scopes are lists of action names.
    'Query.custom': { auth: { scope: 'api::article.article.find' } },
  },
});
// @ts-expect-error Resolvers are a resolver map, not a list.
extension.use({ resolvers: [] });

registry.register('Custom', {}, { kind: 'types' }).has('Custom') satisfies boolean;
registry.registerMany([['A', {}]], (name) => ({ kind: name }));
registry.toObject() satisfies Record<string, { name: string; definition: unknown }>;

const generated = extension.generate({ typeRegistry: registry });
generated.typeDefs satisfies string[];
generated.resolversConfig satisfies Record<string, unknown>;
// @ts-expect-error Generation needs the registry of the schema being built.
extension.generate({ typeRegistry: {} });
