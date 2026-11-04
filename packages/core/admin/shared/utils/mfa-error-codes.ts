/**
 * Stable codes carried in `error.details.code` by the two-factor errors a user can actually hit.
 *
 * The server's message stays English and stays the fallback, but the admin panel maps each code to
 * a translated string (`hooks/useToMessage.ts`), so copy can change on either side without breaking
 * the other and a non-English panel stops showing English errors. Keyed on a code rather than on
 * the message text.
 */
export const MFA_ERROR_CODES = {
  /** Wrong, expired, skewed or already-spent code. Deliberately one code, not several. */
  INVALID_CODE: 'MFA_INVALID_CODE',
  /** The pending enrolment is gone: it expired, or a disable landed mid-flow. */
  NO_ENROLMENT: 'MFA_NO_ENROLMENT',
  /** The stored secret could not be decrypted, usually after the encryption key changed. */
  SECRET_UNREADABLE: 'MFA_SECRET_UNREADABLE',
  /** An account with no local password tried to manage a second factor. */
  NO_LOCAL_PASSWORD: 'MFA_NO_LOCAL_PASSWORD',
  /** A password-less caller tried to lower enforcement. */
  NO_LOCAL_PASSWORD_DOWNGRADE: 'MFA_NO_LOCAL_PASSWORD_DOWNGRADE',
  /** The caller tried to require two-factor authentication without having it themselves. */
  ENROL_FIRST: 'MFA_ENROL_FIRST',
  /** A selected role was deleted while the settings page was open. */
  UNKNOWN_ROLE: 'SECURITY_SETTINGS_UNKNOWN_ROLE',
  /** Raising enforcement while no one could enrol: the admin encryption key is not configured. */
  NO_ENCRYPTION_KEY: 'SECURITY_SETTINGS_NO_ENCRYPTION_KEY',
  /** An administrator acting on another user's second factor did not present their own
   * password (and code, when they have a second factor). */
  REAUTH_REQUIRED: 'MFA_REAUTH_REQUIRED',
  /** A non-super-admin tried to reset, unlock or strip the passkeys of a super admin. */
  SUPER_ADMIN_TARGET: 'MFA_SUPER_ADMIN_TARGET',
  /** A concurrent save changed what this one would relax. */
  SETTINGS_CONFLICT: 'SECURITY_SETTINGS_CONFLICT',
  /** The enrolment grace period ran out: password login is refused until an administrator unlocks. */
  LOCKED: 'MFA_LOCKED',
  /** The account must keep two-factor authentication, so it cannot be disabled. */
  REQUIRED: 'MFA_REQUIRED',
} as const;

export type MfaErrorCode = (typeof MFA_ERROR_CODES)[keyof typeof MFA_ERROR_CODES];
