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

    await validateMfaPasswordAndCodeInput(ctx.request.body ?? {});
    const { password, code } = ctx.request.body as Disable.Request['body'];
    const userId = String(ctx.state.user.id);

    // Password AND an existing factor. Session authority alone is not enough: the session may be
    // the thing the attacker has.
    await mfa.assertPasswordAndFactor(userId, password, code);
    await mfa.disable(userId);
    await mfa.recordEvent(userId, 'disabled', buildSessionMetadataFromContext(ctx));

    // Evict every other session: disable is exactly the attacker-holds-a-session scenario, so the
    // account must not be left reachable through a session minted before this request.
    const sessionManager = getSessionManager();
    if (sessionManager) {
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
