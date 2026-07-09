import type { Core } from '@strapi/types';

import { DocumentSecurityAssembler } from '../src/assemblers/document/security';
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
});
