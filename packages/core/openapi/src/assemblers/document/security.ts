import type { OpenAPIV3_1 } from 'openapi-types';

import type { Core } from '@strapi/types';
import type { DocumentContext } from '../../types';

import type { Assembler } from '..';

export class DocumentSecurityAssembler implements Assembler.Document {
  assemble(context: DocumentContext): void {
    const { strapi } = context;

    const securitySchemes = this._getSecuritySchemes(strapi);
    const security = this._getGlobalSecurity(strapi);

    if (context.output.data.components === undefined) {
      context.output.data.components = {};
    }
    context.output.data.components.securitySchemes = securitySchemes;
    context.output.data.security = security;
  }

  private _getSecuritySchemes(
    strapi: Core.Strapi
  ): Record<string, OpenAPIV3_1.SecuritySchemeObject> {
    const securityConfig = strapi.config.get<{
      [key: string]: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SecuritySchemeObject;
    }>('openapi.security');

    const schemes: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {};

    if (!securityConfig.bearerAuth) {
      schemes.bearerAuth = {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token for authentication',
      };
    }

    Object.entries(securityConfig).forEach(([name, config]) => {
      schemes[name] = config as OpenAPIV3_1.SecuritySchemeObject;
    });

    return schemes;
  }

  private _getGlobalSecurity(strapi: Core.Strapi): OpenAPIV3_1.Document['security'] {
    const globalSecurity = strapi.config.get('openapi.globalSecurity');

    if (globalSecurity) {
      return globalSecurity;
    }

    return [{ bearerAuth: [] }];
  }
}
