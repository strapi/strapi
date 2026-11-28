'use client';

import type { TwoFactorAuthClient } from '@better-auth-ui/core/plugins/two-factor';
import { useAuth, useAuthPlugin } from '@better-auth-ui/react';
import { useGenerateBackupCodes } from '@better-auth-ui/react/plugins/two-factor';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { twoFactorPlugin } from '@/lib/auth/two-factor-plugin';
import { useTwoFactorPasswordRequirement } from '@/lib/auth/use-two-factor-password';
import { useAuthForm } from '../auth-form';
import { BackupCodes } from './backup-codes';

export type RegenerateBackupCodesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Replace the existing backup codes with a fresh set.
 *
 * The new codes are shown once, in component state only — closing the dialog
 * is the point of no return, which is why the copy button sits right there.
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Called when the dialog requests an open state change.
 */
export function RegenerateBackupCodesDialog({
  open,
  onOpenChange,
}: RegenerateBackupCodesDialogProps) {
  const { authClient, localization } = useAuth();
  const { localization: twoFactorLocalization } = useAuthPlugin(twoFactorPlugin);
  const { isPending: isResolvingPasswordRequirement, requiresPassword } =
    useTwoFactorPasswordRequirement();

  const [codes, setCodes] = useState<string[]>([]);

  const {
    mutateAsync: generateBackupCodes,
    isPending: isGenerating,
    reset: resetGeneration,
  } = useGenerateBackupCodes(authClient as TwoFactorAuthClient, {
    onSuccess: (data) => {
      setCodes(data.backupCodes);
      toast.success(twoFactorLocalization.backupCodesRegenerated);
    },
  });

  const isPending = isGenerating || isResolvingPasswordRequirement;

  const form = useAuthForm({
    defaultValues: { password: '' },
    onSubmit: async ({ value }) => {
      if (codes.length) {
        handleOpenChange(false);
        return;
      }
      await generateBackupCodes(requiresPassword ? { password: value.password } : {});
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setCodes([]);
      form.reset();
      // Clears the resolved backup codes from the mutation cache.
      resetGeneration();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <form.AppForm>
          <form.AuthFormRoot className="flex flex-col gap-6">
            <AlertDialogHeader>
              <AlertDialogMedia>
                <KeyRound />
              </AlertDialogMedia>

              <AlertDialogTitle>{twoFactorLocalization.backupCodes}</AlertDialogTitle>

              <AlertDialogDescription>
                {codes.length || !requiresPassword
                  ? twoFactorLocalization.backupCodesDescription
                  : twoFactorLocalization.passwordConfirmation}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {codes.length ? (
              <BackupCodes codes={codes} />
            ) : (
              requiresPassword && (
                <form.AppField name="password">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="regenerate-backup-codes-password">
                        {localization.auth.password}
                      </FieldLabel>

                      <Input
                        id="regenerate-backup-codes-password"
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
              )
            )}

            <AlertDialogFooter>
              {!codes.length && (
                <AlertDialogCancel disabled={isPending}>
                  {localization.settings.cancel}
                </AlertDialogCancel>
              )}

              <form.AuthFormSubmitButton isPending={isPending} disabled={isPending}>
                {codes.length
                  ? twoFactorLocalization.done
                  : twoFactorLocalization.regenerateBackupCodes}
              </form.AuthFormSubmitButton>
            </AlertDialogFooter>
          </form.AuthFormRoot>
        </form.AppForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
