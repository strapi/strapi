import { STATUS_CODES } from 'node:http';

import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';
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

    const responses = { ...output.data.responses } satisfies OpenAPIV3_1.ResponsesObject;

    // Register common error responses first to allow manual overrides
    for (const [errorCode, response] of Object.entries(this._errors)) {
      responses[errorCode] = response;
    }

    const { response, responseStatus } = route;

    // JS routes can set `response: null`, treat it like a missing schema
    if (response !== undefined && response !== null) {
      // Routes without a declared status keep the historical default: 200
      const status = responseStatus ?? 200;
      const schema = zodToOpenAPI(response, context.strapi.contentAPISchemaRegistry, {
        extractedComponentSchemas: context.registries.extractedComponentSchemas,
      });

      responses[status] = {
        description: describeStatus(status),
        content: { 'application/json': { schema } },
      };
    } else if (responseStatus !== undefined) {
      // A declared status without a schema has no content (e.g. 204 No Content)
      responses[responseStatus] = { description: describeStatus(responseStatus) };
    }

    output.data.responses = responses;
  }
}

const describeStatus = (status: number): string => STATUS_CODES[status] ?? 'Success';
