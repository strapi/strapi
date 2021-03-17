const hasLocalePermission = (permission, localeCode) => {
  if (permission) {
    const hasPermission = permission.properties.locales.includes(localeCode);

    if (hasPermission) {
      return true;
    }
  }

  return false;
};

const getFirstLocale = permission => {
  if (permission) {
    const firstAuthorizedNonDefaultLocale = permission.properties.locales[0];

    if (firstAuthorizedNonDefaultLocale) {
      return firstAuthorizedNonDefaultLocale;
    }
  }

  return null;
};

/**
 * Entry point of the module
 */
const getDefaultLocale = (contentType, userPermissions, locales = []) => {
  const defaultLocale = locales.find(locale => locale.isDefault);

  if (!defaultLocale) {
    return null;
  }

  const ctPermissions = userPermissions.filter(permission => permission.subject === contentType);

  const readPermission = ctPermissions.find(permission => permission.action.includes('.read'));
  const createPermission = ctPermissions.find(permission => permission.action.includes('.create'));

  if (hasLocalePermission(readPermission, defaultLocale.code)) {
    return defaultLocale.code;
  }

  if (hasLocalePermission(createPermission, defaultLocale.code)) {
    return defaultLocale.code;
  }

  // When the default locale is not authorized, we return the first authorized locale
  const firstAuthorizedForReadNonDefaultLocale = getFirstLocale(readPermission);

  if (firstAuthorizedForReadNonDefaultLocale) {
    return firstAuthorizedForReadNonDefaultLocale;
  }

  return getFirstLocale(createPermission);
};

export default getDefaultLocale;
