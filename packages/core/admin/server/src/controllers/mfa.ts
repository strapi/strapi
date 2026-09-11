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

/**
 * Every route in this controller carries `admin::isMfaEnabled`, which 404s before the handler
 * runs, so a handler that is executing already knows the feature is on.
 */
const mfaService = () => getService('mfa');

const { ValidationError } = errors;

type MfaService = ReturnType<typeof mfaService>;

/**
 * The two checks both registration routes make, in order: the organisation must offer
 * passkeys at all, and the caller must already hold a TOTP factor -- a passkey is never a user's
 * only factor, so `isEnrolled` keeps meaning "holds a TOTP factor". Run *before* body
 * validation: no password or code attempt should be spent on a request that can never succeed.
 */
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

    // The secret and otpauth URI are deliberately absent: they are returned only by /mfa/enrol,
    // once, and never surfaced again anywhere -- including here.
    ctx.body = {
      data: {
        enabled: enrolled,
        enabledAt: enrolled ? user.mfaEnabledAt : null,
        recoveryCodesRemaining: enrolled ? await mfa.countUnusedRecoveryCodes(userId) : 0,
        codesAcknowledged: enrolled ? await mfa.areCodesAcknowledged(userId) : false,
        // Enforcement: whether policy requires this account to be enrolled, and the deadline stamped
        // by `enforce` at the first session it applied to. The grace banner reads these.
        required: await mfa.isMfaRequiredFor(user),
        graceUntil: user.mfaGraceUntil ? new Date(user.mfaGraceUntil).toISOString() : null,
        // Trusted devices: the profile renders its trusted-devices list only when the organisation
        // offers trust at all.
        trustedDevicesEnabled: (await mfa.trustedDeviceSettings()).enabled,
        // Passkeys: the profile decides whether to render the passkey section from this; the list
        // endpoint stays the source of truth for the rows. Not the org policy alone: the
        // default production deployment (an IP-literal `admin.absoluteUrl`) would otherwise
        // advertise a section whose "Add a passkey" button cannot work. `passkeysConfigured`
        // swallows the RP refusal into a boolean, so this can never 500 on a misconfiguration.
        passkeysEnabled: (await mfa.passkeySettings()).enabled && mfa.passkeysConfigured(),
        // `ctx.state.user` is the raw `admin::user` row the
        // auth strategy loaded (`strategies/admin.ts`), so `password` is present whenever the
        // account has one -- an SSO-only administrator's is `null`/`undefined`. `PasskeysCard`
        // reads this to know whether the server's password-less exemption in `updateSettings`
        // could ever apply to this caller.
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

    // The shared re-authentication gate: current password plus a still-working second factor.
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

    // Checked before anything else runs, including `assertPasswordAndFactor`: eviction is not
    // optional for a disable, so a deployment that cannot evict sessions must not be allowed to
    // spend the caller's password/code attempt, let alone actually turn two-factor authentication
    // off, only to fail on the step that matters most for the threat this endpoint exists for.
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    // A required account cannot turn its second factor off: the profile section
    // hides the button, and this refusal is what makes that more than cosmetic. Checked before
    // validation so no password/code attempt is spent on a request that can never succeed.
    if (await mfa.isMfaRequiredFor(ctx.state.user as AdminUser)) {
      throw new MfaRequiredError();
    }

    await validateMfaPasswordAndCodeInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as Disable.Request['body'];
    const userId = String(ctx.state.user.id);

    // Password AND an existing factor. Session authority alone is not enough: the session may be
    // the thing the attacker has.
    await mfa.assertPasswordAndFactor(userId, password, code);
    await mfa.disable(userId);
    await mfa.recordEvent(userId, 'disabled', buildSessionMetadataFromContext(ctx));
    mfa.notify(userId, 'disabled');

    // Evict every OTHER *device* -- not by session row, and not this one. `listSessions` only
    // ever returns active rows, but a refresh rotation leaves the just-superseded row behind as
    // `status: 'rotated'` with its original `expiresAt` intact, and `isSessionActive` (the only
    // check the admin auth strategy applies to an access token) does not consult status -- so an
    // attacker holding an access token minted before their session rotated would keep
    // authenticating with it, unrevoked, until it expired on its own, if only the active row for
    // their device were removed. `invalidateRefreshToken(userId, deviceId)` deletes every row for
    // that device, active or rotated, closing that gap. The one row this deliberately never
    // touches is a rotated row on the *caller's own* device -- acceptable, since that device is
    // the legitimate admin's.
    //
    // `ctx.state.session` is set by the admin auth strategy from the access token backing this
    // very request; if it is absent, or its session id is not (any longer) in `listSessions`,
    // fail closed and evict every device rather than guess which one is the caller's.
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

  /**
   * Administrator unlock of an account locked by enforcement. Route-level permission
   * `admin::users.update` (the people who can deactivate a user). 404 unknown user, 400 not locked.
   */
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
   * Strips another administrator's second factor and evicts their sessions. The way back in for
   * a user who has lost their authenticator and spent their recovery codes; without it that
   * account is only recoverable from a shell, which a Cloud customer does not have.
   *
   * 204 whether or not the target was enrolled: the caller's intent is "this account must end up
   * with no second factor", and an account that already has none satisfies it. Reporting 400 for
   * an unenrolled target would make the UI's job harder for no gain, and would leak enrolment
   * state to a caller who can already read it from the user record anyway.
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

  /**
   * Trusted devices. The caller's trusted browsers; the presented cookie (if any) marks the current one.
   * The service hashes it, the hash never reaches the response.
   */
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

    // Row ids are integers; anything else can only ever be a 404, and asking the database to
    // compare an integer column against arbitrary text is a 500 on Postgres rather than a miss.
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

  /**
   * An administrator's view of another user's trusted browsers (route permission
   * `admin::users.read`). `current` is meaningless to someone looking at another user's
   * browsers, so it is stripped.
   */
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

  /**
   * Administrator revocation (route permission `admin::users.update`, the same people who can
   * deactivate a user). Security-positive, unlike an admin reset: it forces the second factor
   * back on, so it is not an escalation path. 404 for an unknown user.
   */
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
   * Passkeys. Start a registration ceremony. Costs the current password *and* a live second factor
   * (the same gate `/mfa/disable` and `/mfa/recovery-codes` use): under the factor model
   * the new credential satisfies every future challenge on its own, so an attacker holding a
   * stolen session plus the password would otherwise register their own authenticator and log in
   * forever, with the victim's TOTP still working so nothing looks wrong. Password-only would be
   * a weaker gate on a stronger operation.
   */
  async passkeyRegistrationOptions(ctx: Context) {
    const mfa = mfaService();

    const userId = String(ctx.state.user.id);
    await assertPasskeyRegistrationAllowed(mfa, userId);

    await validatePasskeyOptionsInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as PasskeyRegistrationOptions.Request['body'];

    // A wrong password throws `Invalid credentials` and charges neither throttle tier (it is not
    // a second-factor attempt); `assertFactor` inside charges both for a wrong code and throws
    // `RateLimitError` when the account is throttled. `admin::rateLimit` bounds the password half.
    await mfa.assertPasswordAndFactor(userId, password, code.trim());

    const options = await mfa.passkeyRegistrationOptions(userId);

    // Passed straight through: the contract's `data` is now the same
    // `PublicKeyCredentialCreationOptionsJSON` the service returns, not the earlier
    // `Record<string, unknown>`, so no spread is needed to satisfy it.
    ctx.body = { data: options } satisfies PasskeyRegistrationOptions.Response;
  },

  /**
   * Finish the ceremony. No password or code: the ceremony the browser is completing was already
   * authorised above, and it is single-use.
   */
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

  /**
   * Remove one of the caller's own. Works even when the policy is off -- removing a credential is
   * never the dangerous direction.
   */
  async deletePasskey(ctx: Context) {
    const mfa = mfaService();

    // Row ids are integers; anything else can only ever be a 404, and asking the database to
    // compare an integer column against arbitrary text is a 500 on Postgres rather than a miss.
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
   * empty list leaves no notice behind (trusted devices's precedent).
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
