import type { Assembler } from '../../../..';

import { OperationIDAssembler } from './operation-id';
import { OperationParametersAssembler } from './parameters';
import { OperationResponsesAssembler } from './responses';
import { OperationTagsAssembler } from './tags';
import { BodyAssembler } from './body';

export class OperationAssemblerFactory {
  createAll(): Assembler.Operation[] {
    return [
      this._createOperationIDAssembler(),
      this._createParametersAssembler(),
      this._createResponsesAssembler(),
      this._createTagsAssembler(),
      this._createBodyAssembler(),
    ];
  }

  private _createOperationIDAssembler() {
    return new OperationIDAssembler();
  }

  private _createParametersAssembler() {
    return new OperationParametersAssembler();
  }

  private _createResponsesAssembler() {
    return new OperationResponsesAssembler();
  }

  private _createTagsAssembler() {
    return new OperationTagsAssembler();
  }

  private _createBodyAssembler() {
    return new BodyAssembler();
  }
}
