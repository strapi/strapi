import type { Core } from '@strapi/types';

import { REGEX_STRAPI_PATH_PARAMS } from '../../../../../constants';

import type { OperationContext } from '../../../../../types';
import { createDebugger } from '../../../../../utils';
import type { Assembler } from '../../../..';

const debug = createDebugger('assembler:operation-id');

export class OperationIDAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    const { path, method, info } = route;

    const origin = info.apiName ?? info.pluginName;

    const [operationId] = ['']
      // 'origin/' or ''
      .map(this._maybeAppendOrigin(origin))
      // 'origin/get' or 'get'
      .map(this._appendMethod(method))
      // 'origin/get/entity_by_id' or 'get/entity_by_id'
      .map(this._maybeAppendPath(path));

    debug('assembled an operation ID for %o %o: %o', method, path, operationId);

    context.output.data.operationId = operationId;
  }

  private _maybeAppendOrigin(origin?: string) {
    return () => (origin ? `${origin}/` : '');
  }

  private _appendMethod(method: string) {
    return (operationId: string) => `${operationId}${method.toLowerCase()}`;
  }

  private _maybeAppendPath(path: string) {
    const pathParts = path.split('/').filter(Boolean);

    return (operationId: string) => {
      if (!pathParts.length) {
        return operationId;
      }

      // Make sure to add a trailing slash after the method name
      let appendix = '/';

      const formatPart = (str: string) => (/[_/]$/.test(appendix) ? str : `_${str}`);

      pathParts.forEach((part) => {
        const match = REGEX_STRAPI_PATH_PARAMS.exec(part);

        appendix += match
          ? // Parameter
            formatPart(`by_${match[1]}`)
          : // Regular path segment
            formatPart(part.replaceAll(/\W/g, '_'));
      });

      return `${operationId}${appendix}`;
    };
  }
}
