import type { ExtractionKind } from './types';

/** Open-ended ids: English comes from defaultMessage, not en.json. */
const SCHEMA_DRIVEN_MESSAGE_ID_PATTERNS: RegExp[] = [
  /^content-manager\.content-types\./,
  /^content-manager\.components\./,
];

const SCHEMA_DRIVEN_JSON_KEY_PATTERNS: RegExp[] = [/\.no-override$/];

const namespacesCache = new WeakMap<Set<string>, Set<string>>();

/** Top-level `foo.` namespaces present in core/admin en.json (derived, not hand-listed). */
export const adminNamespacesFromKeys = (adminEnKeys: Set<string>): Set<string> => {
  const cached = namespacesCache.get(adminEnKeys);

  if (cached) {
    return cached;
  }

  const namespaces = new Set<string>();

  for (const key of adminEnKeys) {
    const dot = key.indexOf('.');

    if (dot > 0) {
      namespaces.add(key.slice(0, dot + 1));
    }
  }

  namespacesCache.set(adminEnKeys, namespaces);

  return namespaces;
};

export const isAdminMessageId = (messageId: string, adminEnKeys: Set<string>) => {
  const dot = messageId.indexOf('.');

  if (dot <= 0) {
    return false;
  }

  return adminNamespacesFromKeys(adminEnKeys).has(messageId.slice(0, dot + 1));
};

export const toJsonKey = (rawId: string, pluginPrefix: string | null): string => {
  if (!pluginPrefix) {
    return rawId;
  }

  const prefix = `${pluginPrefix}.`;

  if (rawId.startsWith(prefix)) {
    return rawId.slice(prefix.length);
  }

  return rawId;
};

export const toMessageId = (
  jsonKey: string,
  pluginPrefix: string | null,
  adminEnKeys: Set<string>
): string => {
  if (!pluginPrefix || isAdminMessageId(jsonKey, adminEnKeys)) {
    return jsonKey;
  }

  if (jsonKey.startsWith(`${pluginPrefix}.`)) {
    return jsonKey;
  }

  return `${pluginPrefix}.${jsonKey}`;
};

export const resolveTargetBundle = (
  rawId: string,
  pluginPrefix: string | null,
  pluginEnKeys: Set<string>,
  adminEnKeys: Set<string>
): 'core/admin' | 'self' => {
  // core/admin: local en.json is the admin catalog (cross-package 'core/admin' is plugins-only).
  if (!pluginPrefix) {
    return 'self';
  }

  const jsonKey = toJsonKey(rawId, pluginPrefix);

  if (pluginEnKeys.has(jsonKey)) {
    return 'self';
  }

  if (adminEnKeys.has(rawId) || adminEnKeys.has(jsonKey)) {
    return 'core/admin';
  }

  if (isAdminMessageId(rawId, adminEnKeys) || isAdminMessageId(jsonKey, adminEnKeys)) {
    return 'core/admin';
  }

  return 'self';
};

export const classifyDynamicPattern = (
  jsonKeyPattern: string,
  messageIdPattern: string,
  propertyName?: string
): { kind: ExtractionKind; note?: string } => {
  if (
    propertyName === 'error' ||
    propertyName?.startsWith('errors.') ||
    propertyName === 'errorMessage'
  ) {
    return { kind: 'error-passthrough', note: 'Validation error id passthrough' };
  }

  if (
    propertyName === 'uid' ||
    propertyName === 'category' ||
    propertyName === 'value' ||
    propertyName === 'headerId' ||
    propertyName === 'titleId' ||
    propertyName === 'defaultTabId' ||
    propertyName === 'linkLabel'
  ) {
    return { kind: 'schema-driven', note: `Dynamic id from ${propertyName}` };
  }

  if (propertyName === 'name' && jsonKeyPattern.includes('displayName')) {
    return { kind: 'schema-driven', note: 'Content-type display name' };
  }

  if (
    SCHEMA_DRIVEN_MESSAGE_ID_PATTERNS.some((pattern) => pattern.test(messageIdPattern)) ||
    SCHEMA_DRIVEN_JSON_KEY_PATTERNS.some((pattern) => pattern.test(jsonKeyPattern))
  ) {
    return { kind: 'schema-driven', note: 'User/schema-defined translation id' };
  }

  if (jsonKeyPattern.includes('${') || messageIdPattern.includes('${')) {
    return { kind: 'finite-enum', note: 'Template literal — expand from en.json via pattern' };
  }

  return { kind: 'static' };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Expand a template like `attribute.${type}` against en.json keys.
 * Prefers one path-segment per hole; falls back to multi-segment if needed
 * (e.g. `popUpWarning.bodyMessage.${type}` with dotted types).
 */
export const expandTemplateToJsonKeys = (
  template: string,
  enKeys: string[],
  pluginPrefix: string | null
): string[] => {
  const jsonTemplate = toJsonKey(template, pluginPrefix);

  if (!jsonTemplate.includes('${')) {
    return [jsonTemplate];
  }

  const parts = jsonTemplate.split(/\$\{[^}]+\}/);
  const build = (hole: string) => new RegExp(`^${parts.map(escapeRegExp).join(hole)}$`);

  const oneSegmentMatches = enKeys.filter((key) => build('([^.]+)').test(key));

  if (oneSegmentMatches.length > 0) {
    return oneSegmentMatches;
  }

  return enKeys.filter((key) => build('(.+)').test(key));
};

export const resolveMessageId = (
  rawId: string,
  pluginPrefix: string | null,
  pluginEnKeys: Set<string>,
  adminEnKeys: Set<string>,
  fromHelper = false
): { messageId: string; targetBundle: 'core/admin' | 'self' } => {
  const jsonKey = toJsonKey(rawId, pluginPrefix);

  if (fromHelper) {
    // Some plugins store keys already prefixed in en.json (e.g. color-picker.description)
    // while getTrad(id) still adds the plugin prefix at runtime. Prefer the raw helper
    // argument when it exists in en.json so jsonKey lookup stays correct after one strip.
    if (pluginPrefix && pluginEnKeys.has(rawId)) {
      return { messageId: `${pluginPrefix}.${rawId}`, targetBundle: 'self' };
    }

    if (pluginEnKeys.has(jsonKey)) {
      return { messageId: toMessageId(jsonKey, pluginPrefix, adminEnKeys), targetBundle: 'self' };
    }

    if (!pluginPrefix) {
      return { messageId: jsonKey, targetBundle: 'self' };
    }

    if (adminEnKeys.has(jsonKey) || adminEnKeys.has(rawId)) {
      return { messageId: adminEnKeys.has(rawId) ? rawId : jsonKey, targetBundle: 'core/admin' };
    }

    return { messageId: toMessageId(jsonKey, pluginPrefix, adminEnKeys), targetBundle: 'self' };
  }

  const targetBundle = resolveTargetBundle(rawId, pluginPrefix, pluginEnKeys, adminEnKeys);

  if (targetBundle === 'core/admin') {
    return { messageId: adminEnKeys.has(rawId) ? rawId : jsonKey, targetBundle };
  }

  return {
    messageId: toMessageId(jsonKey, pluginPrefix, adminEnKeys),
    targetBundle: 'self',
  };
};
