import { Severity } from './constants';

class DataTransferError<T = unknown> extends Error {
  origin: string;

  severity: Severity;

  details: T | null;

  constructor(origin: string, severity: Severity, message?: string, details?: T | null) {
    super(message);

    this.origin = origin;
    this.severity = severity;
    this.details = details ?? null;
  }
}

export { DataTransferError };
