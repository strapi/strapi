import crypto from 'node:crypto';
import { getDeviceName } from '@strapi/utils';
import type { Core, Data } from '@strapi/types';
import type { TrustedDevice } from '../../../shared/contracts/mfa';
import type { TrustedDeviceSettings } from '../../../shared/contracts/security-settings';
import type { MfaEventMetadata, MfaEventType } from './mfa';

export const TRUSTED_DEVICE_UID = 'admin::mfa-trusted-device';

/**
 * The most trusted browsers one account may hold: bounded at ten, transiently eleven under
 * concurrent grants; the next grant heals it.
 */
export const MAX_TRUSTED_DEVICES_PER_USER = 10;

const TRUST_TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The three notices this module raises; a subset of the service's `MfaChangeNotice`. */
export type TrustedDeviceNotice = 'device_trusted' | 'device_trust_revoked' | 'trusted_device_used';

export interface TrustedDeviceRow {
  id: Data.ID;
  userId: string;
  tokenHash: string;
  deviceId?: string | null;
  deviceName?: string | null;
  expiresAt: Date | string;
  lastUsedAt?: Date | string | null;
  createdAt: Date | string;
}

/**
 * The stored form of the cookie token. A plain sha256, not bcrypt: the token is 256 bits of
 * CSPRNG output, so there is nothing for a slow hash to protect. Recovery codes are bcrypted
 * because those carry only 50 bits. Hex in, hex out, so it can be compared with `===` after a
 * unique-index lookup.
 */
export const hashTrustToken = (token: string): string =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * `min(expiresAt, createdAt + settings.days)`. The stored expiry is the promise made at grant
 * and never slides; the ceiling is the organisation's current policy. Lowering `days` therefore
 * cuts every existing trust immediately with no row rewrite, and raising it never extends a trust
 * beyond what was promised.
 */
export const effectiveExpiry = (
  row: Pick<TrustedDeviceRow, 'expiresAt' | 'createdAt'>,
  settings: Pick<TrustedDeviceSettings, 'days'>
): Date => {
  const stored = new Date(row.expiresAt).getTime();
  const ceiling = new Date(row.createdAt).getTime() + settings.days * DAY_MS;
  return new Date(Math.min(stored, ceiling));
};

export const isLive = (
  row: Pick<TrustedDeviceRow, 'expiresAt' | 'createdAt'>,
  settings: Pick<TrustedDeviceSettings, 'days'>,
  now: Date = new Date()
): boolean => now.getTime() < effectiveExpiry(row, settings).getTime();

export interface TrustedDeviceDeps {
  strapi: Core.Strapi;
  /** The live policy. Injected so this module never reads the store itself. */
  settings: () => Promise<TrustedDeviceSettings>;
  recordEvent: (userId: string, type: MfaEventType, metadata?: MfaEventMetadata) => Promise<void>;
  notify: (
    userId: string,
    type: TrustedDeviceNotice,
    extra?: { byUserId?: string; count?: number }
  ) => Promise<void>;
}

const toIso = (value: Date | string): string => new Date(value).toISOString();

/**
 * Trusted devices: trusted browsers. Grant after a verified challenge, honour on `/login`, list, revoke,
 * sweep. Composed into `createMfaService`, so callers reach it as `getService('mfa').trustDevice`
 * and friends. Every function that decides anything keys on `userId`; the token's owner is never
 * inferred from the token alone.
 */
