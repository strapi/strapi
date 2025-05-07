import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIV3 } from 'openapi-types';

import type { DocumentContext } from '../types';
import type { PostProcessor } from './types';

export class ComponentsWriter implements PostProcessor {
  postProcess(context: DocumentContext): void {
    const { output, registries } = context;

    const generator = new OpenApiGeneratorV31(registries.components.definitions);
    const { components } = generator.generateComponents();

    output.data.components = components as OpenAPIV3.ComponentsObject;
  }
}
