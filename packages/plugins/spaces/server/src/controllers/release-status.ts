import type { Core } from '@strapi/types';

import { RELEASE_ACTION_UID, RELEASE_UID, bucketStatus } from '../releases-integration';
import { getService } from '../utils';
import { getRequestSpace, runUnscoped } from '../utils/space-scope';

import type { ReleaseBucket } from '../releases-integration';

interface ActionRow {
  id: number;
  isEntryValid: boolean | null;
  space?: { id: number } | null;
}

/**
 * `GET /spaces/releases/:id/status` — the readiness of a release per workspace:
 * the global (persisted) status, one bucket per workspace and one for the
 * shared entries. A sub-workspace only gets its own bucket.
 */
const releaseStatus = ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(ctx: any) {
    if (!strapi.plugin('content-releases')) {
      return ctx.notFound();
    }
    if (!ctx.state?.userAbility?.can('plugin::content-releases.read')) {
      return ctx.forbidden();
    }

    const id = Number(ctx.params?.id);
    const release = await runUnscoped(() =>
      strapi.db.query(RELEASE_UID).findOne({
        where: { id },
        select: ['id', 'status', 'releasedAt'],
      })
    );
    if (!release) {
      return ctx.notFound('Release not found');
    }

    const [spaces, actions] = await Promise.all([
      getService('spaces').getAll(),
      runUnscoped(() =>
        strapi.db.query(RELEASE_ACTION_UID).findMany({
          where: { release: { id } },
          select: ['id', 'isEntryValid'],
          populate: { space: { select: ['id'] } },
        })
      ) as Promise<ActionRow[]>,
    ]);

    const released = Boolean(release.releasedAt);
    const counts = new Map<number | null, { total: number; invalid: number }>();
    for (const action of actions) {
      const key = action.space?.id ?? null;
      const bucket = counts.get(key) ?? { total: 0, invalid: 0 };
      bucket.total += 1;
      if (action.isEntryValid === false) bucket.invalid += 1;
      counts.set(key, bucket);
    }
    const toBucket = (key: number | null): ReleaseBucket => {
      const raw = counts.get(key) ?? { total: 0, invalid: 0 };
      return { ...raw, status: bucketStatus(raw, released) };
    };

    const request = getRequestSpace(strapi);
    const visibleSpaces =
      request && !request.isDefault ? spaces.filter((space) => space.id === request.id) : spaces;

    ctx.body = {
      global: release.status,
      released,
      byWorkspace: visibleSpaces.map((space) => ({
        id: space.id,
        slug: space.slug,
        name: space.name,
        color: space.color ?? null,
        ...toBucket(space.id),
      })),
      shared: toBucket(null),
    };
  },
});

export default releaseStatus;
