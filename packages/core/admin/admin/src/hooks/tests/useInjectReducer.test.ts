import { renderHook } from '@tests/utils';

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
    renderHook(() => useInjectReducer('namespace', reducerFixture));

    // @ts-expect-error - we dynamically add reducers which makes the types uncomfortable.
    expect(store.getState().namespace).toStrictEqual({});

    store.dispatch({ type: 'namespaced_action' });

    // @ts-expect-error - we dynamically add reducers which makes the types uncomfortable.
    expect(store.getState().namespace).toStrictEqual({ namespacedAction: true });
  });
});
