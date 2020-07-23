import getRecursivePermissionsBySubject from '../getRecursivePermissionsBySubject';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getRecursivePermissionsBySubject', () => {
  it('should return the number of actions for the content type', () => {
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
      subject2: {
        attributes: {
          'componentName2.video.like': {
            actions: ['read', 'update'],
          },
          'componentName2.video.name': {
            actions: ['create', 'read', 'update'],
          },
          'componentName2.video.time': {
            actions: ['create', 'read', 'update'],
          },
        },
      },
    };
    const actual = getRecursivePermissionsBySubject('subject1', contentTypesPermissions);
    expect(actual).toEqual(16);
  });
});
