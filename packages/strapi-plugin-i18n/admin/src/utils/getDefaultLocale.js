const hasLocalePermission = (permission, localeCode) => {
  if (permission) {
    const hasPermission = permission.properties.locales.includes(localeCode);

    if (hasPermission) {
      return true;
    }
  }

  return false;
};

const hasPermissionForLocale = (readPermission, createPermission, localeCode) => {
  if (hasLocalePermission(readPermission, localeCode)) {
    return true;
  }

  if (hasLocalePermission(createPermission, localeCode)) {
    return true;
  }

  return false;
};

const getFirstLocale = permission => {
  if (permission) {
    const firstAuthorizedForReadNonDefaultLocale = permission.properties.locales[0];

    if (firstAuthorizedForReadNonDefaultLocale) {
      return firstAuthorizedForReadNonDefaultLocale;
    }
  }

  return null;
};

/**
 * Entry point of the module
 */
const getDefaultLocale = (contentType, userPermissions, locales = []) => {
  const locale = locales.find(locale => locale.isDefault);
  const ctPermissions = userPermissions.filter(permission => permission.subject === contentType);

  const readPermission = ctPermissions.find(permission => permission.action.includes('.read'));
  const createPermission = ctPermissions.find(permission => permission.action.includes('.create'));

  if (locale && hasPermissionForLocale(readPermission, createPermission, locale.code)) {
    return locale.code;
  }

  const firstAuthorizedForReadNonDefaultLocale = getFirstLocale(readPermission);

  if (firstAuthorizedForReadNonDefaultLocale) {
    return firstAuthorizedForReadNonDefaultLocale;
  }

  return getFirstLocale(createPermission);
};

export default getDefaultLocale;
