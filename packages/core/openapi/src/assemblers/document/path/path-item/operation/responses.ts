import type { Core } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';
import type { Assembler } from '../../../..';
import type { OperationContext } from '../../../../../types';

import { z } from 'zod';
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

  private _assignCustomResponses(
    responses: OpenAPIV3.ResponsesObject,
    customResponses: Core.RouteResponses
  ) {
    const entries: [string, Core.HTTPMediaRecord][] = Object.entries(customResponses);

    for (const [statusCode, responsesByMedia] of entries) {
      const content: Record<string, OpenAPIV3.MediaTypeObject> = {};

      for (const [media, zodSchema] of Object.entries(responsesByMedia)) {
        content[media] = { schema: zodToOpenAPI(zodSchema) };
      }

      responses[statusCode] = { description: statusCode, content };
    }
  }

  assemble(context: OperationContext, route: Core.Route): void {
    const { output } = context;

    const responses = { ...output.data.responses } satisfies OpenAPIV3.ResponsesObject;

    // Register common error responses first to allow manual overrides
    for (const [errorCode, response] of Object.entries(this._errors)) {
      responses[errorCode] = response;
    }

    if (route.responses) {
      this._assignCustomResponses(responses, route.responses);
    }

    output.data.responses = responses;
  }
}
