import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { clearLegacyCutoverCache } from '../compat/legacy-jwt';
import type { LegacyHit } from '../compat/legacy-jwt';

const HITS_KEY = 'legacyJwtHits';

/** A hit is written to the store at most this often; the rest wait in memory */
export const FLUSH_INTERVAL_MS = 60_000;

export interface LegacyJwtHits {
  legacy: number;
  access: number;
  lastHitAt: string | null;
}

const empty = (): LegacyJwtHits => ({ legacy: 0, access: 0, lastHitAt: null });

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const readStored = (value: unknown): LegacyJwtHits => {
  const stored = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;

  return {
    legacy: isCount(stored.legacy) ? stored.legacy : 0,
    access: isCount(stored.access) ? stored.access : 0,
    lastHitAt: typeof stored.lastHitAt === 'string' ? stored.lastHitAt : null,
  };
};

/**
 * `strapi.plugin('end-users').service('compat')`: how often the tokens of Users & Permissions are
 * still used, per kind, so an administrator can see when it is safe to set the cut-off.
 *
 * Only counts and the time of the last hit are kept: never a token, a user or an address. Hits are
 * counted in memory and added to the stored totals lazily, at most once a minute and when the
 * plugin is destroyed, so a request never waits on a write. Two instances of the application each
 * read the stored totals and write them back, so they can lose counts; acceptable for an indicator
 * of whether it is safe to set the cut-off.
 */
const compatService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });

  let pending = empty();
  let flushedAt = 0;
  let flushing: Promise<void> = Promise.resolve();

  const hasPending = () => pending.legacy + pending.access > 0;

  const flush = (): Promise<void> => {
    flushing = flushing.then(async () => {
      if (!hasPending()) {
        return;
      }

      // What is being written stays in `pending` until it is stored, so a read in between still
      // counts it
      const batch = { ...pending };

      try {
        const stored = readStored(await store().get({ key: HITS_KEY }));

        await store().set({
          key: HITS_KEY,
          value: {
            legacy: stored.legacy + batch.legacy,
            access: stored.access + batch.access,
            lastHitAt: batch.lastHitAt ?? stored.lastHitAt,
          },
        });

        pending = {
          legacy: pending.legacy - batch.legacy,
          access: pending.access - batch.access,
          lastHitAt: pending.lastHitAt,
        };
      } catch (error) {
        // Kept: the next flush writes them
        strapi.log.warn(`Could not store the legacy token counts: ${(error as Error).message}`);
      }
    });

    return flushing;
  };

  return {
    /** Counts a hit. Writes at most once a minute; never throws and never waits. */
    recordLegacyHit(kind: LegacyHit['kind']): void {
      const now = Date.now();

      pending[kind] += 1;
      pending.lastHitAt = new Date(now).toISOString();

      if (now - flushedAt >= FLUSH_INTERVAL_MS) {
        flushedAt = now;
        flush().catch(() => undefined);
      }
    },

    /** The totals: what is stored, and what is still waiting in memory */
    async legacyJwtHits(): Promise<LegacyJwtHits> {
      const stored = readStored(await store().get({ key: HITS_KEY }));

      return {
        legacy: stored.legacy + pending.legacy,
        access: stored.access + pending.access,
        lastHitAt: pending.lastHitAt ?? stored.lastHitAt,
      };
    },

    /**
     * Drops the cached read of the migration record, so the next legacy token is judged by the
     * record as it is now. Called by whatever writes the record.
     */
    clearCutoverCache(): void {
      clearLegacyCutoverCache(strapi);
    },

    /** Writes what is waiting. Called when the plugin is destroyed. */
    flush,
  };
};

export default compatService;
