import * as React from 'react';

import { Field, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface CredentialFieldsProps {
  password: string;
  onPasswordChange: (value: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  /**
   * Whether to render the code field at all. `ConfirmDowngradeDialog` hides it for a caller who
   * is not enrolled -- the server asks such a caller for the password alone.
   */
  requiresCode?: boolean;
  /** Optional hint under the code field. Only the downgrade dialog sets one. */
  codeHint?: string;
}

/**
 * The password-plus-code pair every re-authentication surface asks for: `/mfa/disable`,
 * `/mfa/recovery-codes`, `/mfa/passkeys/options` and a security-settings downgrade all take the
 * same `{ password, code }`, so they all rendered the same two fields -- byte-identically, in four
 * separate files.
 *
 * `maxLength={32}` matches the server schema's bound, which is deliberately loose enough for both
 * a 6-8 digit TOTP code and a 10-character recovery code typed with dashes. The value is passed
 * through untrimmed: the caller trims before submitting, because the server treats a code with
 * surrounding whitespace as valid and the field must not fight that.
 */
const CredentialFields = ({
  password,
  onPasswordChange,
  code,
  onCodeChange,
  requiresCode = true,
  codeHint,
}: CredentialFieldsProps) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Field.Root name="password" required>
        <Field.Label>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.enrol.password.label',
            defaultMessage: 'Current password',
          })}
        </Field.Label>
        <TextInput
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPasswordChange(e.target.value)}
        />
      </Field.Root>
      {requiresCode ? (
        <Field.Root name="code" required hint={codeHint}>
          <Field.Label>
            {formatMessage({
              id: 'Auth.form.mfa.code.label',
              defaultMessage: 'Authentication code',
            })}
          </Field.Label>
          <TextInput
            autoComplete="one-time-code"
            maxLength={32}
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCodeChange(e.target.value)}
          />
          {codeHint ? <Field.Hint /> : null}
        </Field.Root>
      ) : null}
    </>
  );
};

export { CredentialFields };
export type { CredentialFieldsProps };
