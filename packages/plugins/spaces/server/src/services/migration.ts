import type { Core } from '@strapi/types';

import { SPACE_ATTRIBUTE, type Space } from '../../../shared/constants';
import { runUnscoped } from '../scope/context';

const STORE_KEY = 'spaces_migration';

export interface MigrationState {
  /** Slug of the space existing data was assigned to. */
  defaultSpaceSlug: string;
  completedAt: string;
  /** Rows assigned, per model. Kept for the install report and for support. */
  assigned: Record<string, number>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: 'spaces' });

  const service = {
    async getState(): Promise<MigrationState | null> {
      return ((await store().get({ key: STORE_KEY })) as MigrationState | null) ?? null;
    },

    /**
     * Prepares a project for Spaces.
     *
     * Turning tenancy on means every existing row suddenly belongs somewhere,
     * and the honest answer to "where?" is "the space that existed before there
     * were spaces". So one space is created and everything is assigned to it;
     * from then on, new content is stamped as it is written.
     *
     * The assignment is the part that must not be got wrong. Rows left without
     * a space are treated as shared, which for a project's own content would
     * mean every tenant seeing every entry — so this runs to completion, or
     * reports that it did not.
     */
    async run(): Promise<MigrationState> {
      const existing = await service.getState();

      if (existing) {
        return existing;
      }

      const spaces = strapi.service('plugin::spaces.spaces');
      const space: Space = (await spaces.getDefault()) ?? (await service.createInitialSpace());

      const assigned = await service.assignOrphanRows(space);

      const state: MigrationState = {
        defaultSpaceSlug: space.slug,
        completedAt: new Date().toISOString(),
        assigned,
      };

      await store().set({ key: STORE_KEY, value: state });

      const total = Object.values(assigned).reduce((sum, count) => sum + count, 0);

      strapi.log.info(
        `[spaces] Ready. ${total} existing ${total === 1 ? 'row' : 'rows'} assigned to the "${space.slug}" space.`
      );

      return state;
    },

    async createInitialSpace(): Promise<Space> {
      const name = (strapi.config.get('info.displayName') as string | undefined) ?? 'Main';

      return runUnscoped(() =>
        strapi.service('plugin::spaces.spaces').create({ name, slug: 'main' })
      );
    },

    /**
     * Assigns every row that has no space yet to `space`.
     *
     * Done in batches through the query builder rather than the document
     * service: this touches draft and published rows of every locale, and must
     * not fire lifecycles, emit events or write history for content that is not
     * actually changing.
     */
    async assignOrphanRows(space: Space): Promise<Record<string, number>> {
      const uids: string[] = strapi.service('plugin::spaces.content-types').listScopedUids();
      const assigned: Record<string, number> = {};

      for (const uid of uids) {
        const count = await runUnscoped(async () => {
          const pending = await strapi.db.query(uid).count({ where: { [SPACE_ATTRIBUTE]: null } });

          if (pending === 0) {
            return 0;
          }

          await strapi.db.query(uid).updateMany({
            where: { [SPACE_ATTRIBUTE]: null },
            data: { [SPACE_ATTRIBUTE]: space.id },
          });

          return pending;
        });

        if (count > 0) {
          assigned[uid] = count;
        }
      }

      return assigned;
    },

    /**
     * Rows that still have no space, per model.
     *
     * Surfaced in the admin because "shared with every space" is a real state a
     * project can be in — content seeded by the CLI lands there — and an
     * administrator should be able to see it rather than discover it through a
     * tenant seeing someone else's entry.
     */
    async countSharedRows(): Promise<Record<string, number>> {
      const uids: string[] = strapi.service('plugin::spaces.content-types').listScopedUids();
      const counts: Record<string, number> = {};

      for (const uid of uids) {
        const count = await runUnscoped(() =>
          strapi.db.query(uid).count({ where: { [SPACE_ATTRIBUTE]: null } })
        );

        if (count > 0) {
          counts[uid] = count;
        }
      }

      return counts;
    },
  };

  return service;
};
