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
} from '../../../shared/utils/session-auth';

import type {
  Me,
  Enrol,
  VerifyEnrolment,
  RegenerateRecoveryCodes,
  Disable,
  Notices,
  MarkNoticesSeen,
} from '../../../shared/contracts/mfa';

/**
 * The flag is checked per request, not cached, so toggling it does not require a route rebuild:
 * flag off means no route below responds at all, matching every other MFA endpoint.
 */
const requireEnabled = (ctx: Context) => {
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

    const userId = String(ctx.state.user.id);
    const enrolled = await mfa.isEnrolled(userId);

    // The secret and otpauth URI are deliberately absent: they are returned only by /mfa/enrol,
    // once, and never surfaced again anywhere -- including here.
    ctx.body = {
      data: {
        enabled: enrolled,
        enabledAt: enrolled ? ctx.state.user.mfaEnabledAt : null,
        recoveryCodesRemaining: enrolled ? await mfa.countUnusedRecoveryCodes(userId) : 0,
        codesAcknowledged: enrolled ? await mfa.areCodesAcknowledged(userId) : false,
      },
    } satisfies Me.Response;
  },

  async enrol(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    await validateMfaEnrolInput(ctx.request.body ?? {});
    const { password } = ctx.request.body as Enrol.Request['body'];

    const { secret, otpauthUri } = await mfa.beginEnrolment(String(ctx.state.user.id), password);
    ctx.body = { data: { secret, otpauthUri } } satisfies Enrol.Response;
  },

  async verifyEnrolment(ctx: Context) {
    const mfa = requireEnabled(ctx);
    if (!mfa) return;

    await validateMfaCodeInput(ctx.request.body ?? {});
    const { code } = ctx.request.body as VerifyEnrolment.Request['body'];
    const userId = String(ctx.state.user.id);

    const { recoveryCodes } = await mfa.completeEnrolment(userId, code);
    await mfa.recordEvent(userId, 'enabled', buildSessionMetadataFromContext(ctx));
    mfa.notify(userId, 'enabled');

    ctx.body = { data: { recoveryCodes } } satisfies VerifyEnrolment.Response;
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
};
