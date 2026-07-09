import type { ExtractionKind } from './types';

/** Message id namespaces that only exist in core/admin en.json. */
export const ADMIN_MESSAGE_PREFIXES = [
  'app.',
  'global.',
  'notification.',
  'components.',
  'Auth.',
  'tours.',
  'Usecase.',
  'HomePage.',
] as const;

/** Open-ended ids: English comes from defaultMessage, not en.json. */
const SCHEMA_DRIVEN_MESSAGE_ID_PATTERNS: RegExp[] = [
  /^content-manager\.content-types\./,
  /^content-manager\.components\./,
];

const SCHEMA_DRIVEN_JSON_KEY_PATTERNS: RegExp[] = [/\.no-override$/];

const REGISTRY_MESSAGE_IDS: Record<string, string> = {
  'content-manager.popUpwarning.warning.bulk-has-draft-relations.message':
    'Static key wrapped in getTranslation template literal',
  'content-manager.CMEditViewBulkLocale.publish-title': 'Bulk locale modal title ternary',
  'content-manager.CMEditViewBulkLocale.unpublish-title': 'Bulk locale modal title ternary',
};

const FINITE_ENUM_JSON_PREFIXES: Array<{
  prefix: string;
  excludeKeySuffixes?: string[];
}> = [
  { prefix: 'attribute.', excludeKeySuffixes: ['.description'] },
  { prefix: 'relation.' },
  { prefix: 'modalForm.sub-header.chooseAttribute.' },
  { prefix: 'modalForm.sub-header.attribute.' },
  { prefix: 'modalForm.component.header-' },
  { prefix: 'modalForm.singleType.header-' },
  { prefix: 'modalForm.collectionType.header-' },
  { prefix: 'modalForm.header-' },
  { prefix: 'popUpWarning.bodyMessage.' },
  { prefix: 'containers.List.' },
  { prefix: 'containers.list.autoCloneModal.error.' },
  { prefix: 'Homepage.features.' },
  { prefix: 'sort.' },
  { prefix: 'apiError.' },
  { prefix: 'settings.section.' },
  { prefix: 'Settings.permissions.auditLogs.' },
  { prefix: 'Settings.roles.form.permissions.' },
  { prefix: 'components.FilterOptions.FILTER_TYPES.' },
  { prefix: 'global.plugins.' },
  { prefix: 'email.Settings.capabilities.feature.' },
  { prefix: 'CMEditViewBulkLocale.' },
  { prefix: 'form.button.add.field.to.' },
];

export const isAdminMessageId = (messageId: string) =>
  ADMIN_MESSAGE_PREFIXES.some((prefix) => messageId.startsWith(prefix));

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

export const toMessageId = (jsonKey: string, pluginPrefix: string | null): string => {
  if (!pluginPrefix || isAdminMessageId(jsonKey)) {
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
  const jsonKey = toJsonKey(rawId, pluginPrefix);

  if (pluginPrefix && pluginEnKeys.has(jsonKey)) {
    return 'self';
  }

  if (adminEnKeys.has(rawId) || adminEnKeys.has(jsonKey)) {
    return 'core/admin';
  }

  if (isAdminMessageId(rawId) || isAdminMessageId(jsonKey)) {
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

  const registryNote = REGISTRY_MESSAGE_IDS[messageIdPattern];

  if (registryNote) {
    return { kind: 'registry', note: registryNote };
  }

  if (
    SCHEMA_DRIVEN_MESSAGE_ID_PATTERNS.some((pattern) => pattern.test(messageIdPattern)) ||
    SCHEMA_DRIVEN_JSON_KEY_PATTERNS.some((pattern) => pattern.test(jsonKeyPattern))
  ) {
    return { kind: 'schema-driven', note: 'User/schema-defined translation id' };
  }

  if (jsonKeyPattern.includes('${') || messageIdPattern.includes('${')) {
    return { kind: 'finite-enum', note: 'Template literal — expand from en.json prefix' };
  }

  return { kind: 'static' };
};

export const expandTemplateToJsonKeys = (
  template: string,
  enKeys: string[],
  pluginPrefix: string | null
): string[] => {
  const jsonTemplate = toJsonKey(template, pluginPrefix);

  if (isAdminMessageId(jsonTemplate)) {
    return [];
  }

  if (!jsonTemplate.includes('${')) {
    return [jsonTemplate];
  }

  const staticPrefix = jsonTemplate.split(/\$\{[^}]+\}/)[0] ?? '';

  for (const { prefix, excludeKeySuffixes = [] } of FINITE_ENUM_JSON_PREFIXES) {
    if (!staticPrefix.startsWith(prefix) && staticPrefix !== prefix) {
      continue;
    }

    const matches = enKeys.filter((key) => {
      if (!key.startsWith(prefix)) {
        return false;
      }

      return !excludeKeySuffixes.some((suffix) => key.endsWith(suffix));
    });

    if (matches.length > 0) {
      return matches;
    }
  }

  if (staticPrefix) {
    const fallback = enKeys.filter((key) => key.startsWith(staticPrefix));

    if (fallback.length > 0) {
      return fallback;
    }
  }

  return [];
};

export const expandRegistryMessageIds = (messageId: string): string[] => {
  if (messageId.includes('|')) {
    return messageId.split('|');
  }

  return [messageId];
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
    if (pluginEnKeys.has(jsonKey)) {
      return { messageId: toMessageId(jsonKey, pluginPrefix), targetBundle: 'self' };
    }

    if (adminEnKeys.has(jsonKey)) {
      return { messageId: jsonKey, targetBundle: 'core/admin' };
    }

    return { messageId: toMessageId(jsonKey, pluginPrefix), targetBundle: 'self' };
  }

  const targetBundle = resolveTargetBundle(rawId, pluginPrefix, pluginEnKeys, adminEnKeys);

  if (targetBundle === 'core/admin') {
    return { messageId: adminEnKeys.has(rawId) ? rawId : jsonKey, targetBundle };
  }

  return {
    messageId: toMessageId(jsonKey, pluginPrefix),
    targetBundle: 'self',
  };
};
