import { PathContextFactory } from '../../context';

import type { Assembler } from '..';

import { DocumentInfoAssembler } from './info';
import { DocumentMetadataAssembler } from './metadata';
import { DocumentPathsAssembler, PathAssemblerFactory } from './path';

export class DocumentAssemblerFactory {
  createAll(): Assembler.Document[] {
    return [
      this._createMetadataAssembler(),
      this._createInfoAssembler(),
      this._createPathsAssembler(),
    ];
  }

  private _createInfoAssembler() {
    return new DocumentInfoAssembler();
  }

  private _createMetadataAssembler() {
    return new DocumentMetadataAssembler();
  }

  private _createPathsAssembler(
    assemblerFactory: PathAssemblerFactory = new PathAssemblerFactory(),
    contextFactory: PathContextFactory = new PathContextFactory()
  ) {
    const assemblers = assemblerFactory.createAll();

    return new DocumentPathsAssembler(assemblers, contextFactory);
  }
}
