import type { Modules, UID } from '@strapi/types';
import { getService } from '../../utils';

type WillRegisterPermissionContext = {
  readonly permission: Modules.Permissions.PermissionRule & {
    properties?: { locales?: string[] | null };
  };
  condition: { and(rawConditionObject: unknown): unknown };
};

/**
 * The engine subject is a CASL subject: a string, a record, or null.
 * Only a string can be a content-type UID, and `strapi.contentType()` is typed to take one.
 * The registry is a plain object, so an inherited key such as `constructor` also passes;
 * it is not localized, so the handler still ignores it.
 */
const isContentTypeUID = (subject: unknown): subject is UID.ContentType => {
  return typeof subject === 'string' && strapi.get('content-types').get(subject) !== undefined;
};

/**
 * Locales property handler for the permission engine
 * Add the has-locale-access condition if the locales property is defined
 */
const willRegisterPermission = (context: WillRegisterPermissionContext) => {
  const { permission, condition } = context;
  const { subject, properties } = permission;

  const { locales } = properties || {};
  const { isLocalizedContentType } = getService('content-types');

  // If the subject isn't a content type (none, a record, or another string), ignore the permission
  if (isContentTypeUID(subject) === false) {
    return;
  }

  const ct = strapi.contentType(subject);

  // If the subject exists but isn't localized, ignore the permission
  if (!isLocalizedContentType(ct)) {
    return;
  }

  // If the subject is localized but the locales property is null (access to all locales), ignore the permission
  if (locales === null) {
    return;
  }

  condition.and({
    locale: {
      $in: locales || [],
    },
  });
};

const registerI18nPermissionsHandlers = () => {
  const { engine } = strapi.service('admin::permission');

  engine.hooks['before-register.permission'].register(willRegisterPermission);
};

export default {
  willRegisterPermission,
  registerI18nPermissionsHandlers,
};
