export const actionTypes = {
  'entry.create': 'Create entry{model, select, undefined {} other { ({model})}}',
  'entry.update': 'Update entry{model, select, undefined {} other { ({model})}}',
  'entry.delete': 'Delete entry{model, select, undefined {} other { ({model})}}',
  'entry.publish': 'Publish entry{model, select, undefined {} other { ({model})}}',
  'entry.unpublish': 'Unpublish entry{model, select, undefined {} other { ({model})}}',
  'media.create': 'Create media',
  'media.update': 'Update media',
  'media.delete': 'Delete media',
  'media-folder.create': 'Create media folder',
  'media-folder.update': 'Update media folder',
  'media-folder.delete': 'Delete media folder',
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

export const getDefaultMessage = (value) => {
  return actionTypes[value] || value;
};
