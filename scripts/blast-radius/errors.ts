export const ExitCode = {
  Internal: 1,
  InvalidInput: 2,
  ActionContext: 3,
  GitChanges: 4,
  Nx: 5,
  UnrecognizedPath: 6,
} as const;

export class BlastRadiusError extends Error {
  constructor(
    public readonly exitCode: (typeof ExitCode)[keyof typeof ExitCode],
    message: string
  ) {
    super(message);
    this.name = 'BlastRadiusError';
  }
}
