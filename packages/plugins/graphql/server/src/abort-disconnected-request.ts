import { GraphQLError } from 'graphql';
import type {
  GraphQLFieldResolver,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';

type ResponseState = { destroyed: boolean; writableEnded: boolean };

// Checked by tag rather than `instanceof` so a schema built by another copy of `graphql` works too.
const isObjectType = (type: GraphQLNamedType): type is GraphQLObjectType =>
  Object.prototype.toString.call(type) === '[object GraphQLObjectType]';

const isClientDisconnected = (contextValue: unknown): boolean => {
  const res = (contextValue as { koaContext?: { res?: ResponseState } } | undefined)?.koaContext
    ?.res;

  return Boolean(res?.destroyed && !res.writableEnded);
};

/**
 * Wraps every field that has its own resolver so it throws before running when the HTTP peer of
 * the request has disconnected. This stops the remaining nested query fields and serial mutation
 * fields from running for a response nobody will receive.
 *
 * The check lives in the resolver, not in an Apollo `willResolveField` hook. Apollo wraps the
 * resolvers of the schema it receives, so every plugin's `willResolveField` still runs and
 * its `didResolveField` still receives the error. A throwing hook would skip both for the
 * plugins around it.
 *
 * Fields without a resolver use the default resolver, which only reads a property of its parent,
 * so they are left as they are. The schema is changed in place.
 *
 * graphql 16 has no way to cancel an execution, so this wrapper does it by hand. graphql 17 adds an
 * `abortSignal` option to `execute` that stops new fields, later root mutations included, the same
 * way. Replace this wrapper with that option once the plugin moves to graphql 17.
 */
export const abortFieldsOnClientDisconnect = (schema: GraphQLSchema) => {
  Object.values(schema.getTypeMap()).forEach((type) => {
    if (type.name.startsWith('__') || !isObjectType(type)) {
      return;
    }

    Object.values(type.getFields()).forEach((field) => {
      const { resolve } = field;

      if (!resolve) {
        return;
      }

      const wrapped: GraphQLFieldResolver<unknown, unknown> = (
        source,
        args,
        contextValue,
        info
      ) => {
        if (isClientDisconnected(contextValue)) {
          // A GraphQLError passes through formatGraphqlError untouched. Any other error is treated as
          // a server error and logged once per skipped field, which floods the log on large lists.
          throw new GraphQLError('GraphQL request was aborted because the client disconnected', {
            extensions: { code: 'CLIENT_DISCONNECTED' },
          });
        }

        return resolve(source, args, contextValue, info);
      };

      field.resolve = wrapped;
    });
  });

  return schema;
};
