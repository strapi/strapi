import crypto from 'node:crypto';
import { getDeviceName } from '@strapi/utils';
import type { Core, Data } from '@strapi/types';
import type { TrustedDevice } from '../../../shared/contracts/mfa';
import type { TrustedDeviceSettings } from '../../../shared/contracts/security-settings';
import type { MfaEventMetadata, MfaEventType } from './mfa';

export const TRUSTED_DEVICE_UID = 'admin::mfa-trusted-device';

/** Transiently eleven under concurrent grants; the next grant heals it. */
export const MAX_TRUSTED_DEVICES_PER_USER = 10;

const TRUST_TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** sha256, not bcrypt: 256 bits of CSPRNG output leave nothing for a slow hash to protect.
 * Recovery codes are bcrypted because those carry 50. */
export const hashTrustToken = (token: string): string =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

/** The stored expiry is the promise made at grant and never slides; the ceiling is current policy.
 * So lowering `days` cuts every trust immediately with no row rewrite, and raising it extends
 * none beyond what was promised. */
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
  settings: () => Promise<TrustedDeviceSettings>;
  recordEvent: (userId: string, type: MfaEventType, metadata?: MfaEventMetadata) => Promise<void>;
  /** Never awaited here and never inside a transaction: it cannot reject, and awaiting it would put
   * an email send on the request's critical path. The floating promises are deliberate. */
  notify: (
    userId: string,
    type: TrustedDeviceNotice,
    extra?: { byUserId?: string; count?: number }
  ) => Promise<void>;
}

const toIso = (value: Date | string): string => new Date(value).toISOString();

/** Every function that decides anything keys on `userId`: the token's owner is never inferred
 * from the token alone. */
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

  /** Returns the raw token exactly once, or null when the organisation does not offer trust (a
   * stale checkbox is not an error). It does not know which factor passed, which is what lets the
   * passkey login path reuse it unchanged. */
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

      const rows = (await query().findMany({
        where: { userId: String(userId) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: ['id'],
      })) as Array<Pick<TrustedDeviceRow, 'id'>>;
      await deleteRows(rows.slice(MAX_TRUSTED_DEVICES_PER_USER).map((row) => row.id));

      // In the transaction with the row and the eviction: the grant and the audit trail that explains
      // it must land or fail together.
      await recordEvent(userId, 'device_trusted', {
        ...(deviceName ? { deviceName } : {}),
        days: current.days,
      });
    });

    notify(userId, 'device_trusted');

    return { token, expiresAt };
  };

  /** A dead row is deleted here, so a later raise of `days` cannot revive a trust an earlier cut
   * killed. A row owned by someone else is left alone and refused. */
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

  /** `current` is decided by hashing the presented cookie, never by `deviceId`, and the hash never
   * leaves this function. Dead rows met on the way are deleted. */
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

    return (
      live
        .map((row) => ({
          id: String(row.id),
          deviceName: row.deviceName ?? null,
          createdAt: toIso(row.createdAt),
          expiresAt: effectiveExpiry(row, current).toISOString(),
          lastUsedAt: row.lastUsedAt ? toIso(row.lastUsedAt) : null,
          current: presentedHash !== null && row.tokenHash === presentedHash,
        }))
        // This orders only the "current first" half of the contract. The rest rests on `sort` being
        // stable and the `findMany` above being ordered: collapsing the two silently breaks it.
        .sort((a, b) => Number(b.current) - Number(a.current))
    );
  };

  /** Silent: the caller's own event covers it. */
  const clearTrustedDevices = async (userId: string): Promise<number> => {
    const result = await query().deleteMany({ where: { userId: String(userId) } });
    return result?.count ?? 0;
  };

  const clearAllTrustedDevices = async (): Promise<number> => {
    const result = await query().deleteMany({ where: {} });
    return result?.count ?? 0;
  };

  /** `current` tells the controller whether the deleted row is the one the presented cookie hashes
   * to, so it can clear that cookie. */
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

  /** Records and emits only when something was actually revoked, so an administrator acting on an
   * empty list leaves no notice behind. */
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

  /** Housekeeping: a dead row is already refused, and deleted, on read. Stored expiry only -- the
   * read-time ceiling needs no sweep. */
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
