import type { OpenAPIV3_1 } from 'openapi-types';

export class RegistriesFactory {
  createAll(): {
    extractedComponentSchemas: Record<string, OpenAPIV3_1.SchemaObject>;
  } {
    return {
      extractedComponentSchemas: {},
    };
  }
}
