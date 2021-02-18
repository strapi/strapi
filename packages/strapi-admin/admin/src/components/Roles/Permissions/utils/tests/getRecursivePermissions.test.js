import getRecursivePermissions from '../getRecursivePermissions';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getRecursivePermissions', () => {
  it('should return all actions count of the component', () => {
    const subject = 'subject1';
    const attributeName = 'componentAttribute';
    const contentTypesPermissions = {
      subject1: {
        attributes: {
          'componentAttribute.name': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.description': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.start_date': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.end_date': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.picture': {
            actions: ['create', 'edit', 'update'],
          },
          componentAttribute2: {
            actions: ['create', 'edit', 'update'],
          },
        },
      },
    };

    const recursivePermissions = getRecursivePermissions(
      subject,
      attributeName,
      contentTypesPermissions
    );

    expect(recursivePermissions).toEqual(15);
  });
  it('should return all actions count of the component without the parent attributes actions', () => {
    const subject = 'subject1';
    const attributeName = 'componentAttribute.video';
    const contentTypesPermissions = {
      subject1: {
        attributes: {
          'componentAttribute.name': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.description': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.start_date': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.end_date': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.picture': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.video.name': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.video.description': {
            actions: ['create', 'edit', 'update'],
          },
          'componentAttribute.video.time': {
            actions: ['create', 'edit', 'update'],
          },
        },
      },
    };

    const recursivePermissions = getRecursivePermissions(
      subject,
      attributeName,
      contentTypesPermissions
    );

    expect(recursivePermissions).toEqual(9);
  });
});
