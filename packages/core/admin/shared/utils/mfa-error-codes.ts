/**
 * Stable codes carried in `error.details.code` by the two-factor errors a user can actually hit.
 *
 * The server's message stays English and stays the fallback, but the admin panel maps each code to
 * a translated string (`hooks/useToMessage.ts`), so copy can change on either side without breaking
 * the other and a non-English panel stops showing English errors. Keyed on a code rather than on
 * the message text for the same reason `Login.tsx` keys `MfaLockedError` on its `name`.
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
  /** A concurrent save changed what this one would relax. */
  SETTINGS_CONFLICT: 'SECURITY_SETTINGS_CONFLICT',
} as const;

export type MfaErrorCode = (typeof MFA_ERROR_CODES)[keyof typeof MFA_ERROR_CODES];
