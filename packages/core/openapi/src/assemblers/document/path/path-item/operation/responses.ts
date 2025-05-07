import type { Core } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';
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

    const responses = { ...output.data.responses } satisfies OpenAPIV3.ResponsesObject;

    // Register common error responses first to allow manual overrides
    for (const [errorCode, response] of Object.entries(this._errors)) {
      responses[errorCode] = response;
    }

    if (route.response) {
      responses[200] = {
        description: 'OK',
        content: { 'application/json': { schema: zodToOpenAPI(route.response) } },
      };
    }

    output.data.responses = responses;
  }
}
