import { fromJS } from 'immutable';

const initialState = fromJS({
  webhooks: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('webhooks', () => fromJS(action.data));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
