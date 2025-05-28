import { OpenAPIV3_1 } from 'openapi-types';
import { z } from 'zod';
import type { DocumentContext } from '../types';
import { toComponentsPath } from '../utils/zod';
import type { PostProcessor } from './types';

export class ComponentsWriter implements PostProcessor {
  postProcess(context: DocumentContext): void {
    const { output } = context;

    const { schemas } = z.toJSONSchema(z.globalRegistry, {
      uri: toComponentsPath,
    }) as OpenAPIV3_1.ComponentsObject;

    output.data.components = { schemas };
  }
}
