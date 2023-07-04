import get from 'lodash/get';

const hasLocalePermission = (permissions, localeCode) => {
  if (permissions) {
    const hasPermission = permissions.some((permission) =>
      get(permission, 'properties.locales', []).includes(localeCode)
    );

    if (hasPermission) {
      return true;
    }
  }

  return false;
};

const getReadPermissions = (ctPermissions) =>
  ctPermissions['plugin::content-manager.explorer.read'];
const getCreatePermissions = (ctPermissions) =>
  ctPermissions['plugin::content-manager.explorer.create'];

const canUseLocale = (ctPermissions, locale) => {
  const readPermissions = getReadPermissions(ctPermissions);
  const createPermissions = getCreatePermissions(ctPermissions);

  if (hasLocalePermission(readPermissions, locale.code)) {
    return true;
  }

  if (hasLocalePermission(createPermissions, locale.code)) {
    return true;
  }

  return false;
};

const getFirstLocale = (permissions) => {
  if (permissions && permissions.length > 0) {
    const firstAuthorizedNonDefaultLocale = get(permissions, [0, 'properties', 'locales', 0], null);

    if (firstAuthorizedNonDefaultLocale) {
      return firstAuthorizedNonDefaultLocale;
    }
  }

  return null;
};

/**
 * Entry point of the module
 */
const getPreferredOrDefaultLocale = (preferredLocale, ctPermissions, locales = []) => {
  if (preferredLocale && canUseLocale(ctPermissions, preferredLocale)) {
    return preferredLocale.code;
  }

  const defaultLocale = locales.find((locale) => locale.isDefault);

  if (!defaultLocale) {
    return null;
  }

  if (canUseLocale(ctPermissions, defaultLocale)) {
    return defaultLocale.code;
  }

  const readPermissions = getReadPermissions(ctPermissions);
  const createPermissions = getCreatePermissions(ctPermissions);

  // When the default locale is not authorized, we return the first authorized locale
  const firstAuthorizedForReadNonDefaultLocale = getFirstLocale(readPermissions);

  if (firstAuthorizedForReadNonDefaultLocale) {
    return firstAuthorizedForReadNonDefaultLocale;
  }

  return getFirstLocale(createPermissions);
};

export default getPreferredOrDefaultLocale;
