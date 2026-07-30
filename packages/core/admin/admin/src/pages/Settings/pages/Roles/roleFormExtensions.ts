import type * as React from 'react';

/**
 * Extension point: plugins can add extra fields to the admin role edit form
 * (e.g. @strapi/plugin-spaces adds an "Available in workspaces" binding).
 * Registration happens during a plugin's `register(app)` / `bootstrap(app)`,
 * always before the settings pages render, so plain module state is enough.
 *
 * Each extension owns one extra form value: `field` names the key merged into
 * the Formik values (initialized via `getInitialValue(role)`) and submitted
 * with the role update body — the consuming plugin is responsible for
 * stripping/handling it server-side before the admin's validation runs.
 */
interface RoleFormExtensionComponentProps {
  /** The role row as fetched by the edit page (may carry plugin-attached fields). */
  role: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
  /** True when the form is read-only (e.g. the super admin role). */
  disabled: boolean;
}

interface RoleFormExtension {
  id: string;
  field: string;
  Component: React.ComponentType<RoleFormExtensionComponentProps>;
  getInitialValue?: (role: unknown) => unknown;
}

const roleFormExtensions: RoleFormExtension[] = [];

export const registerRoleFormExtension = (extension: RoleFormExtension) => {
  const index = roleFormExtensions.findIndex((item) => item.id === extension.id);
  if (index === -1) {
    roleFormExtensions.push(extension);
  } else {
    roleFormExtensions[index] = extension;
  }
};

export const getRoleFormExtensions = (): readonly RoleFormExtension[] => roleFormExtensions;

export const getRoleFormExtensionInitialValues = (role: unknown): Record<string, unknown> =>
  roleFormExtensions.reduce(
    (acc, extension) => ({
      ...acc,
      [extension.field]: extension.getInitialValue?.(role) ?? undefined,
    }),
    {}
  );

export type { RoleFormExtension, RoleFormExtensionComponentProps };
