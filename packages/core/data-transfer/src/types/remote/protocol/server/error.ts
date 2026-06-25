export type ErrorKind = 'unknown' | 'discard-chunk' | 'invalid-chunk-format';

export class ServerError extends Error {
  public code: ErrorKind;

  public details?: Record<string, unknown> | null;

  constructor(code: ErrorKind, message: string, details?: Record<string, unknown> | null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class UnknownError extends ServerError {
  constructor(message: string, details?: Record<string, unknown> | null) {
    super('unknown', message, details);
  }
}

export class DiscardChunkError extends ServerError {
  constructor(message: string, details?: Record<string, unknown> | null) {
    super('discard-chunk', message, details);
  }
}
