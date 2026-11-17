'use client';

import {
  getAuthLinkURL,
  isPasswordCompromisedError,
  validateMatchingValue,
  validateStringLength,
} from '@better-auth-ui/core';
import { useAuth, useResetPassword } from '@better-auth-ui/react';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from 'cn';
import { isAuthFormFieldInvalid, useAuthForm } from './auth-form';
import { PasswordStrengthMeter } from './password-strength-meter';

export type ResetPasswordProps = {
  className?: string;
};

/**
 * Render a password reset form that validates the reset token from the URL, accepts a new password (and optional confirmation), and submits it to the auth client.
 *
 * The component checks for a `token` query parameter on mount and, if missing, shows an error toast and navigates to the sign-in page. It exposes per-field validation messages, toggles for password visibility, and disables inputs while the reset request is pending.
 *
 * @returns The password reset form UI ready to be mounted in the app layout.
 */
export function ResetPassword({ className }: ResetPasswordProps) {
  const {
    authClient,
    basePaths,
    emailAndPassword,
    localization,
    navigate,
    redirectTo,
    viewPaths,
    Link,
  } = useAuth();
  const signInURL = getAuthLinkURL(`${basePaths.auth}/${viewPaths.auth.signIn}`, redirectTo);

  const { mutateAsync: resetPassword, isPending } = useResetPassword(authClient, {
    onError: (error) => {
      // The haveIBeenPwned plugin rejects on the password itself, so it
      // belongs against the field rather than in a toast.
      if (isPasswordCompromisedError(error)) {
        setIsCompromised(true);
      }
    },
    onSuccess: () => {
      toast.success(localization.auth.passwordResetSuccess);
      navigate({ to: signInURL });
    },
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isCompromised, setIsCompromised] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') as string;

    if (!token) {
      toast.error(localization.auth.invalidResetPasswordToken);
      navigate({ to: signInURL });
    }
  }, [localization.auth.invalidResetPasswordToken, navigate, signInURL]);

  const form = useAuthForm({
    defaultValues: { confirmPassword: '', password: '' },
    onSubmit: async ({ value }) => {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token') as string;

      if (!token) {
        toast.error(localization.auth.invalidResetPasswordToken);
        navigate({ to: signInURL });
        return;
      }

      try {
        await resetPassword({ token, newPassword: value.password });
      } catch {
        // The mutation reports the error through its configured handler.
      }
    },
  });

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{localization.auth.resetPassword}</CardTitle>
      </CardHeader>

      <CardContent>
        <form.AppForm>
          <form.AuthFormRoot>
            <FieldGroup>
              <form.AppField
                name="password"
                validators={{
                  onChange: ({ value }) =>
                    validateStringLength(value, {
                      maxLength: emailAndPassword?.maxPasswordLength,
                      maxLengthMessage: localization.auth.tooLong.replace(
                        '{{max}}',
                        String(emailAndPassword?.maxPasswordLength)
                      ),
                      minLength: emailAndPassword?.minPasswordLength,
                      minLengthMessage: localization.auth.tooShort.replace(
                        '{{min}}',
                        String(emailAndPassword?.minPasswordLength)
                      ),
                      requiredMessage: localization.auth.fieldRequired,
                    }),
                }}
              >
                {(field) => {
                  const isInvalid = isAuthFormFieldInvalid(field.state.meta) || isCompromised;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="password">{localization.auth.password}</FieldLabel>

                      <InputGroup>
                        <InputGroupInput
                          id="password"
                          type={isPasswordVisible ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder={localization.auth.newPasswordPlaceholder}
                          required
                          minLength={emailAndPassword?.minPasswordLength}
                          maxLength={emailAndPassword?.maxPasswordLength}
                          disabled={isPending}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            setIsCompromised(false);
                          }}
                          aria-invalid={isInvalid}
                          value={field.state.value}
                        />

                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            size="icon-xs"
                            aria-label={
                              isPasswordVisible
                                ? localization.auth.hidePassword
                                : localization.auth.showPassword
                            }
                            title={
                              isPasswordVisible
                                ? localization.auth.hidePassword
                                : localization.auth.showPassword
                            }
                            onClick={() => {
                              setIsPasswordVisible((visible) => !visible);
                            }}
                          >
                            {isPasswordVisible ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>

                      {isCompromised ? (
                        <FieldError>{localization.auth.passwordCompromised}</FieldError>
                      ) : (
                        <field.AuthFormFieldError />
                      )}

                      <PasswordStrengthMeter password={field.state.value} />
                    </Field>
                  );
                }}
              </form.AppField>

              {emailAndPassword?.confirmPassword && (
                <form.AppField
                  name="confirmPassword"
                  validators={{
                    onChangeListenTo: ['password'],
                    onChange: ({ fieldApi, value }) =>
                      validateStringLength(value, {
                        maxLength: emailAndPassword?.maxPasswordLength,
                        maxLengthMessage: localization.auth.tooLong.replace(
                          '{{max}}',
                          String(emailAndPassword?.maxPasswordLength)
                        ),
                        minLength: emailAndPassword?.minPasswordLength,
                        minLengthMessage: localization.auth.tooShort.replace(
                          '{{min}}',
                          String(emailAndPassword?.minPasswordLength)
                        ),
                        requiredMessage: localization.auth.fieldRequired,
                      }) ??
                      validateMatchingValue(
                        value,
                        fieldApi.form.getFieldValue('password'),
                        localization.auth.passwordsDoNotMatch
                      ),
                  }}
                >
                  {(field) => {
                    const isInvalid = isAuthFormFieldInvalid(field.state.meta);

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="confirmPassword">
                          {localization.auth.confirmPassword}
                        </FieldLabel>

                        <InputGroup>
                          <InputGroupInput
                            id="confirmPassword"
                            name={field.name}
                            type={isConfirmPasswordVisible ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder={localization.auth.confirmPasswordPlaceholder}
                            required
                            minLength={emailAndPassword?.minPasswordLength}
                            maxLength={emailAndPassword?.maxPasswordLength}
                            disabled={isPending}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            aria-invalid={isInvalid}
                            value={field.state.value}
                          />

                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              size="icon-xs"
                              aria-label={
                                isConfirmPasswordVisible
                                  ? localization.auth.hidePassword
                                  : localization.auth.showPassword
                              }
                              title={
                                isConfirmPasswordVisible
                                  ? localization.auth.hidePassword
                                  : localization.auth.showPassword
                              }
                              onClick={() => {
                                setIsConfirmPasswordVisible((visible) => !visible);
                              }}
                            >
                              {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>

                        <field.AuthFormFieldError />
                      </Field>
                    );
                  }}
                </form.AppField>
              )}

              <div className="flex flex-col gap-3">
                <form.AuthFormSubmitButton disabled={isPending}>
                  {localization.auth.resetPassword}
                </form.AuthFormSubmitButton>
              </div>
            </FieldGroup>
          </form.AuthFormRoot>
        </form.AppForm>

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          <FieldDescription className="text-center">
            {localization.auth.rememberYourPassword}{' '}
            <Link
              href={getAuthLinkURL(`${basePaths.auth}/${viewPaths.auth.signIn}`, redirectTo)}
              className="underline underline-offset-4"
            >
              {localization.auth.signIn}
            </Link>
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  );
}
