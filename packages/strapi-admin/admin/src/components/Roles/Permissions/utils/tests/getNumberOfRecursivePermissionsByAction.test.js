import getNumberOfRecursivePermissionsByAction from '../getNumberOfRecursivePermissionsByAction';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getNumberOfRecursivePermissionsByAction', () => {
  it('should return the number of attributes with the action in the component', () => {
    const contentTypesPermissions = {
      subject1: {
        attributes: {
          'componentName1.name': {
            actions: ['read', 'update'],
          },
          'componentName1.description': {
            actions: ['create', 'read', 'update'],
          },
          'componentName1.image': {
            actions: ['create', 'read', 'update'],
          },
          'componentName1.video.like': {
            actions: ['read', 'update'],
          },
          'componentName1.video.name': {
            actions: ['create', 'read', 'update'],
          },
          'componentName1.video.time': {
            actions: ['create', 'read', 'update'],
          },
        },
      },
    };
    const actual = getNumberOfRecursivePermissionsByAction(
      'subject1',
      'create',
      'componentName1',
      contentTypesPermissions
    );
    expect(actual).toEqual(4);
  });
});
