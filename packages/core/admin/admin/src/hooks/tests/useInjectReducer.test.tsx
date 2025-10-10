/* eslint-disable check-file/filename-naming-convention */
/**
 * Because we need to access the store, we use the direct implementation of renderHook
 * and not the one from test utils
 */
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';

import { configureStore } from '../../core/store/configure';
import { useInjectReducer } from '../useInjectReducer';

const store = configureStore();

function reducerFixture(state = {}, action: { type: 'namespaced_action' }) {
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
    renderHook(() => useInjectReducer('namespace', reducerFixture), {
      wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      },
    });

    // @ts-expect-error - we dynamically add reducers which makes the types uncomfortable.
    expect(store.getState().namespace).toStrictEqual({});

    store.dispatch({ type: 'namespaced_action' });

    // @ts-expect-error - we dynamically add reducers which makes the types uncomfortable.
    expect(store.getState().namespace).toStrictEqual({ namespacedAction: true });
  });
});
