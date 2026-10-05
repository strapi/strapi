export const ERROR_KINDS = {
  // Generic
  Unknown: 'unknown',
  // Chunk transfer
  DiscardChunk: 'discard-chunk',
  InvalidChunkFormat: 'invalid-chunk-format',
} as const;

export type ErrorKind = (typeof ERROR_KINDS)[keyof typeof ERROR_KINDS];

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
    super(ERROR_KINDS.Unknown, message, details);
  }
}

export class DiscardChunkError extends ServerError {
  constructor(message: string, details?: Record<string, unknown> | null) {
    super(ERROR_KINDS.DiscardChunk, message, details);
  }
}
