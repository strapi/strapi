import { OperationContextFactory } from '../../../../context';
import { OperationAssembler, OperationAssemblerFactory } from './operation';

import type { Assembler } from '../../..';

export class PathItemAssemblerFactory {
  createAll(): Assembler.PathItem[] {
    return [this._createOperationAssembler()];
  }

  private _createOperationAssembler(
    assemblerFactory: OperationAssemblerFactory = new OperationAssemblerFactory(),
    contextFactory: OperationContextFactory = new OperationContextFactory()
  ) {
    const assemblers = assemblerFactory.createAll();

    return new OperationAssembler(assemblers, contextFactory);
  }
}
