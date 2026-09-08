import type { Context } from 'koa';
import { getService } from '../utils';
import {
  validateMfaEnrolInput,
  validateMfaCodeInput,
  validateMfaPasswordAndCodeInput,
  validateMfaNoticesSeenInput,
} from '../validation/authentication/mfa';
import {
  getSessionManager,
  buildSessionMetadataFromContext,
  MFA_TRUST_COOKIE_NAME,
  clearTrustCookie,
} from '../../../shared/utils/session-auth';
import { MfaRequiredError } from '../services/mfa-errors';

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
} from '../../../shared/contracts/mfa';

/**
 * The flag is checked per request, not cached, so toggling it does not require a route rebuild:
 * flag off means no route below responds at all, matching every other MFA endpoint.
 */
export const requireEnabled = (ctx: Context) => {
  const mfa = getService('mfa');
  if (!mfa.isEnabled()) {
    ctx.notFound();
    return null;
  }
  return mfa;
};

export default {
  async me(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
        // Cycle 2: whether policy requires this account to be enrolled, and the deadline stamped
        // by `enforce` at the first session it applied to. The grace banner reads these.
        required: await mfa.isMfaRequiredFor(user),
        graceUntil: user.mfaGraceUntil ? new Date(user.mfaGraceUntil).toISOString() : null,
        // Cycle 3: the profile renders its trusted-devices list only when the organisation
        // offers trust at all.
        trustedDevicesEnabled: (await mfa.trustedDeviceSettings()).enabled,
      },
    } satisfies Me.Response;
  },

  async enrol(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    await validateMfaPasswordAndCodeInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as RegenerateRecoveryCodes.Request['body'];
    const userId = String(ctx.state.user.id);

    // The shared re-authentication gate: current password plus a still-working second factor.
    await mfa.assertPasswordAndFactor(userId, password, code);
    const recoveryCodes = await mfa.issueRecoveryCodes(userId);

    ctx.body = { data: { recoveryCodes } } satisfies RegenerateRecoveryCodes.Response;
  },

  async acknowledgeRecoveryCodes(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    await mfa.acknowledgeCodes(String(ctx.state.user.id));
    ctx.status = 204;
  },

  async disable(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    // Checked before anything else runs, including `assertPasswordAndFactor`: eviction is not
    // optional for a disable, so a deployment that cannot evict sessions must not be allowed to
    // spend the caller's password/code attempt, let alone actually turn two-factor authentication
    // off, only to fail on the step that matters most for the threat this endpoint exists for.
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    // A required account cannot turn its second factor off (spec "Guard"): the profile section
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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    ctx.body = {
      data: await mfa.unseenEvents(String(ctx.state.user.id)),
    } satisfies Notices.Response;
  },

  async markNoticesSeen(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
   * Cycle 3. The caller's trusted browsers; the presented cookie (if any) marks the current one.
   * The service hashes it, the hash never reaches the response.
   */
  async listTrustedDevices(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    ctx.body = {
      data: await mfa.listTrustedDevices(
        String(ctx.state.user.id),
        ctx.cookies.get(MFA_TRUST_COOKIE_NAME)
      ),
    } satisfies ListTrustedDevices.Response;
  },

  async revokeTrustedDevice(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

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
};
