export class UnexpectedError extends Error {
  constructor() {
    super('Unexpected Error');
  }
}

export const unknownToError = (e: unknown): Error => {
  if (e instanceof Error) {
    return e;
  }

  if (typeof e === 'string') {
    return new Error(e);
  }

  return new UnexpectedError();
};
