import { describe, expect, it } from 'vitest';

import usersPermissionsActions from '../users-permissions-actions';

const expectedActions = [
  ['roles.create', 'Create', 'roles'],
  ['roles.read', 'Read', 'roles'],
  ['roles.update', 'Update', 'roles'],
  ['roles.delete', 'Delete', 'roles'],
  ['providers.read', 'Read', 'providers'],
  ['providers.update', 'Edit', 'providers'],
  ['email-templates.read', 'Read', 'emailTemplates'],
  ['email-templates.update', 'Edit', 'emailTemplates'],
  ['advanced-settings.read', 'Read', 'advancedSettings'],
  ['advanced-settings.update', 'Edit', 'advancedSettings'],
] as const;

describe('admin permission actions', () => {
  it('keeps the action registration order', () => {
    expect(usersPermissionsActions.actions.map((action) => action.uid)).toEqual(
      expectedActions.map(([uid]) => uid)
    );
  });

  it.each(expectedActions)(
    'registers %s in its existing category',
    (uid, displayName, subCategory) => {
      const action = usersPermissionsActions.actions.find((entry) => entry.uid === uid);

      expect(action).toMatchObject({
        uid,
        displayName,
        subCategory,
        section: 'plugins',
        pluginName: 'users-permissions',
      });
    }
  );

  it('restricts the content-manager read alias to the role read permission', () => {
    const aliases = usersPermissionsActions.actions.flatMap((action) =>
      action.aliases === undefined ? [] : [{ uid: action.uid, aliases: action.aliases }]
    );

    expect(aliases).toStrictEqual([
      {
        uid: 'roles.read',
        aliases: [
          {
            actionId: 'plugin::content-manager.explorer.read',
            subjects: ['plugin::users-permissions.role'],
          },
        ],
      },
    ]);
  });
});
