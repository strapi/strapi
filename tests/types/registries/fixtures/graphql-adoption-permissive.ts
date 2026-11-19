import type { Core } from '@strapi/strapi';
import type {} from '@strapi/plugin-graphql/strapi-server';

declare const app: Core.Strapi;

// Loading the GraphQL contracts does not opt applications into strictness: lookups keep develop's
// permissive service type.
const extension = app.plugin('graphql').service('extension');

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
declare const lookups: [
  Core.Assert<Equal<typeof extension, Core.Service>>,
  Core.Assert<Equal<ReturnType<Core.Strapi['service']>, Core.Service>>,
];
lookups satisfies unknown;
extension.use({ resolversConfig: { 'Query.custom': { auth: true } }, resolvers: [] });
extension.use(({ typeRegistry }: any) => ({ types: [typeRegistry.get('Article').definition] }));
app.plugin('graphql').service('type-registry').new().get('Article').anything();
extension.generate({ typeRegistry: {} });
