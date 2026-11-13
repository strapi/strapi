import { createQrCodeSvgData } from '@better-auth-ui/core';
import type { TwoFactorAuthClient, TwoFactorMethod } from '@better-auth-ui/core/plugins/two-factor';
import { useAuth, useAuthPlugin, useCopyToClipboard } from '@better-auth-ui/react';
import { useEnableTwoFactor, useVerifyTotp } from '@better-auth-ui/react/plugins/two-factor';
import { Check, Copy, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { twoFactorPlugin } from '@/lib/auth/two-factor-plugin';
import { useTwoFactorPasswordRequirement } from '@/lib/auth/use-two-factor-password';
import { submitAuthForm, useAuthForm } from '../auth-form';
import { OtpField } from '../otp-field';
import { BackupCodes } from './backup-codes';

type EnrollmentStep = 'password' | 'verify' | 'backupCodes';

export type EnableTwoFactorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Two-factor enrollment with authenticator-app and delivered-code methods.
 *
 * TOTP continues through QR verification and backup-code capture. OTP becomes
 * active as soon as Better Auth accepts the enrollment request.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Called when the dialog requests an open state change.
 */
export function EnableTwoFactorDialog({ open, onOpenChange }: EnableTwoFactorDialogProps) {
  const { authClient, localization } = useAuth();
  const {
    codeLength,
    enrollmentMethods,
    localization: twoFactorLocalization,
  } = useAuthPlugin(twoFactorPlugin);
  const { isPending: isResolvingPasswordRequirement, requiresPassword } =
    useTwoFactorPasswordRequirement();

  const twoFactorClient = authClient as TwoFactorAuthClient;

  const [step, setStep] = useState<EnrollmentStep>('password');
  const [method, setMethod] = useState<TwoFactorMethod>(enrollmentMethods[0] ?? 'totp');
  const [totpUri, setTotpUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const {
    copied: setupKeyCopied,
    copy: copySetupKeyValue,
    reset: resetSetupKeyCopy,
  } = useCopyToClipboard({
    onError: () => toast.error(twoFactorLocalization.setupKeyCopyFailed),
  });

  const qrCode = useMemo(() => (totpUri ? createQrCodeSvgData(totpUri) : null), [totpUri]);

  // Manual entry fallback for authenticator apps that can't scan. The URI is
  // an `otpauth://` URL, so the secret is just a query parameter.
  const setupKey = useMemo(() => {
    if (!totpUri) return null;

    try {
      return new URL(totpUri).searchParams.get('secret');
    } catch {
      return null;
    }
  }, [totpUri]);

  const copySetupKey = async () => {
    if (!setupKey) return;

    await copySetupKeyValue(setupKey);
  };

  const {
    mutateAsync: enableTwoFactor,
    isPending: isEnabling,
    reset: resetEnrollment,
  } = useEnableTwoFactor(twoFactorClient, {
    onSuccess: (data) => {
      if (data.method === 'otp') {
        toast.success(twoFactorLocalization.twoFactorEnabled);
        handleOpenChange(false);
        return;
      }

      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    },
  });

  const { mutateAsync: verifyTotp, isPending: isVerifying } = useVerifyTotp(twoFactorClient, {
    onError: () => form.setFieldValue('code', ''),
    onSuccess: () => {
      toast.success(twoFactorLocalization.twoFactorEnabled);
      if (backupCodes.length) setStep('backupCodes');
      else handleOpenChange(false);
    },
  });

  const isPending = isEnabling || isVerifying || isResolvingPasswordRequirement;

  const form = useAuthForm({
    defaultValues: { code: '', password: '' },
    onSubmit: async ({ value }) => {
      if (step === 'backupCodes') {
        handleOpenChange(false);
        return;
      }
      if (step === 'verify') {
        await verifyCode(value.code);
        return;
      }
      await enableTwoFactor(requiresPassword ? { method, password: value.password } : { method });
    },
  });

  const verifyCode = async (completedCode: string) => {
    if (isPending || step !== 'verify' || completedCode.length !== codeLength) {
      return;
    }

    await verifyTotp({ code: completedCode });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setStep('password');
      setMethod(enrollmentMethods[0] ?? 'totp');
      setTotpUri('');
      setBackupCodes([]);
      form.reset();
      resetSetupKeyCopy();
      // Clears the resolved TOTP URI and backup codes from the mutation cache.
      resetEnrollment();
    }
  };

  const submitLabel =
    step === 'backupCodes'
      ? twoFactorLocalization.done
      : step === 'verify'
        ? twoFactorLocalization.verify
        : twoFactorLocalization.enableTwoFactor;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form.AppForm>
          <form.AuthFormRoot className="flex flex-col gap-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck />
                {twoFactorLocalization.twoFactor}
              </DialogTitle>

              <DialogDescription>
                {step === 'password' && requiresPassword
                  ? twoFactorLocalization.passwordConfirmation
                  : step === 'verify'
                    ? twoFactorLocalization.scanQrCode
                    : twoFactorLocalization.twoFactorDescription}
              </DialogDescription>
            </DialogHeader>

            {step === 'password' && (
              <div className="flex flex-col gap-4">
                {enrollmentMethods.length > 1 && (
                  <Tabs
                    value={method}
                    onValueChange={(value) => setMethod(value as TwoFactorMethod)}
                  >
                    <TabsList
                      aria-label={twoFactorLocalization.chooseEnrollmentMethod}
                      className="w-full"
                    >
                      {enrollmentMethods.includes('totp') && (
                        <TabsTrigger value="totp">
                          <Smartphone aria-hidden="true" className="text-muted-foreground" />
                          {twoFactorLocalization.authenticatorApp}
                        </TabsTrigger>
                      )}
                      {enrollmentMethods.includes('otp') && (
                        <TabsTrigger value="otp">
                          <Mail aria-hidden="true" className="text-muted-foreground" />
                          {twoFactorLocalization.deliveredCode}
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                )}

                <p className="text-muted-foreground text-sm">
                  {method === 'totp'
                    ? twoFactorLocalization.authenticatorAppDescription
                    : twoFactorLocalization.deliveredCodeDescription}
                </p>

                {requiresPassword && (
                  <form.AppField name="password">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor="two-factor-password">
                          {localization.auth.password}
                        </FieldLabel>

                        <Input
                          id="two-factor-password"
                          name={field.name}
                          type="password"
                          autoComplete="current-password"
                          autoFocus
                          required
                          placeholder={localization.auth.passwordPlaceholder}
                          disabled={isPending}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />

                        <FieldError />
                      </Field>
                    )}
                  </form.AppField>
                )}
              </div>
            )}

            {step === 'verify' && (
              <div className="flex flex-col items-center gap-4">
                {qrCode && (
                  <svg
                    aria-hidden="true"
                    className="size-44 rounded-md border"
                    viewBox={`0 0 ${qrCode.size} ${qrCode.size}`}
                  >
                    <path fill="white" d={`M0 0h${qrCode.size}v${qrCode.size}H0z`} />
                    <path fill="black" d={qrCode.path} shapeRendering="crispEdges" />
                  </svg>
                )}

                {setupKey && (
                  <Field className="w-full gap-1">
                    <FieldLabel
                      className="text-muted-foreground text-xs"
                      htmlFor="two-factor-setup-key"
                    >
                      {twoFactorLocalization.setupKey}
                    </FieldLabel>

                    <InputGroup>
                      <InputGroupInput
                        className="font-mono text-xs"
                        id="two-factor-setup-key"
                        readOnly
                        value={setupKey}
                      />

                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          aria-label={
                            setupKeyCopied
                              ? twoFactorLocalization.setupKeyCopied
                              : localization.settings.copyToClipboard
                          }
                          onClick={copySetupKey}
                          size="icon-xs"
                        >
                          {setupKeyCopied ? <Check /> : <Copy />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                )}

                <form.AppField name="code">
                  {(field) => (
                    <OtpField
                      autoFocus
                      className="w-full"
                      disabled={isPending}
                      label={twoFactorLocalization.authenticatorCode}
                      length={codeLength}
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onComplete={() => void submitAuthForm(form)}
                    />
                  )}
                </form.AppField>
              </div>
            )}

            {step === 'backupCodes' && <BackupCodes codes={backupCodes} />}

            <form.AuthFormServerError />

            <DialogFooter>
              {step !== 'backupCodes' && (
                <DialogClose
                  className={buttonVariants({ variant: 'outline' })}
                  disabled={isPending}
                  type="button"
                >
                  {localization.settings.cancel}
                </DialogClose>
              )}

              <form.Subscribe selector={(state) => state.values.code}>
                {(code) => (
                  <form.AuthFormSubmitButton
                    isPending={isPending}
                    disabled={isPending || (step === 'verify' && code.length !== codeLength)}
                  >
                    {submitLabel}
                  </form.AuthFormSubmitButton>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form.AuthFormRoot>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
