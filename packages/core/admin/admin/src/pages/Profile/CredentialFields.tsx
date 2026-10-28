import * as React from 'react';

import { Field, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface CredentialFieldsProps {
  password: string;
  onPasswordChange: (value: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  /** `ConfirmDowngradeDialog` hides the code field for an unenrolled caller: the server asks such a
   * caller for the password alone. */
  requiresCode?: boolean;
  codeHint?: string;
}

/**
 * `maxLength={32}` matches the server schema's bound, loose enough for a TOTP code and a
 * dash-typed recovery code. Passed through untrimmed: the caller trims before submitting.
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
