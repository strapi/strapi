import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { Assembler } from '../../../..';

import type { OperationContext } from '../../../../../types';
import { createDebugger, zodToOpenAPI } from '../../../../../utils';

const debug = createDebugger('assembler:parameters');

type PathParameterObject = OpenAPIV3_1.ParameterObject & { in: 'path' };
type QueryParameterObject = OpenAPIV3_1.ParameterObject & { in: 'query' };

export class OperationParametersAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    debug('assembling parameters for %o %o...', route.method, route.path);

    const pathParameters = this._getPathParameters(route);
    debug('found %o path parameters', pathParameters.length);

    const queryParameters = this._getQueryParameters(route);
    debug('found %o query parameters', queryParameters.length);

    const parameters = [...pathParameters, ...queryParameters];
    debug('assembled %o parameters for %o %o', parameters.length, route.method, route.path);

    context.output.data.parameters = parameters;
  }

  private _getPathParameters(route: Core.Route): PathParameterObject[] {
    const { params } = route.request ?? {};

    // TODO: Allow auto inference (from path) if enabled through configuration
    if (!params) {
      return [];
    }

    const pathParams: PathParameterObject[] = [];

    for (const [name, zodSchema] of Object.entries(params)) {
      const required = !zodSchema.isOptional();
      const schema = zodToOpenAPI(zodSchema) as any;

      pathParams.push({ name, in: 'path', required, schema });
    }

    return pathParams;
  }

  private _getQueryParameters(route: Core.Route): QueryParameterObject[] {
    const { query } = route.request ?? {};

    if (!query) {
      return [];
    }

    const queryParams: QueryParameterObject[] = [];

    for (const [name, zodSchema] of Object.entries(query)) {
      const required = !zodSchema.isOptional();
      const schema = zodToOpenAPI(zodSchema) as any;
      const param: QueryParameterObject = { name, in: 'query', required, schema };

      // In Strapi, query params are always interpreted as query strings, which isn't supported by the specification
      // TODO: Make that configurable somehow
      Object.assign(param, { 'x-strapi-serialize': 'querystring' });

      queryParams.push(param);
    }

    return queryParams;
  }
}
