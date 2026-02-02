export enum ErrorKind {
  // Generic
  Unknown = 0,
  // Chunk transfer
  DiscardChunk = 1,
  InvalidChunkFormat = 2,
}

export class ServerError extends Error {
  constructor(
    public code: ErrorKind,
    public message: string,
    public details?: Record<string, unknown> | null
  ) {
    super(message);
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
