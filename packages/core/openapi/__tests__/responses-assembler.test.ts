import * as z from 'zod/v4';

import type { Core } from '@strapi/types';

import { OperationResponsesAssembler } from '../src/assemblers/document/path/path-item/operation';
import { OperationContextFactory } from '../src/context';
import { createTestContentAPISchemaRegistry } from './helpers/content-api-schema-registry';

const contentAPIRoute = (overrides: Partial<Core.Route> = {}): Core.Route => ({
  method: 'GET',
  path: '/api/articles',
  handler: 'api::article.article.find',
  info: { type: 'content-api' },
  ...overrides,
});

const createOperationContext = () => {
  const factory = new OperationContextFactory();
  return factory.create(
    {
      strapi: {
        contentAPISchemaRegistry: createTestContentAPISchemaRegistry(),
      } as Core.Strapi,
      routes: [],
    },
    {}
  );
};

const assembleResponses = (route: Core.Route) => {
  const context = createOperationContext();
  new OperationResponsesAssembler().assemble(context, route);
  return context.output.data.responses ?? {};
};

const ERROR_STATUSES = ['400', '401', '403', '404', '500'];

describe('OperationResponsesAssembler', () => {
  it('adds the common error responses', () => {
    const responses = assembleResponses(contentAPIRoute());

    expect(Object.keys(responses).sort()).toEqual(ERROR_STATUSES);
  });

  it('documents the response schema under 200 when the route declares no status', () => {
    const responses = assembleResponses(
      contentAPIRoute({ response: z.object({ data: z.string() }) })
    );

    expect(responses['200']).toEqual({
      description: 'OK',
      content: { 'application/json': { schema: expect.any(Object) } },
    });
  });

  it('adds no success response when the route declares neither response nor status', () => {
    const responses = assembleResponses(contentAPIRoute());

    expect(responses['200']).toBeUndefined();
  });

  it('adds no success response when a JS route sets response to null', () => {
    const responses = assembleResponses(
      contentAPIRoute({ response: null as unknown as Core.Route['response'] })
    );

    expect(Object.keys(responses).sort()).toEqual(ERROR_STATUSES);
  });

  it('documents the response schema under the declared status', () => {
    const responses = assembleResponses(
      contentAPIRoute({
        method: 'POST',
        response: z.object({ data: z.string() }),
        responseStatus: 201,
      })
    );

    expect(responses['200']).toBeUndefined();
    expect(responses['201']).toEqual({
      description: 'Created',
      content: { 'application/json': { schema: expect.any(Object) } },
    });
  });

  it('documents a declared status without content when the route has no response schema', () => {
    const responses = assembleResponses(contentAPIRoute({ method: 'DELETE', responseStatus: 204 }));

    expect(responses['200']).toBeUndefined();
    expect(responses['204']).toEqual({ description: 'No Content' });
  });

  it('uses a generic description for a status without a standard reason phrase', () => {
    const responses = assembleResponses(contentAPIRoute({ responseStatus: 299 }));

    expect(responses['299']).toEqual({ description: 'Success' });
  });
});
