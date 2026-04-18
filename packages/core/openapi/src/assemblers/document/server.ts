import type { OpenAPIV3_1 } from 'openapi-types';

import type { DocumentContext } from '../../types';

import type { Assembler } from '..';

export interface ServerConfig {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIV3_1.ServerVariableObject>;
}

export class DocumentServerAssembler implements Assembler.Document {
  assemble(context: DocumentContext): void {
    const { strapi } = context;

    const serverConfig = strapi.config.get<ServerConfig[]>('openapi.servers') || [];
    const serverUrl = strapi.config.get<string>('server.url');

    const servers: OpenAPIV3_1.ServerObject[] = [];

    if (serverConfig.length > 0) {
      servers.push(...serverConfig);
    } else if (serverUrl) {
      servers.push({
        url: serverUrl,
        description: 'Default server',
      });
    }

    if (servers.length === 0) {
      servers.push({
        url: 'http://localhost:1337/api',
        description: 'Local development server',
      });
    }
    context.output.data.servers = servers;
  }
}
