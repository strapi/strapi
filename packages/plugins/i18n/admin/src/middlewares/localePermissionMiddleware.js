import get from 'lodash/get';

const filterPermissionWithLocale = (locale) => (permission) =>
  get(permission, 'properties.locales', []).indexOf(locale) !== -1;

const localePermissionMiddleware = () => () => (next) => (action) => {
  if (action.type !== 'ContentManager/RBACManager/SET_PERMISSIONS') {
    return next(action);
  }

  const containerName = get(action, '__meta__.containerName', null);

  if (!['editView', 'listView'].includes(containerName)) {
    return next(action);
  }

  const locale = get(action, '__meta__.plugins.i18n.locale', null);

  if (!locale) {
    return next(action);
  }

  const permissions = action.permissions;

  const nextPermissions = Object.keys(permissions).reduce((acc, key) => {
    const currentPermission = permissions[key];
    const filteredPermissions = currentPermission.filter(filterPermissionWithLocale(locale));

    if (filteredPermissions.length) {
      acc[key] = filteredPermissions;
    }

    return acc;
  }, {});

  return next({ ...action, permissions: nextPermissions });
};

export default localePermissionMiddleware;
