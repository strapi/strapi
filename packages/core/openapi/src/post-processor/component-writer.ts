import { OpenAPIV3_1 } from 'openapi-types';
import * as z from 'zod/v4';
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
