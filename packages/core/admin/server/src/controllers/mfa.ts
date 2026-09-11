import type { Context } from 'koa';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import {
  validateMfaEnrolInput,
  validateMfaCodeInput,
  validateMfaPasswordAndCodeInput,
  validateMfaNoticesSeenInput,
  validatePasskeyOptionsInput,
  validateRegisterPasskeyInput,
} from '../validation/authentication/mfa';
import {
  getSessionManager,
  buildSessionMetadataFromContext,
  MFA_TRUST_COOKIE_NAME,
  clearTrustCookie,
} from '../../../shared/utils/session-auth';
import { MfaRequiredError } from '../services/mfa-errors';
import { PASSKEYS_DISABLED, PASSKEY_NEEDS_TOTP } from '../services/mfa-passkeys';

import type { AdminUser } from '../../../shared/contracts/shared';
import type {
  Me,
  Enrol,
  VerifyEnrolment,
  RegenerateRecoveryCodes,
  Disable,
  Notices,
  MarkNoticesSeen,
  ListTrustedDevices,
  RevokeTrustedDevice,
  ListUserTrustedDevices,
  ListPasskeys,
  PasskeyRegistrationOptions,
  RegisterPasskey,
  DeletePasskey,
  ListUserPasskeys,
} from '../../../shared/contracts/mfa';

/** Every route carries `admin::isMfaEnabled`, which 404s before any handler runs. */
const mfaService = () => getService('mfa');

const { ValidationError } = errors;

type MfaService = ReturnType<typeof mfaService>;

/** Run *before* body validation, so no password or code attempt is spent on a request that can
 * never succeed. A passkey is never a user's only factor, hence the enrolment check. */
const assertPasskeyRegistrationAllowed = async (mfa: MfaService, userId: string): Promise<void> => {
  if (!(await mfa.passkeySettings()).enabled) {
    throw new ValidationError(PASSKEYS_DISABLED);
  }
  if (!(await mfa.isEnrolled(userId))) {
    throw new ValidationError(PASSKEY_NEEDS_TOTP);
  }
};

