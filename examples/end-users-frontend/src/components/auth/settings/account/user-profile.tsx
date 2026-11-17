import {
  fieldsWithModelValues,
  getAdditionalFieldDefaultValues,
  getAdditionalFieldSubmitValues,
  validateStringLength,
} from '@better-auth-ui/core';
import type { UsernameAuthClient } from '@better-auth-ui/core/plugins/username';
import { useAuth, useSession, useUpdateUser } from '@better-auth-ui/react';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from 'cn';
import {
  getAuthAdditionalFieldValidators,
  isAuthFormFieldInvalid,
  useAuthForm,
} from '../../auth-form';
import { ChangeAvatar } from './change-avatar';

export type UserProfileProps = {
  className?: string;
};

/**
 * Render a profile card that lets the authenticated user view and update their display name, username, and avatar.
 *
 * @param className - Optional additional CSS class names applied to the card container
 * @returns A JSX element containing the profile card with avatar upload and editable name/username fields
 */
export function UserProfile({ className }: UserProfileProps) {
  const { additionalFields, authClient, avatar, localization, profile } =
    useAuth<UsernameAuthClient>();
  const { data: session } = useSession(authClient);

  const { mutateAsync: updateUser, isPending } = useUpdateUser(authClient, {
    onSuccess: () => toast.success(localization.settings.profileUpdatedSuccess),
  });

  const profileFields = useMemo(
    () => additionalFields?.filter((field) => field.profile !== false) ?? [],
    [additionalFields]
  );
  const hasProfileFields =
    profile.name || profileFields.some((field) => field.inputType !== 'hidden');
  const form = useAuthForm({
    defaultValues: {
      additionalFields: getAdditionalFieldDefaultValues(profileFields),
      name: '',
    },
    onSubmit: async ({ value }) => {
      await updateUser({
        ...(profile.name && { name: value.name }),
        ...getAdditionalFieldSubmitValues(profileFields, value.additionalFields),
      });
    },
  });

  useEffect(() => {
    if (!session) return;
    form.reset({
      additionalFields: getAdditionalFieldDefaultValues(
        fieldsWithModelValues(profileFields, session.user as Record<string, unknown>)
      ),
      name: session.user.name,
    });
  }, [form, profileFields, session]);

  if (!avatar.enabled && !hasProfileFields) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">{localization.settings.userProfile}</h2>

      <form.AppForm>
        <form.AuthFormRoot>
          <Card className={cn(className)}>
            <CardContent className="flex flex-col gap-6">
              <ChangeAvatar />

              {profile.name && (
                <form.AppField
                  name="name"
                  validators={{
                    onChange: ({ value }) =>
                      validateStringLength(value, {
                        requiredMessage: localization.auth.fieldRequired,
                        trim: true,
                      }),
                  }}
                >
                  {(field) => {
                    const isInvalid = isAuthFormFieldInvalid(field.state.meta);

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="name">{localization.auth.name}</FieldLabel>

                        {session ? (
                          <Input
                            id="name"
                            name={field.name}
                            autoComplete="name"
                            placeholder={localization.auth.name}
                            disabled={isPending}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            aria-invalid={isInvalid}
                          />
                        ) : (
                          <Skeleton>
                            <Input className="invisible" />
                          </Skeleton>
                        )}

                        <field.AuthFormFieldError />
                      </Field>
                    );
                  }}
                </form.AppField>
              )}

              {profileFields.map((configuredField) => {
                if (!session) {
                  if (configuredField.inputType === 'hidden') {
                    return null;
                  }

                  return (
                    <Skeleton key={configuredField.name}>
                      <Input className="invisible" />
                    </Skeleton>
                  );
                }

                return (
                  <form.AppField
                    key={configuredField.name}
                    name={`additionalFields.${configuredField.name}`}
                    validators={getAuthAdditionalFieldValidators(
                      configuredField,
                      localization.auth.fieldRequired
                    )}
                  >
                    {(field) => (
                      <field.AuthFormAdditionalField
                        field={configuredField}
                        isPending={isPending}
                      />
                    )}
                  </form.AppField>
                );
              })}
            </CardContent>

            {hasProfileFields && (
              <CardFooter>
                <form.AuthFormSubmitButton size="sm" disabled={isPending || !session}>
                  {localization.settings.saveChanges}
                </form.AuthFormSubmitButton>
              </CardFooter>
            )}
          </Card>
        </form.AuthFormRoot>
      </form.AppForm>
    </div>
  );
}
