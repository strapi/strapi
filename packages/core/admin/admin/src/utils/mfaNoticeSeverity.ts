import type { MfaNoticeType } from '../../../shared/contracts/mfa';

type MfaNoticeSeverity = 'risky' | 'info';

/**
 * How serious each notice is, which sets the security notice's colour (`warning` when any unseen
 * event is risky, otherwise `default`). Keyed on `MfaNoticeType`, so a new notice type does not
 * typecheck until it is classified here.
 *
 * Risky: something that could be an attacker, or that weakens the account. Info: housekeeping the
 * user or an administrator did, or a policy change.
 *
 * Two calls not in the design brief:
 * - `enabled` is risky. The notice feed never announces what the caller's own login did, so an
 *   `enabled` notice means *another* login enrolled the account, which locks the holder out of
 *   password-only login exactly as `authenticator_replaced` does.
 * - `locked` is info. It is the policy's consequence of not setting up in time, raised while the
 *   user cannot log in, so they only ever see it next to the `unlocked` that let them back in.
 */
const MFA_NOTICE_SEVERITY: Record<MfaNoticeType, MfaNoticeSeverity> = {
  challenge_failed: 'risky',
  recovery_code_used: 'risky',
  passkey_registered: 'risky',
  authenticator_replaced: 'risky',
  recovery_codes_regenerated: 'risky',
  disabled: 'risky',
  reset: 'risky',
  enabled: 'risky',
  device_trusted: 'info',
  device_trust_revoked: 'info',
  passkey_removed: 'info',
  unlocked: 'info',
  grace_started: 'info',
  locked: 'info',
};

const hasRiskyNotice = (notices: ReadonlyArray<{ type: MfaNoticeType }>): boolean =>
  notices.some((notice) => MFA_NOTICE_SEVERITY[notice.type] === 'risky');

export { MFA_NOTICE_SEVERITY, hasRiskyNotice };
export type { MfaNoticeSeverity };