export default {
  async me(ctx: Context) {
    const mfa = mfaService();

    const user = ctx.state.user as AdminUser;
    const userId = String(user.id);
    const enrolled = await mfa.isEnrolled(userId);

    // The secret and otpauth URI are returned only by /mfa/enrol, once, and never again.
    ctx.body = {
      data: {
        enabled: enrolled,
        enabledAt: enrolled ? user.mfaEnabledAt : null,
        recoveryCodesRemaining: enrolled ? await mfa.countUnusedRecoveryCodes(userId) : 0,
        codesAcknowledged: enrolled ? await mfa.areCodesAcknowledged(userId) : false,
        required: await mfa.isMfaRequiredFor(user),
        graceUntil: user.mfaGraceUntil ? new Date(user.mfaGraceUntil).toISOString() : null,
        trustedDevicesEnabled: (await mfa.trustedDeviceSettings()).enabled,
        // Not the org policy alone: an IP-literal `admin.absoluteUrl` (the default production shape)
        // would otherwise advertise a section whose "Add a passkey" button cannot work.
        passkeysEnabled: (await mfa.passkeySettings()).enabled && mfa.passkeysConfigured(),
        // `ctx.state.user` is the raw row, so `password` is present whenever the account has one. The UI
        // reads this to know whether `updateSettings`' password-less exemption applies to this caller.
        hasLocalPassword: Boolean(user.password),
      },
    } satisfies Me.Response;
  },

  async enrol(ctx: Context) {
    const mfa = mfaService();

    await validateMfaEnrolInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as Enrol.Request['body'];

    const { secret, otpauthUri } = await mfa.beginEnrolment(
      String(ctx.state.user.id),
      password,
      code?.trim()
    );
    ctx.body = { data: { secret, otpauthUri } } satisfies Enrol.Response;
  },

  async verifyEnrolment(ctx: Context) {
    const mfa = mfaService();

    await validateMfaCodeInput(ctx.request.body ?? {});
    const { code } = ctx.request.body as VerifyEnrolment.Request['body'];
    const userId = String(ctx.state.user.id);

    const { recoveryCodes, replaced } = await mfa.completeEnrolment(userId, code);
    const event = replaced ? 'authenticator_replaced' : 'enabled';
    await mfa.recordEvent(userId, event, buildSessionMetadataFromContext(ctx));
    mfa.notify(userId, event);

    ctx.body = { data: { recoveryCodes, replaced } } satisfies VerifyEnrolment.Response;
  },

  async regenerateRecoveryCodes(ctx: Context) {
    const mfa = mfaService();

    await validateMfaPasswordAndCodeInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as RegenerateRecoveryCodes.Request['body'];
    const userId = String(ctx.state.user.id);

    await mfa.assertPasswordAndFactor(userId, password, code);
    const recoveryCodes = await mfa.issueRecoveryCodes(userId);

    ctx.body = { data: { recoveryCodes } } satisfies RegenerateRecoveryCodes.Response;
  },

  async acknowledgeRecoveryCodes(ctx: Context) {
    const mfa = mfaService();

    await mfa.acknowledgeCodes(String(ctx.state.user.id));
    ctx.status = 204;
  },

  async disable(ctx: Context) {
    const mfa = mfaService();

    // Before `assertPasswordAndFactor`: eviction is not optional for a disable, so a deployment that
    // cannot evict must not spend an attempt, let alone disable, and then fail on the step that matters.
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    // The profile hides the button; this refusal is what makes that more than cosmetic.
    if (await mfa.isMfaRequiredFor(ctx.state.user as AdminUser)) {
      throw new MfaRequiredError();
    }

    await validateMfaPasswordAndCodeInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as Disable.Request['body'];
    const userId = String(ctx.state.user.id);

    // Session authority alone is not enough: the session may be the thing the attacker has.
    await mfa.assertPasswordAndFactor(userId, password, code);
    await mfa.disable(userId);
    await mfa.recordEvent(userId, 'disabled', buildSessionMetadataFromContext(ctx));
    mfa.notify(userId, 'disabled');

    // By *device*, not by session row. `listSessions` returns only active rows, but a rotation leaves
    // the superseded row behind with its original `expiresAt`, and the auth strategy's
    // `isSessionActive` does not consult status -- so evicting only the active row would leave an
    // attacker's pre-rotation access token working until it expired on its own.
    // `invalidateRefreshToken(userId, deviceId)` deletes every row for the device instead.
    //
    // If `ctx.state.session` is absent or no longer in `listSessions`, fail closed and evict every
    // device rather than guess which is the caller's.
    const currentSessionId = (ctx.state.session as { id?: string } | undefined)?.id;
    const sessions = currentSessionId ? await sessionManager('admin').listSessions(userId) : [];
    const currentSession = sessions.find((session) => session.sessionId === currentSessionId);

    if (currentSession?.deviceId) {
      const otherDeviceIds = new Set(
        sessions
          .filter((session) => session.deviceId !== currentSession.deviceId)
          .map((session) => session.deviceId)
      );

      await Promise.all(
        Array.from(otherDeviceIds)
          .filter((deviceId): deviceId is string => Boolean(deviceId))
          .map((deviceId) => sessionManager('admin').invalidateRefreshToken(userId, deviceId))
      );
    } else {
      await sessionManager('admin').invalidateRefreshToken(userId);
    }

    ctx.status = 204;
  },

  async notices(ctx: Context) {
    const mfa = mfaService();

    ctx.body = {
      data: await mfa.unseenEvents(String(ctx.state.user.id)),
    } satisfies Notices.Response;
  },

  async markNoticesSeen(ctx: Context) {
    const mfa = mfaService();

    await validateMfaNoticesSeenInput(ctx.request.body ?? {});
    const { ids } = ctx.request.body as MarkNoticesSeen.Request['body'];

    await mfa.markEventsSeen(String(ctx.state.user.id), ids);
    ctx.status = 204;
  },

  /** 404 unknown user, 400 not locked. */
  async unlockUser(ctx: Context) {
    const mfa = mfaService();

    const { id } = ctx.params as { id: string };
    const target = await getService('user').findOne(id);
    if (!target) {
      return ctx.notFound('User does not exist');
    }

    const unlocked = await mfa.unlock(String(target.id), { byUserId: String(ctx.state.user.id) });
    if (!unlocked) {
      return ctx.badRequest('This account is not locked');
    }

    ctx.status = 204;
  },

  /**
   * The way back in for a user who lost their authenticator and spent their recovery codes;
   * without it the account is only recoverable from a shell, which a Cloud customer has not got.
   * 204 whether or not the target was enrolled: an account with no second factor already satisfies
   * the intent.
   */
  async resetUser(ctx: Context) {
    const mfa = mfaService();

    const { id } = ctx.params as { id: string };
    const target = await getService('user').findOne(id);
    if (!target) {
      return ctx.notFound('User does not exist');
    }

    await mfa.resetUser(String(target.id), { byUserId: String(ctx.state.user.id) });

    ctx.status = 204;
  },

  /** The service hashes the presented cookie to mark the current row; the hash never reaches the
   * response. */
  async listTrustedDevices(ctx: Context) {
    const mfa = mfaService();

    ctx.body = {
      data: await mfa.listTrustedDevices(
        String(ctx.state.user.id),
        ctx.cookies.get(MFA_TRUST_COOKIE_NAME)
      ),
    } satisfies ListTrustedDevices.Response;
  },

  async revokeTrustedDevice(ctx: Context) {
    const mfa = mfaService();

    // A non-integer id is a 500 on Postgres, not a miss.
    const { id } = ctx.params as RevokeTrustedDevice.Params;
    if (!/^\d+$/.test(id)) {
      return ctx.notFound('Trusted device not found');
    }

    const result = await mfa.revokeTrustedDevice(
      String(ctx.state.user.id),
      id,
      ctx.cookies.get(MFA_TRUST_COOKIE_NAME)
    );
    if (!result.revoked) {
      return ctx.notFound('Trusted device not found');
    }
    if (result.current) {
      clearTrustCookie(ctx);
    }

    ctx.status = 204;
  },

  async revokeAllTrustedDevices(ctx: Context) {
    const mfa = mfaService();

    await mfa.revokeAllTrustedDevices(String(ctx.state.user.id));
    // Unconditionally: whatever cookie this browser holds no longer matches a row.
    clearTrustCookie(ctx);

    ctx.status = 204;
  },

  /** `current` is meaningless when looking at another user's browsers, so it is stripped. */
  async listUserTrustedDevices(ctx: Context) {
    const mfa = mfaService();

    const { id } = ctx.params as { id: string };
    const target = await getService('user').findOne(id);
    if (!target) {
      return ctx.notFound('User does not exist');
    }

    const devices = await mfa.listTrustedDevices(String(target.id));
    ctx.body = {
      data: devices.map(({ id: rowId, deviceName, createdAt, expiresAt, lastUsedAt }) => ({
        id: rowId,
        deviceName,
        createdAt,
        expiresAt,
        lastUsedAt,
      })),
    } satisfies ListUserTrustedDevices.Response;
  },

  /** Security-positive, unlike a reset: it forces the second factor back on, so it is not an
   * escalation path. */
  async revokeUserTrustedDevices(ctx: Context) {
    const mfa = mfaService();

    const { id } = ctx.params as { id: string };
    const target = await getService('user').findOne(id);
    if (!target) {
      return ctx.notFound('User does not exist');
    }

    await mfa.revokeAllTrustedDevices(String(target.id), {
      byUserId: String(ctx.state.user.id),
    });

    ctx.status = 204;
  },

  /**
   * Costs the current password *and* a live second factor: the new credential satisfies every
   * future challenge on its own, so a stolen session plus the password would otherwise buy an
   * attacker permanent access with the victim's TOTP still working and nothing looking wrong.
   */
  async passkeyRegistrationOptions(ctx: Context) {
    const mfa = mfaService();

    const userId = String(ctx.state.user.id);
    await assertPasskeyRegistrationAllowed(mfa, userId);

    await validatePasskeyOptionsInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as PasskeyRegistrationOptions.Request['body'];

    // A wrong password charges neither throttle tier; a wrong code charges both. `admin::rateLimit`
    // bounds the password half.
    await mfa.assertPasswordAndFactor(userId, password, code.trim());

    const options = await mfa.passkeyRegistrationOptions(userId);

    ctx.body = { data: options } satisfies PasskeyRegistrationOptions.Response;
  },

  /** No password or code: the options route already authorised this ceremony, and it is single-use. */
  async registerPasskey(ctx: Context) {
    const mfa = mfaService();

    const userId = String(ctx.state.user.id);
    await assertPasskeyRegistrationAllowed(mfa, userId);

    await validateRegisterPasskeyInput(ctx.request.body ?? {});
    const { name, registration } = ctx.request.body as RegisterPasskey.Request['body'];

    ctx.body = {
      data: await mfa.registerPasskey(userId, name.trim(), registration),
    } satisfies RegisterPasskey.Response;
  },

  /** The caller's own passkeys. Empty while the policy is off (see the service). */
  async listPasskeys(ctx: Context) {
    const mfa = mfaService();

    ctx.body = {
      data: await mfa.listPasskeys(String(ctx.state.user.id)),
    } satisfies ListPasskeys.Response;
  },

  /** Works even when the policy is off: removing a credential is never the dangerous direction. */
  async deletePasskey(ctx: Context) {
    const mfa = mfaService();

    // Same guard as `revokeTrustedDevice`: a non-integer id is a 500 on Postgres, not a miss.
    const { id } = ctx.params as DeletePasskey.Params;
    if (!/^\d+$/.test(id)) {
      return ctx.notFound('Passkey not found');
    }

    const deleted = await mfa.deletePasskey(String(ctx.state.user.id), id);
    if (!deleted) {
      return ctx.notFound('Passkey not found');
    }

    ctx.status = 204;
  },

  /**
   * An administrator's view of another user's passkeys (route permission `admin::users.read`):
   * a count only. The user edit page needs a number, not an inventory of somebody's hardware.
   */
  async listUserPasskeys(ctx: Context) {
    const mfa = mfaService();

    const { id } = ctx.params as { id: string };
    const target = await getService('user').findOne(id);
    if (!target) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: { count: await mfa.countPasskeys(String(target.id)) },
    } satisfies ListUserPasskeys.Response;
  },

  /**
   * Administrator removal (route permission `admin::users.update`, the permission that already
   * lets an administrator reset another user's second factor -- so this is not an escalation).
   * `clearPasskeys` is deliberately silent, so the event and the notice are recorded here; the
   * owner's own `deletePasskey` records its own inside the service because only it sees the row's
   * name. Recorded only when something was actually removed, so an administrator acting on an
   * empty list leaves no notice behind, matching `revokeUserTrustedDevices`.
   */
  async deleteUserPasskeys(ctx: Context) {
    const mfa = mfaService();

    const { id } = ctx.params as { id: string };
    const target = await getService('user').findOne(id);
    if (!target) {
      return ctx.notFound('User does not exist');
    }

    const targetId = String(target.id);
    const byUserId = String(ctx.state.user.id);
    const count = await mfa.clearPasskeys(targetId);

    if (count > 0) {
      await mfa.recordEvent(targetId, 'passkey_removed', { byUserId, count });
      mfa.notify(targetId, 'passkey_removed', { byUserId, count });
    }

    ctx.status = 204;
  },
};
