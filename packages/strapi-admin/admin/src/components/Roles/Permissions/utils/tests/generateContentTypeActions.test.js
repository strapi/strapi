import generateContentTypeActions from '../generateContentTypeActions';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getAttributesByModel', () => {
  it('should return all attributes of a contentType with nested attributes', () => {
    const permissionsLayoutActions = {
      sections: {
        contentTypes: [
          { action: 'plugins::content-manager.explorer.delete' },
          { action: 'plugins::content-manager.explorer.publish' },
        ],
      },
    };
    const subjectPermissions = {
      field1: {
        actions: [
          'plugins::content-manager.explorer.create',
          'plugins::content-manager.explorer.read',
        ],
      },
      field2: {
        actions: ['plugins::content-manager.explorer.read'],
      },
      field3: {
        actions: ['plugins::content-manager.explorer.read'],
      },
    };
    const existingContentTypeActions = {
      'plugins::content-manager.explorer.delete': true,
      'plugins::content-manager.explorer.publish': false,
    };

    const expected = {
      'plugins::content-manager.explorer.create': true,
      'plugins::content-manager.explorer.read': true,
      'plugins::content-manager.explorer.delete': true,
    };

    expect(
      generateContentTypeActions(
        subjectPermissions,
        existingContentTypeActions,
        permissionsLayoutActions.sections.contentTypes
      )
    ).toEqual(expected);
  });
});
