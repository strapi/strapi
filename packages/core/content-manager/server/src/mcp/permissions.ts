import { z } from '@strapi/utils';
import type { Core, Modules, Struct, UID } from '@strapi/types';

import { getService } from '../utils';
import type { ContentManagerModelForMcp } from './types';

/** Returns true if the content type identified by `uid` has the i18n `localized` plugin option enabled. */
export const isContentTypeLocalized = (strapi: Core.Strapi, uid: string): boolean => {
  const ct = strapi.contentTypes?.[uid as UID.ContentType];
  if (ct === undefined) return false;
  return (
    (ct as { pluginOptions?: { i18n?: { localized?: boolean } } }).pluginOptions?.i18n
      ?.localized === true
  );
};

const localeDefaultDescription = (
  defaultLocale: string | null,
  allowedLocales: readonly string[]
): string => {
  if (defaultLocale !== null && allowedLocales.includes(defaultLocale)) {
    return `Defaults to "${defaultLocale}".`;
  }

  return 'Defaults to the default locale.';
};

/**
 * Builds the base locale Zod schema for a derived MCP tool input.
 * When `localeCodes` is provided, constrains the field to a `z.enum` of available codes
 * with an optional default; otherwise falls back to a plain optional string.
 */
export const buildLocaleSchema = (
  localeCodes: [string, ...string[]] | null,
  defaultLocale: string | null
): z.ZodTypeAny => {
  if (localeCodes !== null && localeCodes.length > 0) {
    let schema: z.ZodTypeAny = z.enum(localeCodes).optional();

    if (defaultLocale !== null && localeCodes.includes(defaultLocale)) {
      schema = schema.default(defaultLocale);
    }

    return schema.describe(
      `Locale code. Available: ${localeCodes.join(', ')}. ${localeDefaultDescription(defaultLocale, localeCodes)}`
    );
  }

  return z
    .string()
    .optional()
    .describe('Locale code (e.g. "en", "fr"). Defaults to the default locale.');
};

/**
 * Narrows the base locale schema to only locales the session is permitted to access
 * for the given action + uid combination.
 *
 * Returns the base schema unchanged when:
 *   - localeCodes is null (i18n not installed)
 *   - the content type is not localized
 *   - all installed locales are permitted for this action
 *
 * Returns z.never().optional() when no locales are permitted, keeping the tool
 * registered but signalling no valid locale input.
 */
export const resolvePermittedLocaleSchema = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext,
  action: string,
  uid: string,
  localeCodes: [string, ...string[]] | null,
  defaultLocale: string | null,
  baseLocaleSchema: z.ZodTypeAny
): z.ZodTypeAny => {
  if (localeCodes === null) return baseLocaleSchema;

  const isLocalized = isContentTypeLocalized(strapi, uid);
  if (isLocalized === false) {
    return z.string().optional().describe('This content type is not localized. Locale is ignored.');
  }

  const permissionChecker = getService('permission-checker').create({
    userAbility: context.userAbility,
    model: uid,
  });
  const permitted = getPermittedLocales(permissionChecker, action, localeCodes);
  if (permitted === null) return baseLocaleSchema;
  if (permitted.length === 0) {
    return z.never().optional().describe('No locale access for this action.');
  }

  let schema: z.ZodTypeAny = z.enum(permitted).optional();

  if (defaultLocale !== null && permitted.includes(defaultLocale)) {
    schema = schema.default(defaultLocale);
  }

  return schema.describe(
    `Locale code. Permitted: ${permitted.join(', ')}. ${localeDefaultDescription(defaultLocale, permitted)}`
  );
};

/**
 * Recursively resolves leaf field paths for a component, matching the nested
 * path format used by CASL rules (e.g. 'SEO.title', 'SEO.og.image').
 *
 * The admin RBAC system decomposes component attrs into nested paths and removes
 * the parent key — so checking `ability.can(action, uid, 'SEO')` returns false
 * even when the user has full access to the component's sub-fields.
 */
export const getComponentLeafPaths = (
  strapi: Core.Strapi,
  componentUid: string,
  prefix: string,
  visited: Set<string> = new Set()
): string[] => {
  if (visited.has(componentUid) === true) return [prefix];

  type ComponentEntry = { attributes: Record<string, { type: string; component?: string }> };
  const component = (strapi.components as unknown as Record<string, ComponentEntry | undefined>)[
    componentUid
  ];
  if (component === undefined) return [prefix];

  visited.add(componentUid);
  const paths: string[] = [];

  for (const [key, attr] of Object.entries(component.attributes)) {
    if (key === 'id') {
      // skip system id field — it is not a user-facing permission path
      // eslint-disable-next-line no-continue
      continue;
    }
    const fieldPath = `${prefix}.${key}`;

    if (attr.type === 'component' && attr.component !== undefined) {
      paths.push(...getComponentLeafPaths(strapi, attr.component, fieldPath, visited));
    } else {
      paths.push(fieldPath);
    }
  }

  visited.delete(componentUid);

  return paths.length > 0 ? paths : [prefix];
};

/**
 * Returns the subset of attribute keys the session may access for `action` on `uid`.
 * Returns `null` when all fields are permitted (caller should skip field filtering).
 * Component attributes are resolved to their nested leaf paths before checking CASL rules.
 */
export const getPermittedFields = (
  strapi: Core.Strapi,
  userAbility: Modules.MCP.McpHandlerContext['userAbility'],
  action: string,
  uid: string,
  attributes: Struct.SchemaAttributes
): Set<string> | null => {
  const allKeys = Object.keys(attributes);
  const permitted = allKeys.filter((key) => {
    if (userAbility.can(action, uid, key) === true) return true;

    // Component attrs: CASL rules use nested paths (e.g. 'SEO.title').
    // Check if at least one sub-field path is permitted.
    const attr = attributes[key] as { type: string; component?: string };
    if (attr.type === 'component' && attr.component !== undefined) {
      const leafPaths = getComponentLeafPaths(strapi, attr.component, key);
      return leafPaths.some((path) => userAbility.can(action, uid, path) === true);
    }

    return false;
  });

  if (permitted.length === allKeys.length) {
    return null;
  }

  return new Set(permitted);
};

/**
 * Filters `localeCodes` to only those the session may access for `action`.
 * Returns `null` when all locales are permitted (caller should use the unfiltered base schema).
 * Returns an empty tuple-like array when no locale is permitted.
 */
export const getPermittedLocales = (
  permissionChecker: { cannot: (action: string, entity?: unknown) => boolean },
  action: string,
  localeCodes: [string, ...string[]]
): [string, ...string[]] | null => {
  const permitted = localeCodes.filter(
    (code) => permissionChecker.cannot(action, { locale: code }) === false
  );

  if (permitted.length === localeCodes.length) {
    return null;
  }

  return permitted.length > 0
    ? (permitted as [string, ...string[]])
    : ([] as unknown as [string, ...string[]]);
};

// Re-export for use in handler files (avoids needing to import from permissions in each handler)
export type { ContentManagerModelForMcp };
