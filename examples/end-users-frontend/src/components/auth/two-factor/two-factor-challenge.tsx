import { authQueryKeys, validateStringLength } from '@better-auth-ui/core';
import type { TwoFactorAuthClient } from '@better-auth-ui/core/plugins/two-factor';
import { useAuth, useAuthPlugin, useSession } from '@better-auth-ui/react';
import {
  useSendTwoFactorOtp,
  useVerifyBackupCode,
  useVerifyTotp,
  useVerifyTwoFactorOtp,
} from '@better-auth-ui/react/plugins/two-factor';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  clearTwoFactorMethods,
  readTwoFactorMethods,
  type TwoFactorMethod,
} from '@/lib/auth/two-factor-methods';
import { twoFactorPlugin } from '@/lib/auth/two-factor-plugin';
import { RESEND_COOLDOWN_SECONDS, useResendCooldown } from '@/lib/auth/use-resend-cooldown';
import { cn } from 'cn';
import { runAuthFormAction, submitAuthForm, useAuthForm } from '../auth-form';
import { OtpField } from '../otp-field';
import { useIsHydrated } from '../use-is-hydrated';

/** Challenge surfaces the view can render, in the order they are offered. */
type ChallengeMethod = TwoFactorMethod | 'backup';

export type TwoFactorChallengeProps = {
  className?: string;
};

/**
 * Second-factor challenge that finishes a pending sign-in.
 *
 * Better Auth answers a password sign-in with `twoFactorRedirect` instead of
 * a session, and the shared sign-in continuation sends the browser here with
 * the enabled methods in session storage. Verifying is what creates the
 * session, after which the original `redirectTo` is resumed.
 *
 * @param className - Additional CSS classes applied to the card.
 */
