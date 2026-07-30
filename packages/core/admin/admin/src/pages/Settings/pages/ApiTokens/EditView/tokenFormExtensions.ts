import type * as React from 'react';

/**
 * Extension point: plugins can add extra fields to the API token create/edit
 * form (e.g. @strapi/plugin-spaces adds an "Available in workspaces" binding).
 * Same contract as the role form extensions (see
 * `../../Roles/roleFormExtensions.ts`): each extension owns one extra form
 * value, initialized from the fetched token and submitted with the
 * create/update body — the consuming plugin handles it server-side before the
 * admin's validation runs.
 */
interface TokenFormExtensionComponentProps {
  /** The token row as fetched by the edit page (may carry plugin-attached fields). */
  token: unknown;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}

interface TokenFormExtension {
  id: string;
  field: string;
  Component: React.ComponentType<TokenFormExtensionComponentProps>;
  getInitialValue?: (token: unknown) => unknown;
}

const tokenFormExtensions: TokenFormExtension[] = [];

export const registerTokenFormExtension = (extension: TokenFormExtension) => {
  const index = tokenFormExtensions.findIndex((item) => item.id === extension.id);
  if (index === -1) {
    tokenFormExtensions.push(extension);
  } else {
    tokenFormExtensions[index] = extension;
  }
};

export const getTokenFormExtensions = (): readonly TokenFormExtension[] => tokenFormExtensions;

export const getTokenFormExtensionInitialValues = (token: unknown): Record<string, unknown> =>
  tokenFormExtensions.reduce(
    (acc, extension) => ({
      ...acc,
      [extension.field]: extension.getInitialValue?.(token) ?? undefined,
    }),
    {}
  );

/**
 * The token submit handler builds its payload field by field — extension values
 * must be picked out of the form values explicitly and spread into the body.
 */
export const pickTokenFormExtensionValues = (
  values: Record<string, unknown>
): Record<string, unknown> =>
  tokenFormExtensions.reduce(
    (acc, extension) =>
      values[extension.field] === undefined
        ? acc
        : { ...acc, [extension.field]: values[extension.field] },
    {}
  );

export type { TokenFormExtension, TokenFormExtensionComponentProps };
