export const actionTypes = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
  'media.create',
  'media.update',
  'media.delete',
  'media-folder.create',
  'media-folder.update',
  'media-folder.delete',
  'user.create',
  'user.update',
  'user.delete',
  'admin.auth.success',
  'admin.logout',
  'content-type.create',
  'content-type.update',
  'content-type.delete',
  'component.create',
  'component.update',
  'component.delete',
  'role.create',
  'role.update',
  'role.delete',
  'permission.create',
  'permission.update',
  'permission.delete',
];

const defaultMessages = actionTypes.reduce((acc, curr) => {
  const actionName = curr.split('.').shift();
  const cudSelectString = `{action, select, create {Create} update {Update} delete {Delete} other {}}`;

  if (acc[actionName]) return acc;

  switch (actionName) {
    case 'entry':
      acc[
        actionName
      ] = `{action, select, create {Create} update {Update} delete {Delete} publish {Publish} unpublish {Unpublish} other {}} entry {model, select, undefined {} other {({model})}}`;
      break;
    case 'content-type':
      acc[
        actionName
      ] = `{action, select, create {Create} update {Update} delete {Delete} other {}} content type {model, select, undefined {} other {({model})}}`;
      break;
    case 'media-folder':
      acc[actionName] = `${cudSelectString} media folder`;
      break;
    case 'admin':
      acc[actionName] = `Admin {action, select, auth.success {login} logout {logout} other {}}`;
      break;
    default:
      acc[actionName] = `${cudSelectString} ${actionName}`;
      break;
  }

  return acc;
}, {});

export const getDefaultMessage = (value) => {
  return defaultMessages[value] || value;
};
