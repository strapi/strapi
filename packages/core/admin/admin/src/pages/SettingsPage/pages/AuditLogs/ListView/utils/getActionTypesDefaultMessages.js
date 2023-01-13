const actionTypes = {
  'entry.create': 'Create entry ({model})',
  'entry.update': 'Update entry ({model})',
  'entry.delete': 'Delete entry ({model})',
  'entry.publish': 'Publish entry ({model})',
  'entry.unpublish': 'Unpublish entry ({model})',
  'media.create': 'Create media',
  'media.update': 'Update media',
  'media.delete': 'Delete media',
  'user.create': 'Create user',
  'user.update': 'Update user',
  'user.delete': 'Delete user',
  'admin.auth.success': 'Admin login',
  'admin.logout': 'Admin logout',
  'content-type.create': 'Create content type',
  'content-type.update': 'Update content type',
  'content-type.delete': 'Delete content type',
  'component.create': 'Create component',
  'component.update': 'Update component',
  'component.delete': 'Delete component',
  'role.create': 'Create role',
  'role.update': 'Update role',
  'role.delete': 'Delete role',
  'permission.create': 'Create permission',
  'permission.update': 'Update permission',
  'permission.delete': 'Delete permission',
};

const getDefaultMessage = (value) => {
  return actionTypes[value] || value;
};

export default getDefaultMessage;
