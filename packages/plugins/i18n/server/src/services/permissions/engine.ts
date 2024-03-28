import { getService } from '../../utils';

/**
 * @typedef {object} WillRegisterPermissionContext
 * @property {Permission} permission
 * @property {object} user
 * @property {object} condition
 */

/**
 * Locales property handler for the permission engine
 * Add the has-locale-access condition if the locales property is defined
 * @param {WillRegisterPermissionContext} context
 */
const willRegisterPermission = (context: any) => {
  const { permission, condition, user } = context;
  const { subject, properties } = permission;

  const isSuperAdmin = strapi.service('admin::role').hasSuperAdminRole(user);

  if (isSuperAdmin) {
    return;
  }

  const { locales } = properties || {};
  const { isLocalizedContentType } = getService('content-types');

  // If there is no subject defined, ignore the permission
  if (!subject) {
    return;
  }

  const ct = strapi.contentTypes[subject];

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