export const createTrustedDevices = ({
  strapi,
  settings,
  recordEvent,
  notify,
}: TrustedDeviceDeps) => {
  const query = () => strapi.db.query(TRUSTED_DEVICE_UID);

  const deleteRows = async (ids: Data.ID[]): Promise<void> => {
    if (ids.length === 0) {
      return;
    }
    await query().deleteMany({ where: { id: { $in: ids } } });
  };

  /**
   * Mints the token, stores its hash, applies the cap, records `device_trusted`. Returns the raw
   * token exactly once, for the controller to put in the cookie, or null when the organisation
   * does not offer trust (a stale checkbox is not an error). Any verified challenge may call
   * this; the function does not know which factor passed, which is what lets the passkey login
   * path reuse it unchanged.
   */
  const trustDevice = async (
    userId: string,
    context: { deviceId?: string; userAgent?: string | null }
  ): Promise<{ token: string; expiresAt: Date } | null> => {
    const current = await settings();
    if (!current.enabled) {
      return null;
    }

    const token = crypto.randomBytes(TRUST_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + current.days * DAY_MS);
    const deviceName = getDeviceName(context.userAgent) ?? null;

    await strapi.db.transaction(async () => {
      await query().create({
        data: {
          userId: String(userId),
          tokenHash: hashTrustToken(token),
          deviceId: context.deviceId ?? null,
          deviceName,
          expiresAt,
          lastUsedAt: null,
        },
      });

      // The cap. Rows per user are bounded by this very rule, so reading them all is cheap.
      const rows = (await query().findMany({
        where: { userId: String(userId) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: ['id'],
      })) as Array<Pick<TrustedDeviceRow, 'id'>>;
      await deleteRows(rows.slice(MAX_TRUSTED_DEVICES_PER_USER).map((row) => row.id));

      // Recorded inside the same transaction as the row and the cap eviction: the grant and its
      // audit trail must land or fail together, not have the row committed while the event that
      // explains it is lost to an unrelated failure. `notify` stays outside -- it is the event
      // hub, fire-and-forget.
      await recordEvent(userId, 'device_trusted', {
        ...(deviceName ? { deviceName } : {}),
        days: current.days,
      });
    });

    notify(userId, 'device_trusted');

    return { token, expiresAt };
  };

  /**
   * The `/login` check. True only for a live row owned by `userId`; stamps `lastUsedAt` and emits
   * the audit-only `trusted_device_used`. A row found dead -- past its stored expiry or past the
   * current ceiling -- is deleted here, so a later raise of `days` cannot revive a trust an
   * earlier cut killed. A row owned by someone else is left alone and simply refused.
   */
  const consumeTrustedDevice = async (userId: string, token: string): Promise<boolean> => {
    const current = await settings();
    if (!current.enabled) {
      return false;
    }

    const row = (await query().findOne({
      where: { tokenHash: hashTrustToken(token) },
    })) as TrustedDeviceRow | null;
    if (!row || String(row.userId) !== String(userId)) {
      return false;
    }

    if (!isLive(row, current)) {
      await deleteRows([row.id]);
      return false;
    }

    await query().update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
    notify(userId, 'trusted_device_used');
    return true;
  };

  /**
   * The caller's live rows, current first, then newest. Dead rows met on the way are deleted.
   * `current` is decided by hashing the cookie the browser presented, never by `deviceId`.
   * The hash never leaves this function.
   */
  const listTrustedDevices = async (
    userId: string,
    presentedToken?: string
  ): Promise<TrustedDevice[]> => {
    const current = await settings();
    const rows = (await query().findMany({
      where: { userId: String(userId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })) as TrustedDeviceRow[];

    const now = new Date();
    const live = rows.filter((row) => isLive(row, current, now));
    await deleteRows(rows.filter((row) => !isLive(row, current, now)).map((row) => row.id));

    const presentedHash = presentedToken ? hashTrustToken(presentedToken) : null;

    return live
      .map((row) => ({
        id: String(row.id),
        deviceName: row.deviceName ?? null,
        createdAt: toIso(row.createdAt),
        expiresAt: effectiveExpiry(row, current).toISOString(),
        lastUsedAt: row.lastUsedAt ? toIso(row.lastUsedAt) : null,
        current: presentedHash !== null && row.tokenHash === presentedHash,
      }))
      .sort((a, b) => Number(b.current) - Number(a.current));
  };

  /** Silent: the caller's own event (`disabled`, `authenticator_replaced`, a settings update) covers it. */
  const clearTrustedDevices = async (userId: string): Promise<number> => {
    const result = await query().deleteMany({ where: { userId: String(userId) } });
    return result?.count ?? 0;
  };

  /** Silent, every user: the transition to `trustedDevices.enabled: false`. */
  const clearAllTrustedDevices = async (): Promise<number> => {
    const result = await query().deleteMany({ where: {} });
    return result?.count ?? 0;
  };

  /**
   * One row, only if it is the caller's. `current` tells the controller whether the row it just
   * deleted is the one the presented cookie hashes to, so it can clear that cookie.
   */
  const revokeTrustedDevice = async (
    userId: string,
    id: string,
    presentedToken?: string
  ): Promise<{ revoked: boolean; current: boolean }> => {
    const row = (await query().findOne({
      where: { id, userId: String(userId) },
    })) as TrustedDeviceRow | null;
    if (!row) {
      return { revoked: false, current: false };
    }

    await deleteRows([row.id]);
    await recordEvent(userId, 'device_trust_revoked', {
      ...(row.deviceName ? { deviceName: row.deviceName } : {}),
      count: 1,
    });
    notify(userId, 'device_trust_revoked', { count: 1 });

    return {
      revoked: true,
      current: presentedToken !== undefined && row.tokenHash === hashTrustToken(presentedToken),
    };
  };

  /**
   * Every row of one user, by the user or by an administrator (`actor.byUserId`). Records and
   * emits only when something was actually revoked, so an administrator clicking on an empty list
   * leaves no notice behind.
   */
  const revokeAllTrustedDevices = async (
    userId: string,
    actor: { byUserId?: string } = {}
  ): Promise<number> => {
    const count = await clearTrustedDevices(userId);
    if (count > 0) {
      const extra = actor.byUserId ? { byUserId: actor.byUserId } : {};
      await recordEvent(userId, 'device_trust_revoked', { count, ...extra });
      notify(userId, 'device_trust_revoked', { count, ...extra });
    }
    return count;
  };

  /**
   * Housekeeping, not enforcement: a dead row is already refused (and deleted) on read, so this
   * only keeps the table from holding rows nobody will present again. Stored expiry only; the
   * read-time ceiling needs no sweep.
   */
  const sweepExpiredTrustedDevices = async (): Promise<number> => {
    const result = await query().deleteMany({ where: { expiresAt: { $lt: new Date() } } });
    return result?.count ?? 0;
  };

  const trustedDeviceSettings = (): Promise<TrustedDeviceSettings> => settings();

  return {
    trustDevice,
    consumeTrustedDevice,
    listTrustedDevices,
    revokeTrustedDevice,
    revokeAllTrustedDevices,
    clearTrustedDevices,
    clearAllTrustedDevices,
    sweepExpiredTrustedDevices,
    trustedDeviceSettings,
  };
};
