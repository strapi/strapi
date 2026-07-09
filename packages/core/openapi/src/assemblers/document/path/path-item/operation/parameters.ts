import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';
import type { Assembler } from '../../../..';

import type { OperationContext } from '../../../../../types';
import { createDebugger, zodToOpenAPI } from '../../../../../utils';
import {
  hasExpandableObjectProperties,
  shouldUseDeepObjectStyle,
} from '../../../query-param-styles';

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

      const resolvedSchema = this._resolveSchema(schema);

      if (hasExpandableObjectProperties(resolvedSchema)) {
        for (const [propName, propSchema] of Object.entries(resolvedSchema.properties!)) {
          const isRequired = resolvedSchema.required?.includes(propName) ?? false;

          const param: QueryParameterObject = {
            name: `${name}[${propName}]`,
            in: 'query',
            required: isRequired,
            schema: propSchema as any,
          };

          Object.assign(param, { 'x-strapi-serialize': 'querystring' });
          queryParams.push(param);
        }
      } else if (shouldUseDeepObjectStyle(name, resolvedSchema)) {
        const param: QueryParameterObject = {
          name,
          in: 'query',
          required,
          schema: resolvedSchema,
          style: 'deepObject',
          explode: true,
        };

        Object.assign(param, { 'x-strapi-serialize': 'querystring' });
        queryParams.push(param);
      } else {
        const param: QueryParameterObject = { name, in: 'query', required, schema };
        Object.assign(param, { 'x-strapi-serialize': 'querystring' });
        queryParams.push(param);
      }
    }

    return queryParams;
  }

  /**
   * Resolve composite OpenAPI schemas (allOf/anyOf/oneOf) into a flat object shape
   * so nested Strapi query params can be emitted as bracket notation (e.g. pagination[page]).
   */
  private _resolveSchema(schema: OpenAPIV3_1.SchemaObject): OpenAPIV3_1.SchemaObject {
    if (schema.type === 'object' && schema.properties) {
      return schema;
    }

    if (schema.allOf && Array.isArray(schema.allOf)) {
      const mergedSchema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {},
        required: [],
      };

      for (const subSchema of schema.allOf) {
        if (!('$ref' in subSchema)) {
          const hasAnyOfOneOf = Boolean(subSchema.anyOf || subSchema.oneOf);
          const resolved = this._resolveSchema(subSchema);

          if (resolved.type === 'object' && resolved.properties) {
            Object.assign(mergedSchema.properties!, resolved.properties);
            if (resolved.required && !hasAnyOfOneOf) {
              mergedSchema.required = [
                ...(mergedSchema.required ?? []),
                ...(resolved.required as string[]),
              ];
            }
          }
        }
      }

      return mergedSchema.properties ? mergedSchema : schema;
    }

    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      return this._extractCommonProperties(schema.anyOf, false);
    }

    if (schema.oneOf && Array.isArray(schema.oneOf)) {
      return this._extractCommonProperties(schema.oneOf, false);
    }

    return schema;
  }

  private _extractCommonProperties(
    schemas: OpenAPIV3_1.SchemaObject[],
    preserveRequired = true
  ): OpenAPIV3_1.SchemaObject {
    const objectSchemas = schemas
      .filter((s): s is OpenAPIV3_1.SchemaObject => !('$ref' in s))
      .map((s) => this._resolveSchema(s))
      .filter((s) => s.type === 'object' && s.properties);

    if (objectSchemas.length === 0) {
      return schemas[0] as OpenAPIV3_1.SchemaObject;
    }

    const allProperties: Record<string, OpenAPIV3_1.SchemaObject> = {};
    let allRequired: string[] = [];

    for (const objSchema of objectSchemas) {
      Object.assign(allProperties, objSchema.properties);
      if (preserveRequired && objSchema.required) {
        allRequired.push(...(objSchema.required as string[]));
      }
    }

    if (!preserveRequired) {
      allRequired = [];
    }

    return {
      type: 'object',
      properties: allProperties,
      required: allRequired,
    };
  }
}
