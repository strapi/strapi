const actionTypes = {
  ENTRY_CREATE: 'entry.create',
  ENTRY_UPDATE: 'entry.update',
  ENTRY_DELETE: 'entry.delete',
  ENTRY_PUBLISH: 'entry.publish',
  ENTRY_UNPUBLISH: 'entry.unpublish',
  MEDIA_CREATE: 'media.create',
  MEDIA_UPDATE: 'media.update',
  MEDIA_DELETE: 'media.delete',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  ADMIN_LOGIN: 'admin.auth.success',
  ADMIN_LOGOUT: 'admin.logout',
  CONTENT_TYPE_CREATE: 'content-type.create',
  CONTENT_TYPE_UPDATE: 'content-type.update',
  CONTENT_TYPE_DELETE: 'content-type.delete',
  COMPONENT_CREATE: 'component.create',
  COMPONENT_UPDATE: 'component.update',
  COMPONENT_DELETE: 'component.delete',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  PERMISSION_CREATE: 'permission.create',
  PERMISSION_UPDATE: 'permission.update',
  PERMISSION_DELETE: 'permission.delete',
};

const getDefaultMessage = (value) => {
  switch (value) {
    case actionTypes.ENTRY_CREATE:
      return 'Create entry';
    case actionTypes.ENTRY_UPDATE:
      return 'Update entry';
    case actionTypes.ENTRY_DELETE:
      return 'Delete entry';
    case actionTypes.ENTRY_PUBLISH:
      return 'Publish entry';
    case actionTypes.ENTRY_UNPUBLISH:
      return 'Unpublish entry';
    case actionTypes.MEDIA_CREATE:
      return 'Create media';
    case actionTypes.MEDIA_UPDATE:
      return 'Update media';
    case actionTypes.MEDIA_DELETE:
      return 'Delete media';
    case actionTypes.USER_CREATE:
      return 'Create user';
    case actionTypes.USER_UPDATE:
      return 'Update user';
    case actionTypes.USER_DELETE:
      return 'Delete user';
    case actionTypes.ADMIN_LOGIN:
      return 'Admin login';
    case actionTypes.ADMIN_LOGOUT:
      return 'Admin logout';
    case actionTypes.CONTENT_TYPE_CREATE:
      return 'Create content type';
    case actionTypes.CONTENT_TYPE_UPDATE:
      return 'Update content type';
    case actionTypes.CONTENT_TYPE_DELETE:
      return 'Delete content type';
    case actionTypes.COMPONENT_CREATE:
      return 'Create component';
    case actionTypes.COMPONENT_UPDATE:
      return 'Update component';
    case actionTypes.COMPONENT_DELETE:
      return 'Delete component';
    case actionTypes.ROLE_CREATE:
      return 'Create role';
    case actionTypes.ROLE_UPDATE:
      return 'Update role';
    case actionTypes.ROLE_DELETE:
      return 'Delete role';
    case actionTypes.PERMISSION_CREATE:
      return 'Create permission';
    case actionTypes.PERMISSION_UPDATE:
      return 'Update permission';
    case actionTypes.PERMISSION_DELETE:
      return 'Delete permission';
    default:
      return value;
  }
};

export default getDefaultMessage;
