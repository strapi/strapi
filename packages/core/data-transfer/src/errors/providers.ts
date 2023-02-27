import { DataTransferError } from './base';
import { Severity, SeverityKind } from './constants';

type ProviderStep = 'initialization' | 'validation' | 'transfer';

type ProviderErrorDetails<P extends ProviderStep = ProviderStep, U = never> = {
  step: P;
} & ([U] extends [never] ? unknown : { details?: U });

export class ProviderError<
  P extends ProviderStep = ProviderStep,
  U = never,
  T extends ProviderErrorDetails<P, U> = ProviderErrorDetails<P, U>
> extends DataTransferError<T> {
  constructor(severity: Severity, message?: string, details?: T | null) {
    super('provider', severity, message, details);
  }
}

export class ProviderInitializationError extends ProviderError<'initialization'> {
  constructor(message?: string) {
    super(SeverityKind.FATAL, message, { step: 'initialization' });
  }
}

// TODO: these types are not working correctly, ProviderTransferError() is accepting any details object rather than requiring T
export class ProviderValidationError<T = ProviderErrorDetails> extends ProviderError<
  'validation',
  T
> {
  constructor(message?: string, details?: T) {
    super(SeverityKind.SILLY, message, { step: 'validation', details });
  }
}
// TODO: these types are not working correctly, ProviderTransferError() is accepting any details object rather than requiring T
export class ProviderTransferError<T = ProviderErrorDetails> extends ProviderError<'transfer', T> {
  constructor(message?: string, details?: T) {
    super(SeverityKind.FATAL, message, { step: 'transfer', details });
  }
}
