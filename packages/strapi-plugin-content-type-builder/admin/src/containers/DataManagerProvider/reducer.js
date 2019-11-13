import { fromJS } from 'immutable';

const initialState = fromJS({
  components: {},
  isLoading: true,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('components', () => fromJS(action.components))
        .update('isLoading', () => false);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
