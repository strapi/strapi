import { getViewURL, validateEmailAddress } from '@better-auth-ui/core';
import { useAuth, useFetchOptions, useRequestPasswordReset } from '@better-auth-ui/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';
import { isAuthFormFieldInvalid, useAuthForm } from './auth-form';
import { RESET_LINK_SENT_STORAGE_KEY } from './reset-link-sent';

export type ForgotPasswordProps = {
  className?: string;
};

/**
 * Render a card-based "Forgot Password" form that sends a password-reset email.
 *
 * The form displays an email input, submit button, and a link back to sign-in.
 * After a successful request the submitted email is stored in `sessionStorage`
 * and the user is redirected to the reset-link-sent view, which offers to open
 * their email provider.
 *
 * @param className - Optional additional CSS class names applied to the card
 * @returns The forgot-password form UI as a JSX element
 */
export function ForgotPassword({ className }: ForgotPasswordProps) {
  const { authClient, baseURL, basePaths, localization, navigate, plugins, viewPaths, Link } =
    useAuth();

  const { fetchOptions, resetFetchOptions } = useFetchOptions();

  const { mutateAsync: requestPasswordReset, isPending } = useRequestPasswordReset(authClient, {
    onError: () => {
      resetFetchOptions();
    },
    onSuccess: (_data, { email }) => {
      sessionStorage.setItem(RESET_LINK_SENT_STORAGE_KEY, email);
      navigate({ to: `${basePaths.auth}/${viewPaths.auth.resetLinkSent}` });
    },
  });

  const form = useAuthForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) =>
      await requestPasswordReset({
        email: value.email,
        redirectTo: getViewURL(baseURL, basePaths.auth, viewPaths.auth.resetPassword),
        fetchOptions,
      }),
  });

  const Captcha = plugins.find((plugin) => plugin.captchaComponent)?.captchaComponent;

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{localization.auth.forgotPassword}</CardTitle>
      </CardHeader>

      <CardContent>
        <form.AppForm>
          <form.AuthFormRoot>
            <FieldGroup>
              <form.AppField
                name="email"
                validators={{
                  onChange: ({ value }) =>
                    validateEmailAddress(value, {
                      invalidMessage: localization.auth.invalidEmail,
                      requiredMessage: localization.auth.fieldRequired,
                    }),
                }}
              >
                {(field) => {
                  const isInvalid = isAuthFormFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="email">{localization.auth.email}</FieldLabel>
                      <Input
                        id="email"
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        placeholder={localization.auth.emailPlaceholder}
                        required
                        disabled={isPending}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={isInvalid}
                      />
                      <field.AuthFormFieldError />
                    </Field>
                  );
                }}
              </form.AppField>

              {Captcha && <div className="flex justify-center">{Captcha}</div>}

              <div className="flex flex-col gap-3">
                <form.AuthFormSubmitButton isPending={isPending} disabled={isPending}>
                  {localization.auth.sendResetLink}
                </form.AuthFormSubmitButton>
              </div>
            </FieldGroup>
          </form.AuthFormRoot>
        </form.AppForm>

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          <FieldDescription className="text-center">
            {localization.auth.rememberYourPassword}{' '}
            <Link
              href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
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
