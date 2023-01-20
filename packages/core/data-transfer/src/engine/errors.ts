import { DataTransferError, Severity, SeverityKind } from '../errors';

type TransferEngineStep = 'initialization' | 'validation' | 'transfer';

type TransferEngineErrorDetails<P extends TransferEngineStep = TransferEngineStep, U = never> = {
  step: P;
} & ([U] extends [never] ? unknown : { details?: U });

class TransferEngineError<
  P extends TransferEngineStep = TransferEngineStep,
  U = never,
  T extends TransferEngineErrorDetails<P, U> = TransferEngineErrorDetails<P, U>
> extends DataTransferError<T> {
  constructor(severity: Severity, message?: string, details?: T | null) {
    super('engine', severity, message, details);
  }
}

class TransferEngineInitializationError extends TransferEngineError<'initialization'> {
  constructor(message?: string) {
    super(SeverityKind.FATAL, message, { step: 'initialization' });
  }
}

class TransferEngineValidationError<
  T extends { check: string } = { check: string }
> extends TransferEngineError<'validation', T> {
  constructor(message?: string, details?: T) {
    super(SeverityKind.FATAL, message, { step: 'validation', details });
  }
}

class TransferEngineTransferError<
  T extends { check: string } = { check: string }
> extends TransferEngineError<'transfer', T> {
  constructor(message?: string, details?: T) {
    super(SeverityKind.FATAL, message, { step: 'transfer', details });
  }
}

export {
  TransferEngineError,
  TransferEngineInitializationError,
  TransferEngineValidationError,
  TransferEngineTransferError,
};
