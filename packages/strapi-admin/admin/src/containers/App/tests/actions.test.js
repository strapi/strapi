import {
  FREEZE_APP,
  GET_DATA_SUCCEEDED,
  GET_INFOS_DATA_SUCCEEDED,
  LOAD_PLUGIN,
  PLUGIN_DELETED,
  PLUGIN_LOADED,
  UNFREEZE_APP,
  UPDATE_PLUGIN,
} from '../constants';
import {
  freezeApp,
  loadPlugin,
  getInfosDataSucceeded,
  getDataSucceeded,
  pluginDeleted,
  pluginLoaded,
  unfreezeApp,
  updatePlugin,
} from '../actions';

describe('<App /> actions', () => {
  describe('freezeApp', () => {
    it('should return the correct type and the passed data', () => {
      const data = { strapi: 'isCool' };
      const expected = {
        type: FREEZE_APP,
        data,
      };

      expect(freezeApp(data)).toEqual(expected);
    });
  });

  describe('unfreezeApp', () => {
    it('should return the correct type', () => {
      const expected = {
        type: UNFREEZE_APP,
      };

      expect(unfreezeApp()).toEqual(expected);
    });
  });

  describe('getDataSucceeded', () => {
    it('shoudl return the correct type and the passed data', () => {
      const data = { ok: true };
      const expected = {
        type: GET_DATA_SUCCEEDED,
        data,
      };

      expect(getDataSucceeded(data)).toEqual(expected);
    });
  });

  describe('getInfosDataSucceeded', () => {
    it('shoudl return the correct type and the passed data', () => {
      const data = { ok: true };
      const expected = {
        type: GET_INFOS_DATA_SUCCEEDED,
        data,
      };

      expect(getInfosDataSucceeded(data)).toEqual(expected);
    });
  });

  describe('loadPlugin', () => {
    it('should return the correct type and the passed data', () => {
      const plugin = {
        id: 'content-manager',
        description: 'Manage your content',
      };
      const expected = {
        type: LOAD_PLUGIN,
        plugin,
      };

      expect(loadPlugin(plugin)).toEqual(expected);
    });
  });

  describe('pluginLoaded', () => {
    it('should return the correct type and the passed data', () => {
      const plugin = {
        id: 'content-manager',
        description: 'Manage your content',
      };
      const expected = {
        type: PLUGIN_LOADED,
        plugin,
      };

      expect(pluginLoaded(plugin)).toEqual(expected);
    });
  });

  describe('pluginDeleted', () => {
    it('should return the correct type and the passed data', () => {
      const plugin = 'content-manager';
      const expected = {
        type: PLUGIN_DELETED,
        plugin,
      };

      expect(pluginDeleted(plugin)).toEqual(expected);
    });
  });

  describe('updatePlugin', () => {
    it('should return the correct type and the passed data', () => {
      const pluginId = 'content-manager';
      const updatedKey = 'isReady';
      const updatedValue = true;
      const expected = {
        type: UPDATE_PLUGIN,
        pluginId,
        updatedKey,
        updatedValue,
      };

      expect(updatePlugin(pluginId, updatedKey, updatedValue)).toEqual(expected);
    });
  });
});
