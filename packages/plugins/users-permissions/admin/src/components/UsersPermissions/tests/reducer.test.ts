import { describe, it, expect } from 'vitest';

import { reducer, type State } from '../reducer';

const makeState = (): State => {
  const permissions = {
    'api::article': {
      controllers: {
        article: {
          find: { enabled: true, policy: 'global::owner' },
          findOne: { enabled: false, policy: '' },
        },
      },
    },
  };
  return {
    initialData: permissions,
    modifiedData: permissions,
    routes: {},
    policies: [],
    selectedAction: 'api::article.controllers.article.find',
  };
};
const path = ['api::article', 'controllers', 'article'];

describe('permission editor reducer', () => {
  it('preserves state for unknown actions', () => {
    const state = makeState();
    // @ts-expect-error Exercise an unknown action at runtime.
    expect(reducer(state, {})).toBe(state);
  });
  it('changes a policy without changing the selected action', () => {
    const state = makeState();
    const next = reducer(state, {
      type: 'ON_CHANGE',
      keys: [...path, 'find', 'policy'],
      value: 'global::custom',
    });
    expect(next.modifiedData['api::article'].controllers.article.find.policy).toBe(
      'global::custom'
    );
    expect(next.selectedAction).toBe(state.selectedAction);
  });
  it('selects the bound route when enabling an action', () => {
    const next = reducer(makeState(), {
      type: 'ON_CHANGE',
      keys: [...path, 'findOne', 'enabled'],
      value: true,
    });
    expect(next.modifiedData['api::article'].controllers.article.findOne.enabled).toBe(true);
    expect(next.selectedAction).toBe(`${path.join('.')}.findOne`);
  });
  it('enables all actions while retaining configured policies', () => {
    const next = reducer(makeState(), { type: 'ON_CHANGE_SELECT_ALL', keys: path, value: true });
    expect(next.modifiedData['api::article'].controllers.article).toEqual({
      find: { enabled: true, policy: 'global::owner' },
      findOne: { enabled: true, policy: '' },
    });
  });
  it('resets changes to the last saved permissions', () => {
    const state = makeState();
    const next = reducer(state, {
      type: 'ON_CHANGE',
      keys: [...path, 'find', 'enabled'],
      value: false,
    });
    expect(reducer(next, { type: 'ON_RESET' }).modifiedData).toEqual(state.initialData);
  });
  it('stores saved changes as the next reset value', () => {
    const next = reducer(makeState(), {
      type: 'ON_CHANGE',
      keys: [...path, 'findOne', 'enabled'],
      value: true,
    });
    expect(reducer(next, { type: 'ON_SUBMIT_SUCCEEDED' }).initialData).toEqual(next.modifiedData);
  });
  it('selects another action', () => {
    const next = reducer(makeState(), {
      type: 'SELECT_ACTION',
      actionToSelect: `${path.join('.')}.findOne`,
    });
    expect(next.selectedAction).toBe(`${path.join('.')}.findOne`);
  });
  it('deselects an already selected action', () => {
    const state = makeState();
    expect(
      reducer(state, { type: 'SELECT_ACTION', actionToSelect: state.selectedAction }).selectedAction
    ).toBe('');
  });
  it('keeps route details selected when disabling an action', () => {
    const state = makeState();
    const next = reducer(state, {
      type: 'ON_CHANGE',
      keys: [...path, 'find', 'enabled'],
      value: false,
    });
    expect(next.selectedAction).toBe(state.selectedAction);
    expect(next.modifiedData['api::article'].controllers.article.find).toEqual({
      enabled: false,
      policy: 'global::owner',
    });
    expect(state.modifiedData['api::article'].controllers.article.find.enabled).toBe(true);
  });
  it('disables all actions while retaining configured policies', () => {
    const state = makeState();
    const next = reducer(state, { type: 'ON_CHANGE_SELECT_ALL', keys: path, value: false });
    expect(next.modifiedData['api::article'].controllers.article).toEqual({
      find: { enabled: false, policy: 'global::owner' },
      findOne: { enabled: false, policy: '' },
    });
    expect(next.selectedAction).toBe(state.selectedAction);
  });
});
