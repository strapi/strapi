export const ErrorKind = {
  // Generic
  Unknown: 0,
  // Chunk transfer
  DiscardChunk: 1,
  InvalidChunkFormat: 2,
} as const satisfies Record<string, ErrorKind>;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ErrorKind = 0 | 1 | 2;

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
    super(ErrorKind.Unknown, message, details);
  }
}

export class DiscardChunkError extends ServerError {
  constructor(message: string, details?: Record<string, unknown> | null) {
    super(ErrorKind.DiscardChunk, message, details);
  }
}
