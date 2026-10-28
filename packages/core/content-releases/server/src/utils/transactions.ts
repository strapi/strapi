import { errors } from '@strapi/utils';

import type { Core, Data } from '@strapi/types';
import type { Release } from '../../../shared/contracts/releases';
import { RELEASE_MODEL_UID } from '../constants';

// Reads a release under its row lock (FOR UPDATE), in the current transaction. Runs, action
// changes and status recalculations all take it, so each waits for the one in progress.
export const lockRelease = <TColumn extends keyof Release>(
  releaseId: Data.ID,
  columns: TColumn[],
  { strapi }: { strapi: Core.Strapi }
): Promise<Pick<Release, TColumn> | undefined> =>
  strapi.db
    .queryBuilder(RELEASE_MODEL_UID)
    .where({ id: releaseId })
    .select(columns)
    .first()
    .forUpdate()
    .execute();

// Locks a release that must still be planned: throws if it doesn't exist or has run
export const lockPlannedRelease = async <TColumn extends keyof Release>(
  releaseId: Data.ID,
  columns: TColumn[],
  { strapi }: { strapi: Core.Strapi }
): Promise<Pick<Release, TColumn>> => {
  const release = await lockRelease(releaseId, [...columns, 'releasedAt'], { strapi });

  if (!release) {
    throw new errors.NotFoundError(`No release found for id ${releaseId}`);
  }

  if (release.releasedAt) {
    throw new errors.ValidationError('Release already published');
  }

  return release;
};

// Runs a task once the current transaction commits (right away without one), without waiting
// for it: it reads committed data and never runs for a rolled-back change. Failures are logged.
export const runAfterCommit = (
  task: () => Promise<unknown>,
  errorMessage: string,
  { strapi }: { strapi: Core.Strapi }
) => {
  const logError = (error: unknown) => strapi.log.error(errorMessage, { error });

  if (!strapi.db.inTransaction()) {
    task().catch(logError);
    return;
  }

  strapi.db
    .transaction(({ onCommit }) => {
      onCommit(() => task().catch(logError));
    })
    .catch(logError);
};
