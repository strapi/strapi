import * as z from 'zod/v4';

import type { Core, Modules } from '@strapi/types';

import {
  BodyAssembler,
  OperationParametersAssembler,
} from '../src/assemblers/document/path/path-item/operation';
import { OperationContextFactory } from '../src/context';

/**
 * Params registered via strapi.contentAPI.addQueryParams / addInputParams are
 * merged into each route's request.query and request.body (by the content-api
 * service). The OpenAPI spec generator reads route.request when assembling
 * parameters and body. These tests (1) call addQueryParams/addInputParams,
 * (2) simulate merging those params into routes, (3) run the assemblers and
 * assert the generated spec includes the params.
 */

/** Resolved entry shape (param + schema + matchRoute) mirroring the real content-api service storage. */
type ResolvedQueryParamEntry = {
  param: string;
  schema: z.ZodType;
  matchRoute?: (r: Core.Route) => boolean;
};
/** Resolved entry shape (param + schema + matchRoute) mirroring the real content-api service storage. */
type ResolvedInputParamEntry = {
  param: string;
  schema: z.ZodType;
  matchRoute?: (r: Core.Route) => boolean;
};

/** Minimal content-api route for tests; pass overrides (e.g. method, path, request) as needed. */
const contentAPIRoute = (overrides: Partial<Core.Route> = {}): Core.Route =>
  ({
    method: 'GET',
    path: '/api/articles',
    handler: '',
    info: { type: 'content-api' },
    ...overrides,
  }) as Core.Route;

function createMockContentAPI() {
  const extraQueryParams: ResolvedQueryParamEntry[] = [];
  const extraInputParams: ResolvedInputParamEntry[] = [];
  return {
    addQueryParams(options: Modules.ContentAPI.AddQueryParamsOptions) {
      Object.entries(options).forEach(([param, rest]) => extraQueryParams.push({ param, ...rest }));
    },
    addInputParams(options: Modules.ContentAPI.AddInputParamsOptions) {
      Object.entries(options).forEach(([param, rest]) => extraInputParams.push({ param, ...rest }));
    },
    mergeQueryParamsIntoRoute(route: Core.Route): Core.Route {
      const query = { ...route.request?.query } as Record<string, z.ZodType>;
      for (const { param, schema, matchRoute } of extraQueryParams) {
        if (!matchRoute || matchRoute(route)) {
          query[param] = schema;
        }
      }
      return { ...route, request: { ...route.request, query } };
    },
    mergeInputParamsIntoRoute(route: Core.Route): Core.Route {
      const jsonKey = 'application/json';
      const extra: Record<string, z.ZodType> = {};
      for (const { param, schema, matchRoute } of extraInputParams) {
        if (!matchRoute || matchRoute(route)) {
          extra[param] = schema;
        }
      }
      const body = { [jsonKey]: z.object(extra) };
      return { ...route, request: { ...route.request, body } };
    },
  };
}

describe('OpenAPI operation assemblers – params added via addQueryParams / addInputParams', () => {
  const createOperationContext = () => {
    const factory = new OperationContextFactory();
    return factory.create({ strapi: {} as Core.Strapi, routes: [] }, {});
  };

  describe('OperationParametersAssembler', () => {
    it('includes in the spec query params registered with addQueryParams', () => {
      const contentAPI = createMockContentAPI();
      contentAPI.addQueryParams({
        search: { schema: z.string().max(200).optional() },
      });

      const route = contentAPI.mergeQueryParamsIntoRoute(
        contentAPIRoute({ handler: 'api::article.article.findMany' })
      );

      const assembler = new OperationParametersAssembler();
      const context = createOperationContext();
      assembler.assemble(context, route);

      const parameters = context.output.data.parameters ?? [];
      const searchParam = parameters.find(
        (p): p is typeof p & { name: string } => p.name === 'search' && p.in === 'query'
      );
      expect(searchParam).toBeDefined();
      expect(searchParam.required).toBe(false);
      expect(searchParam.schema).toBeDefined();
      expect(searchParam['x-strapi-serialize']).toBe('querystring');
    });

    it('respects matchRoute when merging addQueryParams into routes', () => {
      const contentAPI = createMockContentAPI();
      contentAPI.addQueryParams({
        search: {
          schema: z.string().optional(),
          matchRoute: (r) => r.path.includes('articles'),
        },
      });

      const articlesRoute = contentAPI.mergeQueryParamsIntoRoute(contentAPIRoute());
      const otherRoute = contentAPI.mergeQueryParamsIntoRoute(
        contentAPIRoute({ path: '/api/categories' })
      );

      const assembler = new OperationParametersAssembler();
      const ctxArticles = createOperationContext();
      const ctxOther = createOperationContext();
      assembler.assemble(ctxArticles, articlesRoute);
      assembler.assemble(ctxOther, otherRoute);

      const paramsArticles = ctxArticles.output.data.parameters ?? [];
      const paramsOther = ctxOther.output.data.parameters ?? [];
      expect(paramsArticles.some((p) => p.name === 'search')).toBe(true);
      expect(paramsOther.some((p) => p.name === 'search')).toBe(false);
    });

    it('produces no query parameters when route has no request.query', () => {
      const assembler = new OperationParametersAssembler();
      const context = createOperationContext();
      assembler.assemble(context, contentAPIRoute({ handler: 'api::article.article.findMany' }));
      expect(context.output.data.parameters).toEqual([]);
    });
  });

  describe('BodyAssembler', () => {
    it('includes in the spec input params registered with addInputParams', () => {
      const contentAPI = createMockContentAPI();
      contentAPI.addInputParams({
        clientMutationId: { schema: z.string().max(100).optional() },
      });

      const route = contentAPI.mergeInputParamsIntoRoute(
        contentAPIRoute({ method: 'POST', handler: 'api::article.article.create' })
      );

      const assembler = new BodyAssembler();
      const context = createOperationContext();
      assembler.assemble(context, route);

      const requestBody = context.output.data.requestBody;
      expect(requestBody?.content?.['application/json']?.schema).toBeDefined();
    });

    it('does not set requestBody when route has no request.body', () => {
      const assembler = new BodyAssembler();
      const context = createOperationContext();
      assembler.assemble(
        context,
        contentAPIRoute({ method: 'POST', handler: 'api::article.article.create' })
      );
      expect(context.output.data.requestBody).toBeUndefined();
    });
  });
});
