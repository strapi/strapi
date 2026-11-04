import { type MessageDescriptor, useIntl } from 'react-intl';

import { MFA_ERROR_CODES, type MfaErrorCode } from '../../../shared/utils/mfa-error-codes';
import { BaseQueryError, isBaseQueryError } from '../utils/baseQuery';

import { useAPIErrorHandler } from './useAPIErrorHandler';

import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Translated copy for the two-factor errors a user can actually hit, keyed on the stable
 * `details.code` the server sends. The server's English message stays the fallback for anything
 * not listed here, so a code added on the server degrades to today's behaviour rather than to
 * nothing.
 */
const CODE_MESSAGES: Record<MfaErrorCode, MessageDescriptor> = {
  [MFA_ERROR_CODES.INVALID_CODE]: {
    id: 'Auth.form.mfa.error.invalidCode',
    defaultMessage:
      'That code was not accepted. Codes change every 30 seconds. Wait for the next one and try again, or use a recovery code.',
  },
  [MFA_ERROR_CODES.NO_ENROLMENT]: {
    id: 'Settings.profile.form.section.mfa.error.noEnrolment',
    defaultMessage: 'This setup session expired. Close this and start again.',
  },
  [MFA_ERROR_CODES.SECRET_UNREADABLE]: {
    id: 'Auth.form.mfa.error.secretUnreadable',
    defaultMessage:
      'Your two-factor secret could not be read. Use a recovery code to log in, or ask an administrator to reset two-factor authentication for your account.',
  },
  [MFA_ERROR_CODES.NO_LOCAL_PASSWORD]: {
    id: 'Settings.profile.form.section.mfa.error.noPassword',
    defaultMessage:
      'You log in through single sign-on, so two-factor authentication is managed by your identity provider.',
  },
  [MFA_ERROR_CODES.NO_LOCAL_PASSWORD_DOWNGRADE]: {
    id: 'Settings.security.mfa.error.noPasswordDowngrade',
    defaultMessage:
      'Your account has no password, so it cannot lower two-factor requirements. Ask an administrator who logs in with a password.',
  },
  [MFA_ERROR_CODES.ENROL_FIRST]: {
    id: 'Settings.security.mfa.enrolFirst',
    defaultMessage:
      'Set up two-factor authentication on your own account before requiring it for others.',
  },
  [MFA_ERROR_CODES.UNKNOWN_ROLE]: {
    id: 'Settings.security.mfa.error.unknownRole',
    defaultMessage: 'One of the selected roles no longer exists. Reload the page and try again.',
  },
  [MFA_ERROR_CODES.NO_ENCRYPTION_KEY]: {
    id: 'Settings.security.mfa.error.noEncryptionKey',
    defaultMessage:
      'Two-factor authentication cannot be required yet: nobody could set it up, because the server has no encryption key. Set ENCRYPTION_KEY and restart the server.',
  },
  [MFA_ERROR_CODES.REAUTH_REQUIRED]: {
    id: 'Settings.permissions.users.mfa.reauth.required',
    defaultMessage: 'Confirm your own password, and a code if you use two-factor authentication.',
  },
  [MFA_ERROR_CODES.SUPER_ADMIN_TARGET]: {
    id: 'Settings.permissions.users.mfa.superAdminOnly',
    defaultMessage: 'Only a super admin can change the two-factor settings of a super admin.',
  },
  [MFA_ERROR_CODES.SETTINGS_CONFLICT]: {
    id: 'Settings.security.mfa.error.conflict',
    defaultMessage:
      'Someone else changed the two-factor settings while you were saving. Review the current settings and try again.',
  },
  [MFA_ERROR_CODES.LOCKED]: {
    id: 'Auth.form.mfa.locked.message',
    defaultMessage:
      'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.',
  },
  [MFA_ERROR_CODES.REQUIRED]: {
    id: 'Settings.profile.form.section.mfa.disable.required',
    defaultMessage:
      'Two-factor authentication is required for your account and cannot be disabled.',
  },
};

const codeOf = (err: BaseQueryError): MfaErrorCode | undefined => {
  const code = (err as { details?: { code?: unknown } }).details?.code;
  return typeof code === 'string' && code in CODE_MESSAGES ? (code as MfaErrorCode) : undefined;
};

type CodeMessageOverrides = Partial<Record<MfaErrorCode, MessageDescriptor>>;

/** A `SerializedError` (a thrown exception, not a server response) carries nothing safe to show
 * verbatim, so it falls back to a generic message. `overrides` lets one call site word a code
 * for its own context, such as the setup step where a recovery code is no use. */
const useMfaErrorMessage = () => {
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  return (err: BaseQueryError | SerializedError, overrides?: CodeMessageOverrides) => {
    if (!isBaseQueryError(err)) {
      return formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' });
    }
    const code = codeOf(err);
    return code ? formatMessage(overrides?.[code] ?? CODE_MESSAGES[code]) : formatAPIError(err);
  };
};

export { useMfaErrorMessage };
