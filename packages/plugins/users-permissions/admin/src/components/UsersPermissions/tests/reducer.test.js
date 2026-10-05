import { produce } from 'immer';
import { describe, it, expect, beforeEach } from 'vitest';

import reducer from '../reducer';

describe('USERS PERMISSIONS | COMPONENTS | UsersPermissions | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      initialData: {},
      modifiedData: {},
      routes: {},
      selectedAction: '',
      policies: [],
    };
  });

  describe('DEFAULT_ACTION', () => {
    it('should return the state', () => {
      const expected = state;

      expect(reducer(state, {})).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should change the modified data correctly if the input is not a checkbox', () => {
      state.modifiedData = {
        find: { enabled: true, policy: '' },
        findOne: { enabled: false, policy: '' },
      };

      const action = {
        type: 'ON_CHANGE',
        keys: ['find', 'policy'],
        value: 'custom',
      };

      const expected = produce(state, (draft) => {
        draft.modifiedData.find.policy = 'custom';
      });

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should change the modified data correctly and the selectedAction if the input is a checkbox', () => {
      state.modifiedData = {
        find: { enabled: true, policy: '' },
        findOne: { enabled: false, policy: '' },
      };

      const action = {
        type: 'ON_CHANGE',
        keys: ['findOne', 'enabled'],
        value: true,
      };

      const expected = produce(state, (draft) => {
        draft.modifiedData.findOne.enabled = true;
        draft.selectedAction = 'findOne';
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_SELECT_ALL', () => {
    it('should set all the enabled keys to true', () => {
      state.modifiedData = {
        app: {
          find: { enabled: true, policy: '' },
          findOne: { enabled: false, policy: '' },
          delete: { enabled: false, policy: '' },
        },
        app2: {
          find: { enabled: false, policy: '' },
          findOne: { enabled: false, policy: '' },
        },
      };

      const action = {
        type: 'ON_CHANGE_SELECT_ALL',
        keys: ['app'],
        value: true,
      };

      const expected = produce(state, (draft) => {
        draft.modifiedData.app = {
          find: { enabled: true, policy: '' },
          findOne: { enabled: true, policy: '' },
          delete: { enabled: true, policy: '' },
        };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_RESET', () => {
    it('should set the modifiedData with the initialData', () => {
      state.initialData = { ok: true };
      state.modifiedData = { ok: false };

      const action = { type: 'ON_RESET' };

      const expected = produce(state, (draft) => {
        draft.modifiedData = { ok: true };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_SUCCEEDED', () => {
    it('should set the initialData with the modifiedData', () => {
      state.initialData = { ok: true };
      state.modifiedData = { ok: false };

      const action = { type: 'ON_SUBMIT_SUCCEEDED' };

      const expected = produce(state, (draft) => {
        draft.initialData = { ok: false };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SELECT_ACTION', () => {
    it('should set the selectedAction correctly', () => {
      state.selectedAction = 'find';

      const action = { type: 'SELECT_ACTION', actionToSelect: 'findOne' };

      const expected = produce(state, (draft) => {
        draft.selectedAction = 'findOne';
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});

describe('permission changes preserve unrelated selection and policy state', () => {
  const permissions = {
    'api::article': {
      controllers: {
        article: {
          find: { enabled: true, policy: 'global::owner' },
          findOne: { enabled: true, policy: '' },
        },
      },
    },
  };
  const state = {
    initialData: permissions,
    modifiedData: permissions,
    routes: {},
    policies: [],
    selectedAction: 'api::article.controllers.article.find',
  };

  it('deselects an already selected action', () => {
    expect(
      reducer(state, { type: 'SELECT_ACTION', actionToSelect: state.selectedAction }).selectedAction
    ).toBe('');
  });

  it('keeps route details selected when disabling an action', () => {
    const next = reducer(state, {
      type: 'ON_CHANGE',
      keys: ['api::article', 'controllers', 'article', 'find', 'enabled'],
      value: false,
    });
    expect(next.selectedAction).toBe(state.selectedAction);
    expect(next.modifiedData['api::article'].controllers.article.find).toEqual({
      enabled: false,
      policy: 'global::owner',
    });
    expect(state.modifiedData['api::article'].controllers.article.find.enabled).toBe(true);
  });

  it('can disable every action without losing configured policies', () => {
    const next = reducer(state, {
      type: 'ON_CHANGE_SELECT_ALL',
      keys: ['api::article', 'controllers', 'article'],
      value: false,
    });
    expect(next.modifiedData['api::article'].controllers.article).toEqual({
      find: { enabled: false, policy: 'global::owner' },
      findOne: { enabled: false, policy: '' },
    });
    expect(next.selectedAction).toBe(state.selectedAction);
  });
});
