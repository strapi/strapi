import type * as React from 'react';

/**
 * Extension point: plugins can add extra fields to the admin user invite/edit
 * forms (e.g. @strapi/plugin-spaces adds a "Workspaces" membership field).
 * Same contract as the role and token form extensions: each extension owns
 * one extra form value, initialized from the fetched user and submitted with
 * the create/update body — the consuming plugin handles it server-side before
 * the admin's validation runs.
 */
interface UserFormExtensionComponentProps {
  /** The user row as fetched by the edit page; `undefined` on the invite form. */
  user: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}

interface UserFormExtension {
  id: string;
  field: string;
  Component: React.ComponentType<UserFormExtensionComponentProps>;
  getInitialValue?: (user: unknown) => unknown;
}

const userFormExtensions: UserFormExtension[] = [];

export const registerUserFormExtension = (extension: UserFormExtension) => {
  const index = userFormExtensions.findIndex((item) => item.id === extension.id);
  if (index === -1) {
    userFormExtensions.push(extension);
  } else {
    userFormExtensions[index] = extension;
  }
};

export const getUserFormExtensions = (): readonly UserFormExtension[] => userFormExtensions;

export const getUserFormExtensionInitialValues = (user: unknown): Record<string, unknown> =>
  userFormExtensions.reduce(
    (acc, extension) => ({
      ...acc,
      [extension.field]: extension.getInitialValue?.(user) ?? undefined,
    }),
    {}
  );

export const pickUserFormExtensionValues = (
  values: Record<string, unknown>
): Record<string, unknown> =>
  userFormExtensions.reduce(
    (acc, extension) =>
      values[extension.field] === undefined
        ? acc
        : { ...acc, [extension.field]: values[extension.field] },
    {}
  );

export type { UserFormExtension, UserFormExtensionComponentProps };
