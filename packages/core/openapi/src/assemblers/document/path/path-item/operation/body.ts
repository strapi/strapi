import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';

import type { OperationContext } from '../../../../../types';
import type { Assembler } from '../../../..';

import { zodToOpenAPI } from '../../../../../utils';

export class BodyAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    const { output } = context;
    const { body } = route.request ?? {};

    // If no `body` property is defined, we don't need to do anything
    if (!body) {
      return;
    }

    const content: Record<string, OpenAPIV3_1.MediaTypeObject> = {};

    for (const [media, zodSchema] of Object.entries(body)) {
      content[media] = {
        schema: zodToOpenAPI(zodSchema) as any,
      };
    }

    output.data.requestBody = { content };
  }
}
