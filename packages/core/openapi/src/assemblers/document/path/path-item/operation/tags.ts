import type { Core } from '@strapi/types';

import type { OperationContext } from '../../../../../types';
import { createDebugger } from '../../../../../utils';
import type { Assembler } from '../../../..';

const debug = createDebugger('assembler:tags');

export class OperationTagsAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    const {
      method,
      path,
      info: { apiName, pluginName },
    } = route;

    debug('assembling tags for %o %o...', method, path);

    const tags = [];

    if (apiName) {
      tags.push(apiName);
    }

    if (pluginName) {
      tags.push(pluginName);
    }

    debug('assembled %o tags for %o %o: %o', tags.length, method, path, tags);

    context.output.data.tags = tags;
  }
}
