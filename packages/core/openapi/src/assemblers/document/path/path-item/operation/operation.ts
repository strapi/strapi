import { OpenAPIV3_1, OpenAPIV3 } from 'openapi-types';

import type { Core } from '@strapi/types';

import { OperationContextFactory } from '../../../../../context';
import { createDebugger } from '../../../../../utils';

import type { PathItemContext } from '../../../../../types';

import type { Assembler } from '../../../..';

const debug = createDebugger('assembler:operation');

export class OperationAssembler implements Assembler.PathItem {
  private readonly _assemblers: Assembler.Operation[];

  private readonly _contextFactory: OperationContextFactory;

  constructor(
    assemblers: Assembler.Operation[],
    contextFactory: OperationContextFactory = new OperationContextFactory()
  ) {
    this._assemblers = assemblers;
    this._contextFactory = contextFactory;
  }

  assemble(context: PathItemContext, path: string, routes: Core.Route[]): void {
    const { output, ...defaultContextProps } = context;

    for (const route of routes) {
      const { method } = route;

      const methodIndex = method.toLowerCase();
      const operationContext = this._contextFactory.create(defaultContextProps);

      this._validateHTTPIndex(methodIndex);

      debug('assembling operation object for %o %o...', method, path);

      for (const assembler of this._assemblers) {
        debug('running assembler: %s...', assembler.constructor.name);

        assembler.assemble(operationContext, route);
      }

      const { data: operationObject } = operationContext.output;

      this._validateOperationObject(operationObject);

      debug('assembled operation object for %o %o', method, path);

      Object.assign(output.data, { [methodIndex]: operationObject });
    }
  }

  private _validateOperationObject(
    operation: Partial<OpenAPIV3_1.OperationObject>
  ): asserts operation is OpenAPIV3_1.OperationObject {
    if (!('responses' in operation)) {
      throw new Error('Invalid operation object: missing "responses" property');
    }
  }

  private _validateHTTPIndex(method: string): asserts method is OpenAPIV3_1.HttpMethods {
    // HttpMethods is exported as an enum in OpenAPIV3 and as a type only in OpenAPIV3_1
    const allowedMethods = Object.values<string>(OpenAPIV3.HttpMethods);
    const isAllowedMethod = allowedMethods.includes(method);

    if (!isAllowedMethod) {
      throw new Error(`Invalid HTTP method object: ${method}. Expected one of ${allowedMethods}`);
    }
  }
}
