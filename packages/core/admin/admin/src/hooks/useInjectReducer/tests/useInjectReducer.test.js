import React from 'react';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';

import configureStore from '../../../core/store/configureStore';
import { useInjectReducer } from '..';

const store = configureStore([], [(state = {}) => state]);

// eslint-disable-next-line no-unused-vars, react/prop-types
const ComponentFixture = ({ children }) => <Provider store={store}>{children}</Provider>;

function setup(...args) {
  return renderHook(() => useInjectReducer(...args), { wrapper: ComponentFixture });
}

function reducerFixture(state = {}, action) {
  switch (action.type) {
    case 'namespaced_action':
      return {
        ...state,
        namespacedAction: true,
      };

    default:
      return state;
  }
}

describe('useInjectReducer', () => {
  test('injects a new reducer into the global redux store', () => {
    setup('namespace', reducerFixture);

    expect(store.getState().namespace).toStrictEqual({});

    store.dispatch({ type: 'namespaced_action' });

    expect(store.getState().namespace).toStrictEqual({ namespacedAction: true });
  });
});
