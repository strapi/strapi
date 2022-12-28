const getDefaultMessage = (value) => {
  switch (value) {
    case 'entry.create':
      return 'Create entry';
    case 'entry.update':
      return 'Update entry';
    case 'entry.delete':
      return 'Delete entry';
    case 'entry.publish':
      return 'Publish entry';
    case 'entry.unpublish':
      return 'Unpublish entry';
    case 'media.create':
      return 'Create media';
    case 'media.update':
      return 'Update media';
    case 'media.delete':
      return 'Delete media';
    case 'user.create':
      return 'Create user';
    case 'user.update':
      return 'Update user';
    case 'user.delete':
      return 'Delete user';
    case 'admin.auth.success':
      return 'Admin login';
    case 'admin.logout':
      return 'Admin logout';
    case 'content-type.create':
      return 'Create content type';
    case 'content-type.update':
      return 'Update content type';
    case 'content-type.delete':
      return 'Delete content type';
    case 'component.create':
      return 'Create component';
    case 'component.update':
      return 'Update component';
    case 'component.delete':
      return 'Delete component';
    case 'role.create':
      return 'Create role';
    case 'role.delete':
      return 'Delete role';
    case 'role.update':
      return 'Update role';
    case 'permission.create':
      return 'Create permission';
    case 'permission.delete':
      return 'Delete permission';
    case 'permission.update':
      return 'Update permission';
    default:
      return '-';
  }
};

export default getDefaultMessage;
