import configureStore from '../configureStore';

function middlewareFixture(callback) {
  return () =>
    ({ getState }) =>
    (next) =>
    (action) => {
      callback(getState());

      return next(action);
    };
}

function reducer(state = {}, action) {
  switch (action.type) {
    case 'something': {
      return {
        ...state,
        ...action.payload,
      };
    }

    default:
      return state;
  }
}

function asyncReducer(state = {}, action) {
  switch (action.type) {
    case 'async': {
      return {
        ...state,
        async: action.payload,
      };
    }

    default:
      return state;
  }
}

describe('configureStore', () => {
  test('applies middlewares and reducers', () => {
    const spy = jest.fn();

    const store = configureStore([middlewareFixture(spy)], [reducer]);

    store.dispatch({ type: 'something', payload: { redux: true } });
    store.dispatch({ type: 'something', payload: { redux: 1 } });
    store.dispatch({ type: 'something', payload: { redux: 2 } });

    expect(spy).toBeCalledTimes(3);
    expect(spy).toHaveBeenNthCalledWith(1, { 0: {} });
    expect(spy).toHaveBeenNthCalledWith(2, { 0: { redux: true } });
    expect(spy).toHaveBeenNthCalledWith(3, { 0: { redux: 1 } });
  });

  test('adds injectReducer() method', () => {
    const store = configureStore([middlewareFixture(() => {})], [reducer]);

    expect(store.injectReducer).toBeDefined();

    store.injectReducer('asyncReducer', asyncReducer);

    store.dispatch({ type: 'async', payload: true });

    expect(store.getState()).toStrictEqual({ 0: {}, asyncReducer: { async: true } });
  });
});
