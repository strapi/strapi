import { PathItemContextFactory } from '../../../context';

import type { Assembler } from '../..';

import { PathItemAssembler, PathItemAssemblerFactory } from './path-item';

export class PathAssemblerFactory {
  createAll(): Assembler.Path[] {
    return [this._createPathItemAssembler()];
  }

  private _createPathItemAssembler(
    assemblerFactory: PathItemAssemblerFactory = new PathItemAssemblerFactory(),
    contextFactory: PathItemContextFactory = new PathItemContextFactory()
  ) {
    const assemblers = assemblerFactory.createAll();

    return new PathItemAssembler(assemblers, contextFactory);
  }
}
