import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { PLUGIN_ID, USER_UID } from '../constants';
import { BAD_LINK } from '../compat/endpoints/confirmation';
import { TWO_FACTOR_REQUIRED } from '../compat/endpoints/shared';
import { refusalResult } from '../compat/errors';
import { clearLegacyCutoverCache } from '../compat/legacy-jwt';
import type { LegacyHit } from '../compat/legacy-jwt';
import { signedInUser } from '../compat/login-response';
import type { UpUser } from '../compat/shapes';
import type { AuthEngine } from '../engine/types';
import { normalizeEmail } from '../utils/normalize-email';

const HITS_KEY = 'legacyJwtHits';

/** A hit is written to the store at most this often; the rest wait in memory */
export const FLUSH_INTERVAL_MS = 60_000;

export interface LegacyJwtHits {
  legacy: number;
  access: number;
  lastHitAt: string | null;
}

/**
 * The address a verification token was made for. The token is a signed token whose payload names
 * it; it is read here only for the user it names, and a session is made only after the engine has
 * verified the token.
 */
const emailOfToken = (token: string): string | null => {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());

    return typeof payload?.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
};

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

    /**
     * Confirms an address with the token of the link in the email, and signs the user in: the
     * `{ jwt, user }` a GraphQL `emailConfirmation` answers with.
     *
     * A verification token is not single-use by itself: it stays good until it expires. So the
     * session is the one thing the link may give once: it is issued only when this call is the one
     * that confirmed the address (it was not confirmed before and is now), and a link used again,
     * or for an address that was already confirmed, is the `Invalid token` error with no session.
     * A user with a second factor is confirmed but gets no session, as at `/local`. The engine
     * verifies the token (signature and expiry) before anything is read from it, and refuses it as
     * the REST route does; the user is the one the verified token names.
     *
     * Calls with the same link at the same moment are one after the other: the read, the
     * confirmation and the session run in a transaction that first locks the user's row
     * (`SELECT ... FOR UPDATE`; SQLite serialises its writers itself), so the second call reads the
     * address as already confirmed.
     */
    async confirmEmail(
      token: string,
      meta: { ipAddress?: string | null; userAgent?: string | null } = {}
    ): Promise<{ jwt: string; user: UpUser }> {
      const engine = strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;
      const invalid = () => new errors.ApplicationError(BAD_LINK.INVALID_TOKEN);
      const read = async (email: string) =>
        (await strapi.db.query(USER_UID).findOne({
          where: { email: normalizeEmail(email) },
          select: ['documentId', 'emailVerified', 'twoFactorEnabled'],
        })) as {
          documentId: string;
          emailVerified?: boolean | null;
          twoFactorEnabled?: boolean | null;
        } | null;

      type Outcome = { ok: true; jwt: string; user: UpUser } | { ok: false; error: Error };

      // Refusals are carried out of the transaction, not thrown in it: a second factor is refused
      // after the address was confirmed, and that must not be rolled back
      const run = async (email: string | null): Promise<Outcome> => {
        // Only to see whether this call is the one that confirms: nobody is signed in by it
        const before = email ? await read(email) : null;

        try {
          await engine.callNative('verifyEmail', { headers: new Headers(), query: { token } });
        } catch (error) {
          const refused = refusalResult(error, BAD_LINK);

          if (refused === null) {
            throw error;
          }

          const { message, details } = (
            refused.body as { error: { message: string; details: object } }
          ).error;

          return { ok: false, error: new errors.ApplicationError(message, details) };
        }

        if (!email || !before || before.emailVerified === true) {
          return { ok: false, error: invalid() };
        }

        const after = await read(email);

        if (after?.emailVerified !== true) {
          return { ok: false, error: invalid() };
        }

        if (after.twoFactorEnabled === true) {
          return {
            ok: false,
            error: new errors.ForbiddenError(TWO_FACTOR_REQUIRED, { code: 'TWO_FACTOR_REQUIRED' }),
          };
        }

        const session = await engine.createSession(after.documentId, meta);
        const user = await signedInUser(strapi, after.documentId);

        return user ? { ok: true, jwt: session.token, user } : { ok: false, error: invalid() };
      };

      const email = emailOfToken(token);
      const outcome = await strapi.db.transaction(async () => {
        if (email) {
          await strapi.db
            .queryBuilder(USER_UID)
            .select('id')
            .where({ email: normalizeEmail(email) })
            .first()
            .forUpdate()
            .execute();
        }

        return run(email);
      });

      if (!outcome.ok) {
        throw outcome.error;
      }

      return { jwt: outcome.jwt, user: outcome.user };
    },
  };
};

export default compatService;
