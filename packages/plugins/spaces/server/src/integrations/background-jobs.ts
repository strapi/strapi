import type { Core } from '@strapi/types';

import { SPACE_ATTRIBUTE } from '../../../shared/constants';
import { runInSpace, runUnscoped } from '../scope/context';

/**
 * Work that happens for a space without anyone asking for it: a release
 * publishing at the time it was scheduled for, long after the request that
 * scheduled it ended.
 *
 * Such work has no request to take its space from, so it has to take it from
 * the record it is acting on. Running it unscoped instead would let a release
 * created in one space publish entries from another; running it in the space
 * the record belongs to makes the background run see exactly what the
 * scheduling user saw.
 */
export const registerBackgroundJobIntegration = (strapi: Core.Strapi) => {
  const releases = strapi.plugin('content-releases');

  if (!releases) {
    return;
  }

  /**
   * Both the publish endpoint and the scheduler call the release service, so
   * putting the space in force there covers them at once — including a
   * scheduled run that fires days after the request that set it up.
   *
   * The space is resolved when the publish happens rather than when it was
   * scheduled: a release can be moved, or its space archived, in between, and
   * the state that matters is the one at publication.
   */
  const releaseService = releases.service('release');

  if (!releaseService?.publish) {
    return;
  }

  const originalPublish = releaseService.publish.bind(releaseService);

  releaseService.publish = async (releaseId: string | number, ...rest: unknown[]) => {
    const space = await resolveReleaseSpace(strapi, releaseId);

    if (!space) {
      return originalPublish(releaseId, ...rest);
    }

    return runInSpace(space, () => originalPublish(releaseId, ...rest));
  };
};

const resolveReleaseSpace = async (
  strapi: Core.Strapi,
  releaseId: string | number
): Promise<{ id: number; slug: string } | undefined> => {
  const release = await runUnscoped(() =>
    strapi.db.query('plugin::content-releases.release').findOne({
      where: { id: releaseId },
      populate: { [SPACE_ATTRIBUTE]: true },
    })
  );

  const space = release?.[SPACE_ATTRIBUTE] as { id: number; slug: string; status: string } | null;

  return space && space.status === 'active' ? { id: space.id, slug: space.slug } : undefined;
};
