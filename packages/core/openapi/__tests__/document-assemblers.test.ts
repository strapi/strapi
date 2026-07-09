import type { Core } from '@strapi/types';

import { DocumentSecurityAssembler } from '../src/assemblers/document/security';
import { DocumentServerAssembler } from '../src/assemblers/document/server';
import { DocumentContextFactory } from '../src/context';
import { ComponentsWriter } from '../src/post-processor/component-writer';

const createStrapiMock = (config: Record<string, unknown> = {}): Pick<Core.Strapi, 'config'> => ({
  config: {
    get(path: string) {
      return config[path];
    },
  } as Core.Strapi['config'],
});

describe('OpenAPI document assemblers', () => {
  const createDocumentContext = () => {
    const factory = new DocumentContextFactory();
    return factory.create({ strapi: createStrapiMock() as Core.Strapi, routes: [] });
  };

  describe('DocumentSecurityAssembler', () => {
    it('includes default bearerAuth in components.securitySchemes', () => {
      const assembler = new DocumentSecurityAssembler();
      const context = createDocumentContext();

      assembler.assemble(context);

      expect(context.output.data.components?.securitySchemes?.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token for authentication',
      });
      expect(context.output.data.security).toEqual([{ bearerAuth: [] }]);
    });

    it('preserves bearerAuth after ComponentsWriter post-processing', () => {
      const assembler = new DocumentSecurityAssembler();
      const postProcessor = new ComponentsWriter();
      const context = createDocumentContext();

      assembler.assemble(context);
      postProcessor.postProcess(context);

      expect(context.output.data.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(context.output.data.components?.schemas).toBeDefined();
    });
  });

  describe('DocumentServerAssembler', () => {
    it('includes a default server from server.url', () => {
      const assembler = new DocumentServerAssembler();
      const factory = new DocumentContextFactory();
      const context = factory.create({
        strapi: createStrapiMock({ 'server.url': 'https://api.example.com' }) as Core.Strapi,
        routes: [],
      });

      assembler.assemble(context);

      expect(context.output.data.servers).toEqual([
        { url: 'https://api.example.com', description: 'Default server' },
      ]);
    });

    it('prefers openapi.servers over server.url', () => {
      const assembler = new DocumentServerAssembler();
      const factory = new DocumentContextFactory();
      const context = factory.create({
        strapi: createStrapiMock({
          'openapi.servers': [{ url: 'https://staging.example.com', description: 'Staging' }],
          'server.url': 'https://api.example.com',
        }) as Core.Strapi,
        routes: [],
      });

      assembler.assemble(context);

      expect(context.output.data.servers).toEqual([
        { url: 'https://staging.example.com', description: 'Staging' },
      ]);
    });

    it('falls back to localhost when no server config is set', () => {
      const assembler = new DocumentServerAssembler();
      const context = createDocumentContext();

      assembler.assemble(context);

      expect(context.output.data.servers).toEqual([
        { url: 'http://localhost:1337', description: 'Default server' },
      ]);
    });
  });
});
