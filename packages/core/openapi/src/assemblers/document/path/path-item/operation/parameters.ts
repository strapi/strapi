import type { Core } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';

import { REGEX_STRAPI_PATH_PARAMS } from '../../../../../constants';

import type { OperationContext } from '../../../../../types';
import { createDebugger } from '../../../../../utils';
import type { Assembler } from '../../../../types';

const debug = createDebugger('assembler:parameters');

export class OperationParametersAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    debug('assembling parameters for %o %o...', route.method, route.path);

    const pathParameters = this._getPathParameters(context, route);
    debug('found %o path parameters', pathParameters.length);

    const queryParameters = this._getQueryParameters(context, route);
    debug('found %o query parameters', queryParameters.length);

    const parameters = [...pathParameters, ...queryParameters];
    debug('assembled %o parameters for %o %o', parameters.length, route.method, route.path);

    context.output.data.parameters = parameters;
  }

  private _getPathParameters(
    _context: OperationContext,
    route: Core.Route
  ): (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] {
    const matches = Array.from(route.path.matchAll(REGEX_STRAPI_PATH_PARAMS));

    return matches.map<OpenAPIV3.ParameterObject>((match) => ({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
  }

  private _getQueryParameters(
    _context: OperationContext,
    _route: Core.Route
  ): (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] {
    // Not implemented yet, need to wait for better route config
    // Contains stuff like the filters, sort, and populate
    return [];
  }
}
