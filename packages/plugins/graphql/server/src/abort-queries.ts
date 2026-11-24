import { parse } from 'graphql';
import type { Core } from '@strapi/types';

type RequestBody = { query?: unknown; operationName?: unknown };

/**
 * Whether the operation a GraphQL request body runs is a query. False when it can't be told: no
 * query text (persisted queries), a document that does not parse, an `operationName` that matches
 * nothing, or several operations and no `operationName`. For a batch, every entry must be a query.
 */
export const isQueryOnlyBody = (body: unknown): boolean => {
  if (Array.isArray(body)) {
    return body.length > 0 && body.every(isQueryOnlyBody);
  }

  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const { query, operationName } = body as RequestBody;

  if (typeof query !== 'string') {
    return false;
  }

  try {
    const operations = parse(query, { noLocation: true }).definitions.filter(
      (definition) => definition.kind === 'OperationDefinition'
    );

    let operation = operations.length === 1 ? operations[0] : undefined;

    if (typeof operationName === 'string') {
      operation = operations.find((definition) => definition.name?.value === operationName);
    }

    return operation?.operation === 'query';
  } catch {
    return false;
  }
};

/**
 * Runs a GraphQL query sent with `POST` under the request's database abort signal (see
 * `database.settings.abortReadsOnRequestDisconnect`), as the server does for `GET` and `HEAD`.
 * A mutation can write, so it never gets one. Place it after the body parser.
 */
export const createArmQueriesMiddleware =
  (strapi: Core.Strapi): Core.MiddlewareHandler =>
  (ctx, next) => {
    // The server arms these itself
    if (ctx.method === 'GET' || ctx.method === 'HEAD') {
      return next();
    }

    // Skip parsing the body when the setting is off
    if (strapi.db?.config?.settings?.abortReadsOnRequestDisconnect !== true) {
      return next();
    }

    if (
      typeof strapi.server?.runWithClientAbortSignal !== 'function' ||
      !isQueryOnlyBody(ctx.request.body)
    ) {
      return next();
    }

    return strapi.server.runWithClientAbortSignal(ctx, () => next());
  };