export function TwoFactorChallenge({ className }: TwoFactorChallengeProps) {
  const { authClient, basePaths, localization, navigate, redirectTo, viewPaths, Link } = useAuth();
  const {
    backupCodes: backupCodesEnabled,
    codeLength,
    localization: twoFactorLocalization,
    trustDevice: trustDeviceEnabled,
  } = useAuthPlugin(twoFactorPlugin);

  const twoFactorClient = authClient as TwoFactorAuthClient;
  const session = useSession(authClient);
  const queryClient = useQueryClient();
  const isHydrated = useIsHydrated();

  const [methods, setMethods] = useState<TwoFactorMethod[]>(() =>
    isHydrated ? readTwoFactorMethods() : ['totp', 'otp']
  );
  const [method, setMethod] = useState<ChallengeMethod>(() => methods[0] ?? 'totp');
  const [otpRequested, setOtpRequested] = useState(false);
  const { cooldown, isCoolingDown, startCooldown } = useResendCooldown();

  useEffect(() => {
    const stored = readTwoFactorMethods();
    setMethods(stored);
    setMethod(stored[0] ?? 'totp');
  }, []);

  const onVerified = async () => {
    clearTwoFactorMethods();
    await queryClient.invalidateQueries({
      queryKey: authQueryKeys.listSessions(session.data?.user.id),
    });
    navigate({ to: redirectTo });
  };

  const { mutateAsync: sendTwoFactorOtp, isPending: isSendingOtp } = useSendTwoFactorOtp(
    twoFactorClient,
    {
      onSuccess: () => {
        setOtpRequested(true);
        startCooldown(RESEND_COOLDOWN_SECONDS);
      },
    }
  );

  const { mutateAsync: verifyTotp, isPending: isVerifyingTotp } = useVerifyTotp(twoFactorClient, {
    onError: () => form.setFieldValue('code', ''),
    onSuccess: onVerified,
  });

  const { mutateAsync: verifyTwoFactorOtp, isPending: isVerifyingOtp } = useVerifyTwoFactorOtp(
    twoFactorClient,
    {
      onError: () => form.setFieldValue('code', ''),
      onSuccess: onVerified,
    }
  );

  const { mutateAsync: verifyBackupCode, isPending: isVerifyingBackupCode } = useVerifyBackupCode(
    twoFactorClient,
    { onSuccess: onVerified }
  );

  const isPending = isSendingOtp || isVerifyingTotp || isVerifyingOtp || isVerifyingBackupCode;
  const needsOtpRequest = method === 'otp' && !otpRequested;

  const form = useAuthForm({
    defaultValues: { backupCode: '', code: '', trustDevice: false },
    onSubmit: async ({ value }) => {
      const trust = trustDeviceEnabled ? { trustDevice: value.trustDevice } : {};
      if (method === 'backup') {
        await verifyBackupCode({ code: value.backupCode.trim(), ...trust });
        return;
      }
      await verifyCode(value.code);
    },
  });

  const switchMethod = (next: ChallengeMethod) => {
    form.setFieldValue('code', '');
    form.setFieldValue('backupCode', '');
    setMethod(next);
  };

  const verifyCode = async (completedCode: string) => {
    if (
      isPending ||
      needsOtpRequest ||
      method === 'backup' ||
      completedCode.length !== codeLength
    ) {
      return;
    }

    const trust = trustDeviceEnabled ? { trustDevice: form.state.values.trustDevice } : {};

    if (method === 'otp') {
      await verifyTwoFactorOtp({ code: completedCode, ...trust });
      return;
    }

    await verifyTotp({ code: completedCode, ...trust });
  };

  const description =
    method === 'backup'
      ? twoFactorLocalization.backupCodeDescription
      : method === 'otp'
        ? twoFactorLocalization.emailedCodeDescription
        : twoFactorLocalization.authenticatorCodeDescription;

  const alternatives: { key: ChallengeMethod; label: string }[] = [
    ...(method !== 'totp' && methods.includes('totp')
      ? [
          {
            key: 'totp' as const,
            label: twoFactorLocalization.useAuthenticator,
          },
        ]
      : []),
    ...(method !== 'otp' && methods.includes('otp')
      ? [{ key: 'otp' as const, label: twoFactorLocalization.useEmailedCode }]
      : []),
    ...(method !== 'backup' && backupCodesEnabled
      ? [{ key: 'backup' as const, label: twoFactorLocalization.useBackupCode }]
      : []),
  ];

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardHeader>
        <CardTitle className="text-xl">{twoFactorLocalization.twoFactor}</CardTitle>

        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <form.AppForm>
          <form.AuthFormRoot>
            <FieldGroup>
              {method === 'backup' ? (
                <form.AppField
                  name="backupCode"
                  validators={{
                    onChange: ({ value }) =>
                      validateStringLength(value, {
                        requiredMessage: localization.auth.fieldRequired,
                        trim: true,
                      }),
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="backupCode">
                        {twoFactorLocalization.backupCode}
                      </FieldLabel>

                      <Input
                        id="backupCode"
                        name={field.name}
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        disabled={isPending}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    </Field>
                  )}
                </form.AppField>
              ) : (
                <form.AppField name="code">
                  {(field) => (
                    <OtpField
                      autoFocus
                      disabled={isPending || needsOtpRequest}
                      label={
                        method === 'otp'
                          ? twoFactorLocalization.emailedCode
                          : twoFactorLocalization.authenticatorCode
                      }
                      length={codeLength}
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onComplete={() => void submitAuthForm(form)}
                    />
                  )}
                </form.AppField>
              )}

              {trustDeviceEnabled && (
                <form.AppField name="trustDevice">
                  {(field) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        id="trustDevice"
                        name={field.name}
                        checked={field.state.value}
                        disabled={isPending}
                        onCheckedChange={(checked) => field.handleChange(checked === true)}
                      />

                      <FieldLabel htmlFor="trustDevice" className="font-normal">
                        {twoFactorLocalization.trustDevice}
                      </FieldLabel>
                    </Field>
                  )}
                </form.AppField>
              )}

              <form.AuthFormServerError />

              <div className="flex flex-col gap-3">
                {needsOtpRequest ? (
                  <Button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={() => void runAuthFormAction(form, () => sendTwoFactorOtp())}
                  >
                    {isSendingOtp && <Spinner />}

                    {twoFactorLocalization.sendEmailCode}
                  </Button>
                ) : (
                  <form.Subscribe selector={(state) => state.values.code}>
                    {(code) => (
                      <form.AuthFormSubmitButton
                        isPending={isPending}
                        disabled={isPending || (method !== 'backup' && code.length !== codeLength)}
                      >
                        {twoFactorLocalization.verify}
                      </form.AuthFormSubmitButton>
                    )}
                  </form.Subscribe>
                )}

                {method === 'otp' && otpRequested && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || isCoolingDown}
                    onClick={() => void runAuthFormAction(form, () => sendTwoFactorOtp())}
                  >
                    {isCoolingDown
                      ? localization.auth.resendIn.replace('{{seconds}}', String(cooldown))
                      : localization.auth.resend}
                  </Button>
                )}

                {alternatives.map((alternative) => (
                  <Button
                    type="button"
                    variant="ghost"
                    key={alternative.key}
                    disabled={isPending}
                    onClick={() => switchMethod(alternative.key)}
                  >
                    {alternative.label}
                  </Button>
                ))}
              </div>
            </FieldGroup>
          </form.AuthFormRoot>
        </form.AppForm>

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          <FieldDescription className="text-center">
            <Link
              href={`${basePaths.auth}/${viewPaths.auth.signIn}`}
              className="underline underline-offset-4"
            >
              {twoFactorLocalization.backToSignIn}
            </Link>
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  );
}
