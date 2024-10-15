import type { Version } from '../version';

export class UnexpectedError extends Error {
  constructor() {
    super('Unexpected Error');
  }
}

export class NPMCandidateNotFoundError extends Error {
  target: Version.SemVer | Version.Range | Version.ReleaseType;

  constructor(
    target: Version.SemVer | Version.Range | Version.ReleaseType,
    message: string = `Couldn't find a valid NPM candidate for "${target}"`
  ) {
    super(message);

    this.target = target;
  }
}

export class AbortedError extends Error {
  constructor(message: string = 'Upgrade aborted') {
    super(message);
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
