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
  /**
   * A refusal from the server. It reads in the error slot of the field the user retypes: the code
   * when there is one (the dialogs clear it and keep the password), the password otherwise. That
   * field takes focus each time a new error arrives, so the user lands where they fix it.
   */
  error?: string;
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
  error,
}: CredentialFieldsProps) => {
  const { formatMessage } = useIntl();
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const codeRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (error) {
      (requiresCode ? codeRef : passwordRef).current?.focus();
    }
  }, [error, requiresCode]);

  const passwordError = requiresCode ? undefined : error;
  const codeError = requiresCode ? error : undefined;

  return (
    <>
      <Field.Root name="password" required error={passwordError}>
        <Field.Label>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.enrol.password.label',
            defaultMessage: 'Current password',
          })}
        </Field.Label>
        <TextInput
          ref={passwordRef}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPasswordChange(e.target.value)}
        />
        <Field.Error />
      </Field.Root>
      {requiresCode ? (
        <Field.Root name="code" required hint={codeHint} error={codeError}>
          <Field.Label>
            {formatMessage({
              id: 'Auth.form.mfa.code.label',
              defaultMessage: 'Authentication code',
            })}
          </Field.Label>
          <TextInput
            ref={codeRef}
            autoComplete="one-time-code"
            maxLength={32}
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCodeChange(e.target.value)}
          />
          {codeHint ? <Field.Hint /> : null}
          <Field.Error />
        </Field.Root>
      ) : null}
    </>
  );
};

export { CredentialFields };
export type { CredentialFieldsProps };
