'use strict';

const { getService } = require('../../utils');

/**
 * Locales property handler for the permission engine
 * Add the has-locale-access condition if the locales property is defined
 * @param {Permission} permission
 * @param {function(string)} addCondition
 */
const willEvaluatePermissionHandler = ({ permission, addCondition }) => {
  const { subject, properties } = permission;
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

  addCondition('plugins::i18n.has-locale-access');
};

const registerI18nPermissionsHandlers = () => {
  const { engine } = strapi.admin.services.permission;

  engine.hooks.willEvaluatePermission.register(willEvaluatePermissionHandler);
};

module.exports = {
  willEvaluatePermissionHandler,
  registerI18nPermissionsHandlers,
};
