import { ACTIONS, PLUGIN_ID } from '../../../../shared/constants';
import createPermissionsService, { adminActions } from '../permissions';

describe('the permissions Spaces adds', () => {
  describe('the actions themselves', () => {
    it('are registered with the admin permission system', async () => {
      const registerMany = jest.fn();
      const strapi = {
        service: () => ({ actionProvider: { registerMany } }),
      } as never;

      await createPermissionsService({ strapi }).registerActions();

      expect(registerMany).toHaveBeenCalledWith(adminActions);
    });

    it('all belong to this plugin, so their uids resolve under it', () => {
      for (const action of adminActions) {
        expect(action.pluginName).toBe(PLUGIN_ID);
      }
    });

    it('all appear in Settings, where spaces are administered', () => {
      for (const action of adminActions) {
        expect(action.section).toBe('settings');
      }
    });

    it('are the four the routes ask for, and no others', () => {
      // A route asking for an action nobody can be granted would lock everyone
      // out of it; an action nothing asks for would be dead weight in the UI.
      const registered = adminActions.map((action) => `plugin::${PLUGIN_ID}.${action.uid}`).sort();

      expect(registered).toEqual([...Object.values(ACTIONS)].sort());
    });

    it('each carry a name an administrator can read', () => {
      for (const action of adminActions) {
        expect(action.displayName).toMatch(/\w/);
      }
    });
  });
});
