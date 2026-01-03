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

      // Handle complex schemas (containing allOf, anyOf, etc.) and simple objects
      const resolvedSchema = this._resolveSchema(schema);
      if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
        // Expand nested object parameters into individual query parameters
        for (const [propName, propSchema] of Object.entries(resolvedSchema.properties)) {
          // Use the resolved required fields from the schema processing
          const isRequired = resolvedSchema.required?.includes(propName) || false;

          const param: QueryParameterObject = {
            name: `${name}[${propName}]`, // Nested format: pagination[page]
            in: 'query',
            required: isRequired,
            schema: propSchema,
          };

          Object.assign(param, { 'x-strapi-serialize': 'querystring' });
          queryParams.push(param);
        }
      } else {
        // Keep simple parameters unchanged
        const param: QueryParameterObject = { name, in: 'query', required, schema };
        Object.assign(param, { 'x-strapi-serialize': 'querystring' });
        queryParams.push(param);
      }
    }

    return queryParams;
  }

  /**
   * Resolve complex OpenAPI Schema to extract actual type definitions
   * Handles composite types like allOf, anyOf, oneOf
   */
  private _resolveSchema(schema: any): any {
    // If it's a simple object, return directly
    if (schema.type === 'object' && schema.properties) {
      return schema;
    }

    // Handle allOf - merge all object properties, but preserve original anyOf/oneOf optional nature
    if (schema.allOf && Array.isArray(schema.allOf)) {
      const mergedSchema = {
        type: 'object',
        properties: {},
        required: [],
      };

      for (const subSchema of schema.allOf) {
        // Check if this subSchema contains anyOf/oneOf - if so, make its properties optional
        const hasAnyOfOneOf = subSchema.anyOf || subSchema.oneOf;
        const resolved = this._resolveSchema(subSchema);

        if (resolved.type === 'object' && resolved.properties) {
          Object.assign(mergedSchema.properties, resolved.properties);
          // Only include required fields if they don't come from anyOf/oneOf schemas
          if (resolved.required && !hasAnyOfOneOf) {
            mergedSchema.required.push(...resolved.required);
          }
        }
      }

      return mergedSchema.properties ? mergedSchema : schema;
    }

    // Handle anyOf/oneOf - extract common property structure, but make all optional
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      return this._extractCommonProperties(schema.anyOf, false);
    }

    if (schema.oneOf && Array.isArray(schema.oneOf)) {
      return this._extractCommonProperties(schema.oneOf, false);
    }

    // Other cases remain unchanged
    return schema;
  }

  /**
   * Extract common property structure from multiple possible schemas
   */
  private _extractCommonProperties(schemas: any[], preserveRequired: boolean = true): any {
    const objectSchemas = schemas
      .map((s) => this._resolveSchema(s))
      .filter((s) => s.type === 'object' && s.properties);

    if (objectSchemas.length === 0) {
      return schemas[0];
    }

    // Merge all properties
    const allProperties = {};
    let allRequired = [];

    for (const objSchema of objectSchemas) {
      Object.assign(allProperties, objSchema.properties);
      if (preserveRequired && objSchema.required) {
        allRequired.push(...objSchema.required);
      }
    }

    // For anyOf/oneOf schemas, make all properties optional to avoid conflicts
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
