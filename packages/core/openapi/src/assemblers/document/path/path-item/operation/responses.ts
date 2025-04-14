import type { Core } from '@strapi/types';

import type { OperationContext } from '../../../../../types';
import type { Assembler } from '../../../../types';

export class OperationResponsesAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    context.output.data.responses = {
      200: { description: 'OK' },
      201: { description: 'Created' },
      204: { description: 'No content' },
      400: { description: 'Bad request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' },
    };
  }
}
