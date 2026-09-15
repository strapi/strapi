import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { SPACE_ATTRIBUTE } from '../../../shared/constants';
import { getScope, runInSpace, runUnscoped } from '../scope/context';

const RELEASE_UID = 'plugin::content-releases.release';

/**
 * Work that happens for a space without anyone asking for it: a release
 * publishing at the time it was scheduled for, long after the request that
 * scheduled it ended.
 *
 * Such work has no request to take its space from, so it takes it from the
 * record it is acting on. That is also why it cannot simply always do so — the
 * same service call serves the publish endpoint, where there *is* a caller, and
 * taking the space from the release there would let anyone who knows a release
 * id publish in a space they cannot enter.
 */
export const registerBackgroundJobIntegration = (strapi: Core.Strapi) => {
  const releases = strapi.plugin('content-releases');
  const releaseService = releases?.service('release');

  if (!releaseService?.publish) {
    return;
  }

  const originalPublish = releaseService.publish.bind(releaseService);

  releaseService.publish = async (releaseId: string | number, ...rest: unknown[]) => {
    const scope = getScope(strapi);

    if (scope.mode === 'unresolved') {
      throw new errors.ForbiddenError(
        scope.reason ?? 'This request has no space, so it cannot publish a release.'
      );
    }

    // A caller inside a space may only publish that space's releases. The
    // release controller hands the id straight to this service, so this is
    // where that is established — and once established, the space in force is
    // already the right one.
    if (scope.mode === 'space') {
      const visible = await strapi.db.query(RELEASE_UID).findOne({ where: { id: releaseId } });

      if (!visible) {
        throw new errors.NotFoundError('Release not found');
      }

      return originalPublish(releaseId, ...rest);
    }

    // No space in force: the scheduler firing on its own, or someone working
    // across every space. Take it from the release, resolved now rather than
    // when it was scheduled — a release can be moved, or its space archived, in
    // between, and the state that matters is the one at publication.
    const space = await resolveReleaseSpace(strapi, releaseId);

    return space
      ? runInSpace(space, () => originalPublish(releaseId, ...rest))
      : originalPublish(releaseId, ...rest);
  };
};

const resolveReleaseSpace = async (
  strapi: Core.Strapi,
  releaseId: string | number
): Promise<{ id: number; slug: string } | undefined> => {
  const release = await runUnscoped(() =>
    strapi.db.query(RELEASE_UID).findOne({
      where: { id: releaseId },
      populate: { [SPACE_ATTRIBUTE]: true },
    })
  );

  const space = release?.[SPACE_ATTRIBUTE] as { id: number; slug: string; status: string } | null;

  return space && space.status === 'active' ? { id: space.id, slug: space.slug } : undefined;
};
