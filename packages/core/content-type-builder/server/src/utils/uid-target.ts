import type { Core } from '@strapi/types';

import { VALID_UID_TARGETS } from '../services/constants';

type AttributeLike = { type?: unknown; customField?: unknown };

/**
 * The type an attribute is stored as. The admin sends custom fields as
 * `type: 'customField'`; they are resolved through the registry to their
 * underlying type. Returns `undefined` for an unknown custom field (plugin
 * removed, bad name).
 */
export const resolveStorageType = (attribute: AttributeLike): string | undefined => {
  if (attribute.type !== 'customField' && typeof attribute.customField !== 'string') {
    return typeof attribute.type === 'string' ? attribute.type : undefined;
  }

  if (typeof attribute.customField !== 'string') {
    return undefined;
  }

  try {
    const customFields: Core.CustomFieldsRegistry = strapi.get('custom-fields');
    const customField = customFields.get(attribute.customField);
    return customField?.type;
  } catch {
    return undefined;
  }
};

/**
 * Whether a uid can be attached to this attribute: a string or text field,
 * including a custom field stored as one.
 */
export const isValidUidTarget = (attribute: AttributeLike): boolean => {
  const type = resolveStorageType(attribute);
  const validUidTargets: readonly string[] = VALID_UID_TARGETS;

  return type !== undefined && validUidTargets.includes(type);
};
