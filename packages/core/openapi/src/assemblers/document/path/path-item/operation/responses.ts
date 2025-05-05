import type { Core } from '@strapi/types';
import type { z } from 'zod';
import type { Assembler } from '../../../..';
import type { OperationContext } from '../../../../../types';

import { zodToOpenAPI } from '../../../../../utils';

export class OperationResponsesAssembler implements Assembler.Operation {
  private get _errors() {
    return {
      400: { description: 'Bad request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' },
    };
  }

  assemble(context: OperationContext, route: Core.Route): void {
    const { output } = context;

    output.data.responses = {};

    // Register common error responses first to allow manual overrides
    for (const [errorCode, response] of Object.entries(this._errors)) {
      output.data.responses[errorCode] = response;
    }

    if (route.responses) {
      const entries: [string, z.Schema][] = Object.entries(route.responses);

      for (const [statusCode, schema] of entries) {
        output.data.responses[statusCode] = {
          description: schema.description ?? `${statusCode}`,
          content: {
            // TODO: handle other formats
            'application/json': {
              schema: zodToOpenAPI(schema),
            },
          },
        };
      }
    }
  }
}
