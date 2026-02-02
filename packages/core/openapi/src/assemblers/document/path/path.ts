import { PathContextFactory } from '../../../context';

import type { DocumentContext } from '../../../types';

import { createDebugger } from '../../../utils';

import type { Assembler } from '../..';

const debug = createDebugger('assembler:paths');

export class DocumentPathsAssembler implements Assembler.Assembler {
  private readonly _assemblers: Assembler.Path[];

  private readonly _contextFactory: PathContextFactory;

  constructor(assemblers: Assembler.Path[], _contextFactory: PathContextFactory) {
    this._assemblers = assemblers;
    this._contextFactory = _contextFactory;
  }

  assemble(context: DocumentContext): void {
    const { output, ...defaultContextProps } = context;

    debug(`assembling document's paths for %O routes...`, defaultContextProps.routes.length);

    const pathContext = this._contextFactory.create(defaultContextProps);

    for (const assembler of this._assemblers) {
      assembler.assemble(pathContext);
    }

    const { data: pathsObject } = pathContext.output;
    const nbUniquePaths = Object.keys(pathsObject).length;

    debug(`document's paths assembled, added %O unique paths`, nbUniquePaths);

    output.data.paths = pathsObject;
  }
}
