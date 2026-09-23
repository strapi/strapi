import type { OpenAPIV3_1 } from 'openapi-types';

import type { Core } from '@strapi/types';
import type { DocumentContext } from '../../types';

import type { Assembler } from '..';

export interface ServerConfig {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIV3_1.ServerVariableObject>;
}

const DEFAULT_SERVER_URL = 'http://localhost:1337';

export class DocumentServerAssembler implements Assembler.Document {
  assemble(context: DocumentContext): void {
    const { strapi } = context;

    context.output.data.servers = this._getServers(strapi);
  }

  private _getServers(strapi: Core.Strapi): OpenAPIV3_1.ServerObject[] {
    const serverConfig = strapi.config.get<ServerConfig[]>('openapi.servers') ?? [];

    if (serverConfig.length > 0) {
      return serverConfig;
    }

    const serverUrl = strapi.config.get<string>('server.url') ?? DEFAULT_SERVER_URL;

    return [
      {
        url: serverUrl,
        description: 'Default server',
      },
    ];
  }
}
